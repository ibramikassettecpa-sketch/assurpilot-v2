import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { voiceProvider } from '@/lib/providers/voice'

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const agents = await prisma.agent.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(agents)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const {
    nom, langue, modele, voix, messageAccueil, scriptCommercial,
    notesObjections, objectif, phoneNumberId, transferPhone, triggerPhrases,
  } = body

  // Create agent in DB first
  const agent = await prisma.agent.create({
    data: {
      nom, langue: langue ?? 'fr', modele: modele ?? 'claude-haiku-4-5',
      voix: voix ?? 'charlotte', messageAccueil, scriptCommercial,
      notesObjections: notesObjections ?? '', objectif: objectif ?? '',
      phoneNumberId: phoneNumberId ?? '',
      transferPhone: transferPhone ?? '',
      triggerPhrases: JSON.stringify(triggerPhrases ?? []),
    },
  })

  // Try to sync to Vapi (non-blocking — works even without keys in dev)
  try {
    const vapiId = await voiceProvider.createAssistant({
      name: nom,
      langue: langue ?? 'fr',
      modele: modele ?? 'claude-haiku-4-5',
      voix: voix ?? 'charlotte',
      messageAccueil,
      scriptCommercial,
      notesObjections: notesObjections ?? '',
      objectif: objectif ?? '',
      triggerPhrases: triggerPhrases ?? [],
      transferPhone: transferPhone ?? '',
      webhookUrl: `${appUrl}/api/webhooks/vapi`,
    })
    await prisma.agent.update({
      where: { id: agent.id },
      data: { vapiAssistantId: vapiId },
    })
    return NextResponse.json({ ...agent, vapiAssistantId: vapiId }, { status: 201 })
  } catch (err) {
    // Return agent even if Vapi sync fails (keys not configured yet)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { ...agent, vapiWarning: `Agent créé localement. Synchronisation Vapi échouée : ${msg}` },
      { status: 201 }
    )
  }
}
