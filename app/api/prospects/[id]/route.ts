import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const prospect = await prisma.prospect.findUnique({
    where: { id: params.id },
    include: { calls: { orderBy: { createdAt: 'desc' } } },
  })
  if (!prospect) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  return NextResponse.json(prospect)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const prospect = await prisma.prospect.update({ where: { id: params.id }, data: body })
  return NextResponse.json(prospect)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  await prisma.prospect.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
