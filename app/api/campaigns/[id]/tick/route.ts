import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { tickCampaign } from '@/lib/campaign'

// Called by the frontend every 10s to advance the campaign
// Also called automatically when a campaign call ends (via webhook)
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const result = await tickCampaign(params.id)
  return NextResponse.json(result)
}
