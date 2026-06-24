import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { voiceProvider } from '@/lib/providers/voice'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const { agentId, phone } = body
  let { prospectId } = body

  if (!agentId) {
    return NextResponse.json({ error: 'agentId est requis' }, { status: 400 })
  }

  // Manual call with direct phone number (no prospect)
  if (!prospectId && phone) {
    const created = await prisma.prospect.create({
      data: { telephone: phone, statut: 'nouveau' },
    })
    prospectId = created.id
  }

  if (!prospectId) {
    return NextResponse.json({ error: 'prospectId ou phone est requis' }, { status: 400 })
  }

  const [prospect, agent] = await Promise.all([
    prisma.prospect.findUnique({ where: { id: prospectId } }),
    prisma.agent.findUnique({ where: { id: agentId } }),
  ])

  if (!prospect) return NextResponse.json({ error: 'Prospect introuvable' }, { status: 404 })
  if (!agent) return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 })

  // Compliance guard
  if (prospect.doNotCall) {
    return NextResponse.json({ error: 'Ce prospect est marqué "ne pas appeler"' }, { status: 422 })
  }

  // Check calling hours (France: 8h-20h weekdays)
  const now = new Date()
  const hour = now.getHours()
  const day = now.getDay() // 0=Sun, 6=Sat
  if (day === 0 || day === 6 || hour < 8 || hour >= 20) {
    return NextResponse.json(
      { error: 'Hors des heures d\'appel autorisées (lun-ven, 8h-20h)' },
      { status: 422 }
    )
  }

  if (!agent.vapiAssistantId) {
    return NextResponse.json(
      { error: 'Cet agent n\'est pas encore synchronisé avec Vapi. Vérifiez vos clés API.' },
      { status: 422 }
    )
  }

  const phoneNumberId = agent.phoneNumberId || process.env.VAPI_PHONE_NUMBER_ID
  if (!phoneNumberId || phoneNumberId === 'COLLER_VOTRE_PHONE_NUMBER_ID_ICI') {
    return NextResponse.json(
      { error: 'VAPI_PHONE_NUMBER_ID manquant — ajoutez-le dans votre .env' },
      { status: 422 }
    )
  }

  // Create call record in DB
  const call = await prisma.call.create({
    data: {
      prospectId: prospect.id,
      agentId: agent.id,
      statut: 'initie',
    },
  })

  // Update prospect status
  await prisma.prospect.update({
    where: { id: prospect.id },
    data: { statut: 'en_appel' },
  })

  try {
    const result = await voiceProvider.startCall({
      phoneNumber: prospect.telephone,
      assistantId: agent.vapiAssistantId,
      phoneNumberId,
      metadata: {
        callId: call.id,
        prospectId: prospect.id,
        agentId: agent.id,
        prospectNom: prospect.nom ?? '',
        prospectPrenom: prospect.prenom ?? '',
      },
    })

    // Save Vapi call ID
    await prisma.call.update({
      where: { id: call.id },
      data: { vapiCallId: result.providerCallId, statut: 'en_cours' },
    })

    return NextResponse.json({ callId: call.id, vapiCallId: result.providerCallId })
  } catch (err) {
    // Revert statuses on failure
    await prisma.call.update({ where: { id: call.id }, data: { statut: 'echec' } })
    await prisma.prospect.update({ where: { id: prospect.id }, data: { statut: 'nouveau' } })
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Erreur lors du lancement de l'appel : ${msg}` }, { status: 500 })
  }
}
