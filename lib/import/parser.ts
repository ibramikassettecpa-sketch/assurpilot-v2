import * as XLSX from 'xlsx'

export interface ProspectRow {
  nom?: string
  prenom?: string
  telephone: string
  dateNaissance?: string
  email?: string
  societe?: string
  adresse?: string
  ville?: string
  codePostal?: string
  notes?: string
  customFields: Record<string, unknown>
}

export interface SkippedRow {
  row: number
  reason: string
}

export interface ParseResult {
  preview: ProspectRow[]
  rows: ProspectRow[]
  total: number
  skipped: SkippedRow[]
  columns: string[]
  mappings: Record<string, string>
}

const KNOWN_MAPPINGS: Record<string, string> = {
  nom: 'nom', name: 'nom', last_name: 'nom', lastname: 'nom', 'last name': 'nom',
  prenom: 'prenom', prénom: 'prenom', first_name: 'prenom', firstname: 'prenom', 'first name': 'prenom',
  telephone: 'telephone', téléphone: 'telephone', phone: 'telephone', tel: 'telephone', mobile: 'telephone', portable: 'telephone',
  date_naissance: 'dateNaissance', datenaissance: 'dateNaissance', 'date de naissance': 'dateNaissance', naissance: 'dateNaissance', birthday: 'dateNaissance', birth_date: 'dateNaissance',
  email: 'email', 'e-mail': 'email', mail: 'email', courriel: 'email',
  societe: 'societe', société: 'societe', company: 'societe', entreprise: 'societe', organisation: 'societe', organization: 'societe',
  adresse: 'adresse', address: 'adresse', rue: 'adresse',
  ville: 'ville', city: 'ville',
  code_postal: 'codePostal', codepostal: 'codePostal', 'code postal': 'codePostal', postal_code: 'codePostal', postalcode: 'codePostal', zip: 'codePostal',
  notes: 'notes', note: 'notes', commentaire: 'notes', commentaires: 'notes', comment: 'notes', remarks: 'notes',
}

function normalizePhone(raw: string): string | null {
  let s = String(raw).replace(/[\s\-\.\(\)]/g, '')
  if (s.startsWith('00')) s = '+' + s.slice(2)
  if (/^0[1-9]/.test(s)) s = '+33' + s.slice(1)
  if (/^33[1-9]/.test(s) && !s.startsWith('+')) s = '+' + s
  if (!/^\+[1-9]\d{6,14}$/.test(s)) return null
  return s
}

export function parseFile(buffer: Buffer, filename: string): ParseResult {
  const ext = filename.split('.').pop()?.toLowerCase()
  let workbook: XLSX.WorkBook

  if (ext === 'csv') {
    const text = buffer.toString('utf-8')
    workbook = XLSX.read(text, { type: 'string' })
  } else {
    workbook = XLSX.read(buffer, { type: 'buffer' })
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  if (raw.length === 0) {
    return { preview: [], rows: [], total: 0, skipped: [], columns: [], mappings: {} }
  }

  const headers = Object.keys(raw[0] as object)
  const mappings: Record<string, string> = {}
  headers.forEach(h => {
    const key = h.toLowerCase().trim()
    if (KNOWN_MAPPINGS[key]) mappings[h] = KNOWN_MAPPINGS[key]
  })

  const rows: ProspectRow[] = []
  const skipped: SkippedRow[] = []

  raw.forEach((rawRow, idx) => {
    const rowNum = idx + 2 // 1-indexed + header
    const customFields: Record<string, unknown> = {}
    const mapped: Partial<ProspectRow> = { customFields }

    headers.forEach(h => {
      const val = rawRow[h]
      const field = mappings[h]
      if (field && field !== 'customFields') {
        (mapped as Record<string, unknown>)[field] = val ? String(val).trim() : undefined
      } else if (!field) {
        customFields[h] = val
      }
    })

    const rawPhone = String((rawRow as Record<string, unknown>)[
      headers.find(h => mappings[h] === 'telephone') ?? ''
    ] ?? '').trim()

    if (!rawPhone) {
      skipped.push({ row: rowNum, reason: 'Numéro de téléphone manquant' })
      return
    }

    const phone = normalizePhone(rawPhone)
    if (!phone) {
      skipped.push({ row: rowNum, reason: `Numéro invalide: "${rawPhone}"` })
      return
    }

    rows.push({ ...mapped, telephone: phone, customFields } as ProspectRow)
  })

  return {
    preview: rows.slice(0, 5),
    rows,
    total: rows.length,
    skipped,
    columns: headers,
    mappings,
  }
}
