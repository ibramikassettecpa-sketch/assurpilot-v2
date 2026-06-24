'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

const STATUTS = ['', 'nouveau', 'en_appel', 'appele', 'interesse', 'transfere', 'refuse']
const STATUT_LABELS: Record<string, string> = {
  '': 'Tous les statuts', nouveau: 'Nouveau', en_appel: 'En appel',
  appele: 'Appelé', interesse: 'Intéressé', transfere: 'Transféré', refuse: 'Refusé',
}

interface Prospect {
  id: string; nom: string | null; prenom: string | null; telephone: string
  societe: string | null; statut: string; leadScore: number; email: string | null
  ville: string | null; doNotCall: boolean; createdAt: string
}

interface Agent { id: string; nom: string; modele: string; vapiAssistantId: string | null }

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statut, setStatut] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [agents, setAgents] = useState<Agent[]>([])
  const [calling, setCalling] = useState<string | null>(null) // prospectId being called
  const [callModal, setCallModal] = useState<Prospect | null>(null)
  const [selectedAgent, setSelectedAgent] = useState('')
  const [callError, setCallError] = useState('')

  const fetchProspects = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (search) params.set('search', search)
    if (statut) params.set('statut', statut)
    const res = await fetch('/api/prospects?' + params)
    const data = await res.json()
    setProspects(data.prospects ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [page, search, statut])

  useEffect(() => { fetchProspects() }, [fetchProspects])
  useEffect(() => {
    fetch('/api/agents').then(r => r.json()).then(d => {
      if (Array.isArray(d)) { setAgents(d); if (d.length > 0) setSelectedAgent(d[0].id) }
    })
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  async function launchCall(prospect: Prospect, agentId: string) {
    setCalling(prospect.id)
    setCallError('')
    const res = await fetch('/api/calls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospectId: prospect.id, agentId }),
    })
    const data = await res.json()
    setCalling(null)
    if (!res.ok) {
      setCallError(data.error ?? 'Erreur lors du lancement de l\'appel.')
    } else {
      setCallModal(null)
      fetchProspects()
    }
  }

  const totalPages = Math.ceil(total / 20)
  const MODELE_LABELS: Record<string, string> = {
    'claude-haiku-4-5': '⚡ Haiku', 'claude-sonnet-4-6': '🎯 Sonnet', 'gemini-flash': '🌐 Gemini',
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ margin: 0 }}>Prospects <span style={{ fontSize: 16, fontWeight: 400, color: '#6b7280' }}>({total})</span></h1>
        <Link href="/prospects/import" className="btn btn-primary">📥 Importer des prospects</Link>
      </div>

      {callError && <div className="alert alert-error">{callError} <button onClick={() => setCallError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}>×</button></div>}

      {/* Call modal */}
      {callModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: 420, maxWidth: '90vw' }}>
            <h3 style={{ marginBottom: 16 }}>📞 Appeler {[callModal.prenom, callModal.nom].filter(Boolean).join(' ') || callModal.telephone}</h3>
            <p style={{ color: '#6b7280', marginBottom: 16, fontSize: 13 }}>Numéro : <strong style={{ fontFamily: 'monospace' }}>{callModal.telephone}</strong></p>
            {agents.length === 0 ? (
              <div className="alert alert-error">Aucun agent IA disponible. <Link href="/agents" style={{ color: '#4f46e5' }}>Créez un agent d'abord.</Link></div>
            ) : (
              <>
                <div className="form-group">
                  <label>Agent qui parle</label>
                  <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.nom} — {MODELE_LABELS[a.modele] ?? a.modele}
                        {!a.vapiAssistantId ? ' ⚠ (clés manquantes)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {callError && <div className="alert alert-error">{callError}</div>}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={() => { setCallModal(null); setCallError('') }}>Annuler</button>
                  <button className="btn btn-primary" onClick={() => launchCall(callModal, selectedAgent)} disabled={!!calling || !selectedAgent}>
                    {calling ? 'Lancement...' : '📞 Lancer l\'appel'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16, padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            type="search" placeholder="Rechercher par nom, prénom, téléphone, société..."
            value={searchInput} onChange={e => setSearchInput(e.target.value)}
            style={{ flex: 1 }}
          />
          <select value={statut} onChange={e => { setStatut(e.target.value); setPage(1) }} style={{ width: 180 }}>
            {STATUTS.map(s => <option key={s} value={s}>{STATUT_LABELS[s]}</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Chargement...</div>
        ) : prospects.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
            Aucun prospect trouvé. <Link href="/prospects/import" style={{ color: '#4f46e5' }}>Importer des prospects</Link>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nom</th><th>Téléphone</th><th>Société</th><th>Ville</th>
                <th>Statut</th><th>Score</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {prospects.map(p => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/prospects/${p.id}`} style={{ color: '#4f46e5', fontWeight: 600 }}>
                      {[p.prenom, p.nom].filter(Boolean).join(' ') || '—'}
                    </Link>
                    {p.doNotCall && <span style={{ marginLeft: 6, fontSize: 11, color: '#b91c1c' }}>⛔ NPA</span>}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{p.telephone}</td>
                  <td>{p.societe ?? '—'}</td>
                  <td>{p.ville ?? '—'}</td>
                  <td><span className={`badge badge-${p.statut}`}>{STATUT_LABELS[p.statut] ?? p.statut}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 40, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${p.leadScore}%`, height: '100%', background: '#4f46e5' }} />
                      </div>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>{p.leadScore}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {!p.doNotCall && p.statut !== 'en_appel' && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => { setCallModal(p); setCallError('') }}
                          disabled={calling === p.id}
                        >
                          {calling === p.id ? '⏳' : '📞'} Appeler
                        </button>
                      )}
                      {p.statut === 'en_appel' && (
                        <span style={{ fontSize: 12, color: '#d97706', padding: '5px 10px' }}>⏳ En cours...</span>
                      )}
                      <Link href={`/prospects/${p.id}`} className="btn btn-secondary btn-sm">Voir</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Précédent</button>
          <span style={{ padding: '5px 12px', fontSize: 13, color: '#6b7280' }}>Page {page} / {totalPages}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Suivant →</button>
        </div>
      )}
    </div>
  )
}
