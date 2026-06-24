import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
  })

  // Attach agent name
  const agentIds = [...new Set(campaigns.map(c => c.agentId))]
  const agents = await prisma.agent.findMany({
    where: { id: { in: agentIds } },
    select: { id: true, nom: true },
  })
  const agentMap = Object.fromEntries(agents.map(a => [a.id, a.nom]))

  return NextResponse.json(campaigns.map(c => ({ ...c, agentNom: agentMap[c.agentId] ?? '—' })))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const { nom, agentId, concurrency, heureDebut, heureFin, filtreStatut } = body

  if (!nom || !agentId) {
    return NextResponse.json({ error: 'nom et agentId sont requis' }, { status: 400 })
  }

  // Fetch prospects matching the filter
  const where = {
    doNotCall: false,
    ...(filtreStatut ? { statut: filtreStatut } : {}),
  }

  const prospects = await prisma.prospect.findMany({
    where,
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })

  const prospectIds = prospects.map(p => p.id)

  const campaign = await prisma.campaign.create({
    data: {
      nom,
      agentId,
      concurrency: Number(concurrency) || 3,
      heureDebut: heureDebut || '09:00',
      heureFin: heureFin || '20:00',
      filtreStatut: filtreStatut || null,
      prospectIds: JSON.stringify(prospectIds),
      totalProspects: prospectIds.length,
    },
  })

  return NextResponse.json(campaign, { status: 201 })
}
