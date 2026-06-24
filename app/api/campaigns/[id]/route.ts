import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const campaign = await prisma.campaign.findUnique({ where: { id: params.id } })
  if (!campaign) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  // Active calls count
  const activeCalls = await prisma.call.count({
    where: { campaignId: params.id, statut: { in: ['initie', 'en_cours'] } },
  })

  // Recent calls for this campaign
  const recentCalls = await prisma.call.findMany({
    where: { campaignId: params.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { prospect: { select: { nom: true, prenom: true, telephone: true } } },
  })

  return NextResponse.json({ ...campaign, activeCalls, recentCalls })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const campaign = await prisma.campaign.findUnique({ where: { id: params.id } })
  if (!campaign) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  if (campaign.statut === 'en_cours') {
    return NextResponse.json({ error: 'Pausez la campagne avant de la supprimer.' }, { status: 422 })
  }

  await prisma.campaign.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
