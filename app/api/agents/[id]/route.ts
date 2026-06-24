import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { voiceProvider } from '@/lib/providers/voice'

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const agent = await prisma.agent.findUnique({ where: { id: params.id } })
  if (!agent) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  return NextResponse.json(agent)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const existing = await prisma.agent.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const updated = await prisma.agent.update({
    where: { id: params.id },
    data: {
      ...body,
      triggerPhrases: body.triggerPhrases ? JSON.stringify(body.triggerPhrases) : undefined,
    },
  })

  // Sync to Vapi if assistant exists
  if (updated.vapiAssistantId) {
    try {
      await voiceProvider.updateAssistant(updated.vapiAssistantId, {
        name: updated.nom,
        langue: updated.langue,
        modele: updated.modele,
        voix: updated.voix,
        messageAccueil: updated.messageAccueil,
        scriptCommercial: updated.scriptCommercial,
        notesObjections: updated.notesObjections,
        objectif: updated.objectif,
        triggerPhrases: JSON.parse(updated.triggerPhrases),
        transferPhone: updated.transferPhone,
        webhookUrl: `${appUrl}/api/webhooks/vapi`,
      })
    } catch {
      // Non-blocking
    }
  }

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const agent = await prisma.agent.findUnique({ where: { id: params.id } })
  if (!agent) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  if (agent.vapiAssistantId) {
    try { await voiceProvider.deleteAssistant(agent.vapiAssistantId) } catch { /* non-blocking */ }
  }

  await prisma.agent.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
