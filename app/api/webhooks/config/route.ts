import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const configs = await prisma.webhookConfig.findMany({ orderBy: { createdAt: 'desc' } })
  // Mask secret — return only last 6 chars
  return NextResponse.json(configs.map(c => ({
    ...c,
    secret: '••••••' + c.secret.slice(-6),
  })))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { url } = await req.json()
  if (!url || !url.startsWith('http')) return NextResponse.json({ error: 'URL invalide' }, { status: 400 })

  const secret = crypto.randomBytes(32).toString('hex')
  const config = await prisma.webhookConfig.create({ data: { url, secret } })

  return NextResponse.json({ ...config, secret }) // Return full secret only on creation
}
