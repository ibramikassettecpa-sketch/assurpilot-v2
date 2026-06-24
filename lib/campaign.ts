// Campaign runner — advances a campaign by launching the next batch of calls

import { prisma } from './prisma'
import { voiceProvider } from './providers/voice'

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export interface TickResult {
  launched: number
  skipped: number
  finished: boolean
  reason?: string
}

// Check if current time is within the campaign's call window (France weekdays)
function isWithinCallWindow(heureDebut: string, heureFin: string): boolean {
  const now = new Date()
  const day = now.getDay() // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false

  const [startH, startM] = heureDebut.split(':').map(Number)
  const [endH, endM] = heureFin.split(':').map(Number)
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM
  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

// Count calls currently active (en_cours / initie) for a campaign
async function countActiveCalls(campaignId: string): Promise<number> {
  return prisma.call.count({
    where: { campaignId, statut: { in: ['initie', 'en_cours'] } },
  })
}

// IDs already called (any status) for this campaign
async function getCalledProspectIds(campaignId: string): Promise<Set<string>> {
  const calls = await prisma.call.findMany({
    where: { campaignId },
    select: { prospectId: true },
  })
  return new Set(calls.map(c => c.prospectId))
}

export async function tickCampaign(campaignId: string): Promise<TickResult> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
  if (!campaign) return { launched: 0, skipped: 0, finished: true, reason: 'Campagne introuvable' }
  if (campaign.statut === 'pause') return { launched: 0, skipped: 0, finished: false, reason: 'Campagne en pause' }
  if (campaign.statut === 'termine') return { launched: 0, skipped: 0, finished: true, reason: 'Campagne terminée' }

  // Check call window
  if (!isWithinCallWindow(campaign.heureDebut, campaign.heureFin)) {
    return { launched: 0, skipped: 0, finished: false, reason: `Hors fenêtre d'appel (${campaign.heureDebut}–${campaign.heureFin})` }
  }

  const agent = await prisma.agent.findUnique({ where: { id: campaign.agentId } })
  if (!agent?.vapiAssistantId) {
    return { launched: 0, skipped: 0, finished: false, reason: 'Agent non synchronisé avec Vapi' }
  }

  const phoneNumberId = agent.phoneNumberId || process.env.VAPI_PHONE_NUMBER_ID || ''
  if (!phoneNumberId || phoneNumberId === 'COLLER_VOTRE_PHONE_NUMBER_ID_ICI') {
    return { launched: 0, skipped: 0, finished: false, reason: 'VAPI_PHONE_NUMBER_ID manquant' }
  }

  const prospectIds: string[] = JSON.parse(campaign.prospectIds || '[]')
  const calledIds = await getCalledProspectIds(campaignId)
  const remaining = prospectIds.filter(id => !calledIds.has(id))

  if (remaining.length === 0) {
    await prisma.campaign.update({ where: { id: campaignId }, data: { statut: 'termine' } })
    return { launched: 0, skipped: 0, finished: true, reason: 'Tous les prospects ont été appelés' }
  }

  const activeCount = await countActiveCalls(campaignId)
  const slots = Math.max(0, campaign.concurrency - activeCount)
  if (slots === 0) return { launched: 0, skipped: 0, finished: false, reason: 'Limite de concurrence atteinte' }

  // Load next batch of prospects to fill available slots
  const batch = await prisma.prospect.findMany({
    where: { id: { in: remaining.slice(0, slots * 3) } }, // over-fetch to handle skips
    take: slots * 3,
  })

  let launched = 0
  let skipped = 0

  for (const prospect of batch) {
    if (launched >= slots) break

    if (prospect.doNotCall) { skipped++; continue }
    if (prospect.statut === 'en_appel') { skipped++; continue }

    const call = await prisma.call.create({
      data: {
        prospectId: prospect.id,
        agentId: agent.id,
        campaignId,
        statut: 'initie',
      },
    })

    try {
      const result = await voiceProvider.startCall({
        phoneNumber: prospect.telephone,
        assistantId: agent.vapiAssistantId!,
        phoneNumberId,
        metadata: {
          callId: call.id,
          campaignId,
          prospectId: prospect.id,
          agentId: agent.id,
          prospectNom: prospect.nom ?? '',
          prospectPrenom: prospect.prenom ?? '',
        },
      })

      await prisma.call.update({
        where: { id: call.id },
        data: { vapiCallId: result.providerCallId, statut: 'en_cours' },
      })

      await prisma.prospect.update({
        where: { id: prospect.id },
        data: { statut: 'en_appel' },
      })

      launched++
    } catch {
      await prisma.call.update({ where: { id: call.id }, data: { statut: 'echec' } })
      skipped++
    }
  }

  // Update campaign counters
  const newAppeles = campaign.applesEffectues + launched
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { applesEffectues: newAppeles },
  })

  // Mark as finished if all called
  const newCalledIds = await getCalledProspectIds(campaignId)
  const stillRemaining = prospectIds.filter(id => !newCalledIds.has(id))
  if (stillRemaining.length === 0 && (await countActiveCalls(campaignId)) === 0) {
    await prisma.campaign.update({ where: { id: campaignId }, data: { statut: 'termine' } })
    return { launched, skipped, finished: true }
  }

  return { launched, skipped, finished: false }
}

// Called by webhook when a campaign call ends — advances the campaign
export async function onCampaignCallEnd(campaignId: string, outcome: 'interesse' | 'transfere' | 'appele' | 'refuse' | 'echec') {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
  if (!campaign || campaign.statut !== 'en_cours') return

  const isPositif = outcome === 'interesse' || outcome === 'transfere'
  const isEchec = outcome === 'echec'

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      applesReussis: isPositif ? { increment: 1 } : undefined,
      applesEchec: isEchec ? { increment: 1 } : undefined,
    },
  })

  // Auto-advance: try to launch next prospect
  await tickCampaign(campaignId)
}
