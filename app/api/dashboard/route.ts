import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    totalProspects,
    totalAgents,
    appelsAujourdhui,
    transfertsAujourdhui,
    interessesAujourdhui,
    echecsAujourdhui,
    dureeData,
    campaignesEnCours,
    appelsSemaine,
    prospectsParStatut,
  ] = await Promise.all([
    prisma.prospect.count(),
    prisma.agent.count(),
    prisma.call.count({ where: { createdAt: { gte: today } } }),
    prisma.call.count({ where: { createdAt: { gte: today }, prospect: { statut: 'transfere' } } }),
    prisma.call.count({ where: { createdAt: { gte: today }, prospect: { statut: 'interesse' } } }),
    prisma.call.count({ where: { createdAt: { gte: today }, statut: 'echec' } }),
    prisma.call.aggregate({ where: { createdAt: { gte: today }, duree: { not: null } }, _avg: { duree: true }, _count: { duree: true } }),
    prisma.campaign.count({ where: { statut: 'en_cours' } }),
    // Last 7 days — fetch raw then group in JS (works on both SQLite and PostgreSQL)
    prisma.call.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) } },
      select: { createdAt: true },
    }),
    prisma.prospect.groupBy({ by: ['statut'], _count: { statut: true } }),
  ])

  // Group calls by day in JS
  const dayMap: Record<string, number> = {}
  const rawCalls = appelsSemaine as { createdAt: Date }[]
  for (const c of rawCalls) {
    const day = c.createdAt.toISOString().slice(0, 10)
    dayMap[day] = (dayMap[day] ?? 0) + 1
  }
  const appelsSemaineGrouped = Object.entries(dayMap)
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => a.day.localeCompare(b.day))

  const tauxConnexion = appelsAujourdhui > 0
    ? Math.round(((appelsAujourdhui - echecsAujourdhui) / appelsAujourdhui) * 100) : 0
  const tauxConversion = appelsAujourdhui > 0
    ? Math.round(((transfertsAujourdhui + interessesAujourdhui) / appelsAujourdhui) * 100) : 0

  return NextResponse.json({
    totalProspects,
    totalAgents,
    appelsAujourdhui,
    transfertsAujourdhui,
    interessesAujourdhui,
    tauxConnexion,
    tauxConversion,
    dureeMoyenne: Math.round(dureeData._avg.duree ?? 0),
    campaignesEnCours,
    appelsSemaine: appelsSemaineGrouped,
    prospectsParStatut: prospectsParStatut.map(r => ({ statut: r.statut, count: r._count.statut })),
  })
}
