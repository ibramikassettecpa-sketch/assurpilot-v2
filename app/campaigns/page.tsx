'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Agent { id: string; nom: string; modele: string }
interface Campaign {
  id: string; nom: string; agentId: string; agentNom: string
  statut: string; concurrency: number; heureDebut: string; heureFin: string
  filtreStatut: string | null; totalProspects: number; applesEffectues: number
  applesReussis: number; applesEchec: number; createdAt: string
}

const STATUT_LABELS: Record<string, string> = {
  en_attente: 'En attente', en_cours: 'En cours', pause: 'En pause', termine: 'Terminée',
}
const STATUT_COLORS: Record<string, string> = {
  en_attente: '#9ca3af', en_cours: '#059669', pause: '#d97706', termine: '#6b7280',
}
const PROSPECT_STATUTS = [
  { value: '', label: 'Tous les prospects (hors ne-pas-appeler)' },
  { value: 'nouveau', label: 'Nouveaux uniquement' },
  { value: 'appele', label: 'Déjà appelés' },
  { value: 'interesse', label: 'Intéressés' },
]

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Form state
  const [nom, setNom] = useState('')
  const [agentId, setAgentId] = useState('')
  const [concurrency, setConcurrency] = useState(3)
  const [heureDebut, setHeureDebut] = useState('09:00')
  const [heureFin, setHeureFin] = useState('20:00')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [prospectCount, setProspectCount] = useState<number | null>(null)

  const load = useCallback(async () => {
    const [cRes, aRes] = await Promise.all([
      fetch('/api/campaigns'),
      fetch('/api/agents'),
    ])
    const [cData, aData] = await Promise.all([cRes.json(), aRes.json()])
    setCampaigns(Array.isArray(cData) ? cData : [])
    if (Array.isArray(aData)) {
      setAgents(aData)
      if (aData.length > 0 && !agentId) setAgentId(aData[0].id)
    }
    setLoading(false)
  }, [agentId])

  useEffect(() => { load() }, [load])

  // Poll active campaigns every 8 seconds for live progress
  useEffect(() => {
    const hasActive = campaigns.some(c => c.statut === 'en_cours')
    if (!hasActive) return
    const t = setInterval(load, 8000)
    return () => clearInterval(t)
  }, [campaigns, load])

  // Preview prospect count when filter changes
  useEffect(() => {
    const params = new URLSearchParams({ limit: '1' })
    if (filtreStatut) params.set('statut', filtreStatut)
    fetch(`/api/prospects?${params}`)
      .then(r => r.json())
      .then(d => setProspectCount(d.total ?? 0))
  }, [filtreStatut])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setActionLoading('create')
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom, agentId, concurrency, heureDebut, heureFin, filtreStatut: filtreStatut || null }),
    })
    setActionLoading(null)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Erreur'); return }
    setShowForm(false)
    setNom('')
    load()
  }

  async function doAction(id: string, action: 'start' | 'pause' | 'tick') {
    setActionLoading(id + action)
    await fetch(`/api/campaigns/${id}/${action}`, { method: 'POST' })
    setActionLoading(null)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette campagne ?')) return
    const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Erreur'); return }
    load()
  }

  const pct = (c: Campaign) => c.totalProspects > 0
    ? Math.round((c.applesEffectues / c.totalProspects) * 100) : 0

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ margin: 0 }}>Campagnes d'appels</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
          {showForm ? '× Annuler' : '+ Nouvelle campagne'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error} <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}>×</button></div>}

      {/* Create form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24, border: '2px solid #4f46e5' }}>
          <h2 style={{ fontSize: 16, marginBottom: 20 }}>📞 Nouvelle campagne</h2>
          {agents.length === 0 && (
            <div className="alert alert-error">Aucun agent disponible. <Link href="/agents" style={{ color: '#4f46e5' }}>Créez un agent d'abord.</Link></div>
          )}
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label>Nom de la campagne *</label>
                <input value={nom} onChange={e => setNom(e.target.value)} required placeholder="Ex: Prospection Mai 2025" />
              </div>
              <div className="form-group">
                <label>Agent IA *</label>
                <select value={agentId} onChange={e => setAgentId(e.target.value)}>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Concurrence (appels simultanés)</label>
                <input type="number" min={1} max={10} value={concurrency} onChange={e => setConcurrency(Number(e.target.value))} />
                <small style={{ color: '#6b7280' }}>Maximum {concurrency} appels en même temps</small>
              </div>
              <div className="form-group">
                <label>Fenêtre d'appel</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="time" value={heureDebut} onChange={e => setHeureDebut(e.target.value)} style={{ flex: 1 }} />
                  <span style={{ color: '#6b7280' }}>→</span>
                  <input type="time" value={heureFin} onChange={e => setHeureFin(e.target.value)} style={{ flex: 1 }} />
                </div>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Filtrer les prospects</label>
                <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}>
                  {PROSPECT_STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                {prospectCount !== null && (
                  <small style={{ color: '#4f46e5', fontWeight: 600 }}>
                    → {prospectCount} prospect(s) seront inclus dans cette campagne
                  </small>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={actionLoading === 'create' || agents.length === 0}>
                {actionLoading === 'create' ? 'Création...' : 'Créer la campagne'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Campaign list */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Chargement...</div>
      ) : campaigns.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📞</div>
          <p>Aucune campagne. Créez votre première campagne pour appeler automatiquement votre liste.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {campaigns.map(c => (
            <div key={c.id} className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <strong style={{ fontSize: 16 }}>{c.nom}</strong>
                    <span style={{
                      fontSize: 12, padding: '2px 8px', borderRadius: 20,
                      background: c.statut === 'en_cours' ? '#d1fae5' : '#f3f4f6',
                      color: STATUT_COLORS[c.statut] ?? '#374151',
                      fontWeight: 600,
                    }}>
                      {c.statut === 'en_cours' && '● '}{STATUT_LABELS[c.statut] ?? c.statut}
                    </span>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                      Agent: <strong>{c.agentNom}</strong>
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                      <span>{c.applesEffectues} / {c.totalProspects} appelés</span>
                      <span>{pct(c)}%</span>
                    </div>
                    <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct(c)}%`, height: '100%', borderRadius: 4,
                        background: c.statut === 'en_cours' ? '#059669' : '#4f46e5',
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                    <span style={{ color: '#059669' }}>✓ {c.applesReussis} intéressés/transférés</span>
                    <span style={{ color: '#6b7280' }}>⏱ {c.concurrency} simultanés</span>
                    <span style={{ color: '#6b7280' }}>🕐 {c.heureDebut}–{c.heureFin}</span>
                    {c.filtreStatut && <span style={{ color: '#6b7280' }}>🔎 filtre: {c.filtreStatut}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {c.statut === 'en_attente' || c.statut === 'pause' ? (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => doAction(c.id, 'start')}
                      disabled={actionLoading === c.id + 'start'}
                    >
                      ▶ {c.statut === 'pause' ? 'Reprendre' : 'Démarrer'}
                    </button>
                  ) : c.statut === 'en_cours' ? (
                    <>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => doAction(c.id, 'tick')}
                        disabled={!!actionLoading}
                        title="Forcer l'avancement"
                      >⟳</button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => doAction(c.id, 'pause')}
                        disabled={actionLoading === c.id + 'pause'}
                      >⏸ Pause</button>
                    </>
                  ) : null}
                  <Link href={`/campaigns/${c.id}`} className="btn btn-secondary btn-sm">Détails</Link>
                  {c.statut !== 'en_cours' && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>🗑️</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
