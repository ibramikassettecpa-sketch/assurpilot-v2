import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseFile } from '@/lib/import/parser'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  if (action === 'confirm') {
    const body = await req.json()
    const rows = body.rows as {
      nom?: string; prenom?: string; telephone: string; dateNaissance?: string
      email?: string; societe?: string; adresse?: string; ville?: string
      codePostal?: string; notes?: string; customFields: Record<string, unknown>
    }[]

    let imported = 0
    for (const row of rows) {
      await prisma.prospect.create({
        data: {
          nom: row.nom ?? null,
          prenom: row.prenom ?? null,
          telephone: row.telephone,
          dateNaissance: row.dateNaissance ?? null,
          email: row.email ?? null,
          societe: row.societe ?? null,
          adresse: row.adresse ?? null,
          ville: row.ville ?? null,
          codePostal: row.codePostal ?? null,
          notes: row.notes ?? null,
          customFields: JSON.stringify(row.customFields),
        },
      })
      imported++
    }
    return NextResponse.json({ imported })
  }

  // Parse (preview)
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const result = parseFile(buffer, file.name)
  return NextResponse.json(result)
}
