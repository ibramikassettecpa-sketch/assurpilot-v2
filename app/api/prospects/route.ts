import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20'))
  const search = searchParams.get('search') ?? ''
  const statut = searchParams.get('statut') ?? ''

  const where = {
    ...(statut ? { statut } : {}),
    ...(search
      ? {
          OR: [
            { nom: { contains: search } },
            { prenom: { contains: search } },
            { telephone: { contains: search } },
            { societe: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {}),
  }

  const [total, prospects] = await Promise.all([
    prisma.prospect.count({ where }),
    prisma.prospect.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, nom: true, prenom: true, telephone: true, societe: true,
        statut: true, leadScore: true, email: true, ville: true, createdAt: true,
        doNotCall: true,
      },
    }),
  ])

  return NextResponse.json({ prospects, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const prospect = await prisma.prospect.create({ data: body })
  return NextResponse.json(prospect, { status: 201 })
}
