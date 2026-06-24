import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/webhooks/test?callId=xxx
// Simulates a Vapi end-of-call-report for a call (dev/test only)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { callId, outcome } = await req.json() as { callId: string; outcome?: string }

  const call = await prisma.call.findUnique({ where: { id: callId } })
  if (!call) return NextResponse.json({ error: 'Appel introuvable' }, { status: 404 })

  // Simulate webhook payload
  const outcomes: Record<string, { statut: string; leadScore: number; resume: string }> = {
    transfere: { statut: 'transfere', leadScore: 85, resume: 'Le prospect a exprimé son intérêt et a demandé à parler à un conseiller.' },
    interesse: { statut: 'interesse', leadScore: 65, resume: 'Le prospect est intéressé par l\'offre mais souhaite réfléchir.' },
    appele: { statut: 'appele', leadScore: 20, resume: 'Appel complété, prospect neutre.' },
    refuse: { statut: 'refuse', leadScore: 5, resume: 'Le prospect n\'est pas intéressé.' },
  }

  const sim = outcomes[outcome ?? 'appele'] ?? outcomes.appele

  await prisma.call.update({
    where: { id: callId },
    data: { statut: 'termine', resume: sim.resume, leadScore: sim.leadScore, duree: 120 },
  })

  await prisma.prospect.update({
    where: { id: call.prospectId },
    data: { statut: sim.statut, leadScore: sim.leadScore },
  })

  return NextResponse.json({ ok: true, simulated: sim })
}
