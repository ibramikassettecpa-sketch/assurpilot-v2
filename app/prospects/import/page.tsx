'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface ParseResult {
  preview: Record<string, unknown>[]
  rows: Record<string, unknown>[]
  total: number
  skipped: { row: number; reason: string }[]
  columns: string[]
  mappings: Record<string, string>
}

const FIELD_LABELS: Record<string, string> = {
  nom: 'Nom', prenom: 'Prénom', telephone: 'Téléphone', dateNaissance: 'Date de naissance',
  email: 'Email', societe: 'Société', adresse: 'Adresse', ville: 'Ville',
  codePostal: 'Code postal', notes: 'Notes',
}

export default function ImportPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [importResult, setImportResult] = useState<{ imported: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError('')
    setLoading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/import', { method: 'POST', body: fd })
    setLoading(false)
    if (!res.ok) { setError('Erreur lors de l\'analyse du fichier.'); return }
    const data = await res.json()
    setParseResult(data)
    setStep(2)
  }

  async function handleImport() {
    if (!parseResult) return
    setLoading(true)
    setError('')
    const res = await fetch('/api/import?action=confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: parseResult.rows }),
    })
    setLoading(false)
    if (!res.ok) { setError('Erreur lors de l\'importation.'); return }
    const data = await res.json()
    setImportResult(data)
    setStep(3)
  }

  return (
    <div>
      <h1 className="page-title">Importer des prospects</h1>

      {/* Stepper */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 28, position: 'relative' }}>
        {['Fichier', 'Aperçu', 'Résultat'].map((label, i) => {
          const n = i + 1
          const active = step === n
          const done = step > n
          return (
            <div key={n} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: done ? '#d1fae5' : active ? '#ede9fe' : '#f3f4f6', borderRadius: 6, marginRight: n < 3 ? 8 : 0 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? '#059669' : active ? '#4f46e5' : '#9ca3af', color: '#fff', fontWeight: 700, fontSize: 13 }}>
                {done ? '✓' : n}
              </div>
              <span style={{ fontWeight: active ? 600 : 400, color: done ? '#065f46' : active ? '#4f46e5' : '#6b7280' }}>{label}</span>
            </div>
          )
        })}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Step 1 */}
      {step === 1 && (
        <div className="card">
          <p style={{ color: '#6b7280', marginBottom: 20 }}>
            Formats acceptés : <strong>.xlsx</strong> et <strong>.csv</strong>. Les colonnes reconnues sont : nom, prénom, téléphone, email, société, adresse, ville, code postal, date de naissance, notes. Toute colonne inconnue sera conservée comme champ personnalisé.
          </p>
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            style={{
              border: `2px dashed ${dragging ? '#4f46e5' : '#d1d5db'}`, borderRadius: 10,
              padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
              background: dragging ? '#ede9fe' : '#f9fafb', transition: 'all 0.2s',
            }}
          >
            {loading ? <p style={{ color: '#6b7280' }}>Analyse en cours...</p> : (
              <>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📂</div>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>Glissez-déposez votre fichier ici</p>
                <p style={{ color: '#6b7280', fontSize: 13 }}>ou cliquez pour sélectionner</p>
              </>
            )}
          </div>
          <input ref={inputRef} type="file" accept=".xlsx,.csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && parseResult && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>Colonnes détectées</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {parseResult.columns.map(col => {
                const mapped = parseResult.mappings[col]
                return (
                  <div key={col} style={{ padding: '4px 10px', borderRadius: 20, background: mapped ? '#dbeafe' : '#f3f4f6', fontSize: 13 }}>
                    <strong>{col}</strong> {mapped ? <span style={{ color: '#4f46e5' }}>→ {FIELD_LABELS[mapped] ?? mapped}</span> : <span style={{ color: '#9ca3af' }}>(champ personnalisé)</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {parseResult.skipped.length > 0 && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              <strong>{parseResult.skipped.length} ligne(s) ignorée(s) :</strong>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                {parseResult.skipped.slice(0, 10).map(s => <li key={s.row}>Ligne {s.row} : {s.reason}</li>)}
                {parseResult.skipped.length > 10 && <li>... et {parseResult.skipped.length - 10} autres</li>}
              </ul>
            </div>
          )}

          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>Aperçu (5 premières lignes)</h3>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    {['Prénom', 'Nom', 'Téléphone', 'Email', 'Société', 'Champs personnalisés'].map(h => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {parseResult.preview.map((row, i) => (
                    <tr key={i}>
                      <td>{(row.prenom as string) ?? '—'}</td>
                      <td>{(row.nom as string) ?? '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{row.telephone as string}</td>
                      <td>{(row.email as string) ?? '—'}</td>
                      <td>{(row.societe as string) ?? '—'}</td>
                      <td style={{ fontSize: 12, color: '#6b7280' }}>
                        {Object.keys(row.customFields as object).length > 0
                          ? Object.entries(row.customFields as Record<string, unknown>).map(([k, v]) => `${k}: ${v}`).join(', ')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ background: '#ede9fe', border: '1px solid #c4b5fd' }}>
            <p style={{ fontWeight: 600, marginBottom: 12 }}>
              ✅ <strong>{parseResult.total}</strong> prospect(s) seront importés
              {parseResult.skipped.length > 0 && <>, <strong>{parseResult.skipped.length}</strong> ignorés</>}.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>← Retour</button>
              <button className="btn btn-primary" onClick={handleImport} disabled={loading || parseResult.total === 0}>
                {loading ? 'Importation...' : `Importer ${parseResult.total} prospect(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && importResult && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: 22, marginBottom: 8 }}>Importation réussie !</h2>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>
            <strong>{importResult.imported}</strong> prospect(s) ont été importés avec succès.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => { setStep(1); setParseResult(null); setImportResult(null) }}>Nouveau import</button>
            <a href="/prospects" className="btn btn-primary">Voir les prospects →</a>
          </div>
        </div>
      )}
    </div>
  )
}
