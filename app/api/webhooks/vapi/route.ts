import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { onCampaignCallEnd } from '@/lib/campaign'
import { dispatchWebhook } from '@/lib/webhooks'

// Configure this URL in Vapi dashboard → Assistants → Server URL:
// https://votre-domaine.com/api/webhooks/vapi
// Or use ngrok in dev: https://abc123.ngrok.io/api/webhooks/vapi

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { message } = body as { message?: Record<string, unknown> }

  if (!message) return NextResponse.json({ ok: true })

  const type = message.type as string | undefined

  switch (type) {
    case 'end-of-call-report':
      await handleEndOfCall(message)
      break

    case 'status-update':
      await handleStatusUpdate(message)
      break

    // Tool-call event — fired when the AI calls "transfererVersConseiller"
    case 'tool-calls':
      await handleToolCall(message)
      // Vapi expects a response with the tool result
      return NextResponse.json(buildToolCallResponse(message))

    // Vapi also fires this on transfer
    case 'transfer-destination-request':
      await handleTransferRequest(message)
      break
  }

  return NextResponse.json({ ok: true })
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getVapiCallId(message: Record<string, unknown>): string | undefined {
  return (message.call as Record<string, unknown>)?.id as string | undefined
}

async function getCallByVapiId(vapiCallId: string) {
  return prisma.call.findFirst({ where: { vapiCallId } })
}

// ─── end-of-call-report ─────────────────────────────────────────────────────

async function handleEndOfCall(message: Record<string, unknown>) {
  const vapiCallId = getVapiCallId(message)
  if (!vapiCallId) return

  const call = await getCallByVapiId(vapiCallId)
  if (!call) return

  const callData = message.call as Record<string, unknown>
  const analysis = message.analysis as Record<string, unknown> | undefined
  const artifact = message.artifact as Record<string, unknown> | undefined

  const transcript = message.transcript as string | undefined
  const summary = analysis?.summary as string | undefined
  const recordingUrl = artifact?.recordingUrl as string | undefined
  const endedReason = message.endedReason as string | undefined

  // Duration calculation
  let duree: number | undefined
  if (callData?.startedAt && callData?.endedAt) {
    duree = Math.round(
      (new Date(callData.endedAt as string).getTime() -
        new Date(callData.startedAt as string).getTime()) / 1000
    )
  }

  // Lead scoring based on outcome
  let leadScore = 20
  let prospectStatut = 'appele'

  if (endedReason === 'transfer') {
    leadScore = 85
    prospectStatut = 'transfere'
  } else if (transcript) {
    const lower = transcript.toLowerCase()
    const positifs = ['intéressé', 'interessé', 'pourquoi pas', 'volontiers', 'bien sûr', 'rendez-vous']
    const negatifs = ["pas intéressé", 'refus', 'ne pas rappeler', 'ça ne m\'intéresse', 'raccroché']
    if (positifs.some(w => lower.includes(w))) {
      leadScore = 65
      prospectStatut = 'interesse'
    } else if (negatifs.some(w => lower.includes(w))) {
      leadScore = 5
      prospectStatut = 'refuse'
    }
  }

  await prisma.call.update({
    where: { id: call.id },
    data: {
      statut: 'termine',
      transcript: transcript ?? null,
      resume: summary ?? null,
      recordingUrl: recordingUrl ?? null,
      duree: duree ?? null,
      leadScore,
    },
  })

  await prisma.prospect.update({
    where: { id: call.prospectId },
    data: { statut: prospectStatut, leadScore },
  })

  // Outbound webhook events
  const callForDispatch = await prisma.call.findUnique({ where: { id: call.id }, include: { prospect: true } })
  if (callForDispatch) {
    const baseData = {
      callId: call.id,
      prospectId: call.prospectId,
      prospectTelephone: callForDispatch.prospect.telephone,
      prospectNom: [callForDispatch.prospect.prenom, callForDispatch.prospect.nom].filter(Boolean).join(' ') || null,
      duree,
      leadScore,
      resume: summary ?? null,
    }
    dispatchWebhook('call.ended', baseData)
    if (prospectStatut === 'transfere') dispatchWebhook('lead.transferred', baseData)
    else if (prospectStatut === 'interesse') dispatchWebhook('lead.qualified', baseData)
  }

  // Auto-advance campaign if this call was part of one
  if (call.campaignId) {
    const outcome = prospectStatut as 'interesse' | 'transfere' | 'appele' | 'refuse'
    await onCampaignCallEnd(call.campaignId, outcome)
  }
}

// ─── status-update ──────────────────────────────────────────────────────────

async function handleStatusUpdate(message: Record<string, unknown>) {
  const vapiCallId = getVapiCallId(message)
  if (!vapiCallId) return

  const status = message.status as string | undefined
  const statusMap: Record<string, string> = {
    ringing: 'en_cours',
    'in-progress': 'en_cours',
    forwarding: 'en_cours',
    ended: 'termine',
  }
  const dbStatus = status ? statusMap[status] : undefined
  if (!dbStatus) return

  await prisma.call.updateMany({ where: { vapiCallId }, data: { statut: dbStatus } })
}

// ─── tool-calls — fired when AI calls "transfererVersConseiller" ─────────────

async function handleToolCall(message: Record<string, unknown>) {
  const vapiCallId = getVapiCallId(message)
  if (!vapiCallId) return

  const toolCalls = message.toolCallList as Array<Record<string, unknown>> | undefined
  if (!toolCalls) return

  for (const tc of toolCalls) {
    const fnName = (tc.function as Record<string, unknown>)?.name as string | undefined
    if (fnName !== 'transfererVersConseiller') continue

    const args = (tc.function as Record<string, unknown>)?.arguments as Record<string, unknown> | undefined
    const resumeConversation = args?.resume_conversation as string | undefined

    const call = await getCallByVapiId(vapiCallId)
    if (!call) continue

    // Update call & prospect with transfer status immediately
    await prisma.call.update({
      where: { id: call.id },
      data: {
        statut: 'termine',
        resume: resumeConversation ?? 'Transfert vers conseiller',
        leadScore: 85,
      },
    })

    await prisma.prospect.update({
      where: { id: call.prospectId },
      data: { statut: 'transfere', leadScore: 85 },
    })
  }
}

// Vapi requires a tool result response when we receive tool-calls
function buildToolCallResponse(message: Record<string, unknown>) {
  const toolCalls = message.toolCallList as Array<Record<string, unknown>> | undefined
  if (!toolCalls) return { ok: true }

  return {
    results: toolCalls.map(tc => ({
      toolCallId: tc.id as string,
      result: 'Transfert en cours. Merci de patienter.',
    })),
  }
}

// ─── transfer-destination-request ───────────────────────────────────────────

async function handleTransferRequest(message: Record<string, unknown>) {
  const vapiCallId = getVapiCallId(message)
  if (!vapiCallId) return

  const call = await getCallByVapiId(vapiCallId)
  if (!call) return

  await prisma.prospect.update({
    where: { id: call.prospectId },
    data: { statut: 'transfere', leadScore: 85 },
  })
}
