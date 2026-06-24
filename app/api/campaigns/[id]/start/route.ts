import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { tickCampaign } from '@/lib/campaign'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const campaign = await prisma.campaign.findUnique({ where: { id: params.id } })
  if (!campaign) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  if (campaign.statut === 'termine') {
    return NextResponse.json({ error: 'Cette campagne est terminée.' }, { status: 422 })
  }

  await prisma.campaign.update({ where: { id: params.id }, data: { statut: 'en_cours' } })

  // Launch first batch
  const result = await tickCampaign(params.id)
  return NextResponse.json({ ok: true, ...result })
}
