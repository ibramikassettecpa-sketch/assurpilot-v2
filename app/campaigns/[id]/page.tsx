'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface CampaignDetail {
  id: string; nom: string; agentId: string; statut: string
  concurrency: number; heureDebut: string; heureFin: string
  filtreStatut: string | null; totalProspects: number
  applesEffectues: number; applesReussis: number; applesEchec: number
  activeCalls: number; createdAt: string
  recentCalls: {
    id: string; statut: string; leadScore: number | null
    duree: number | null; resume: string | null; createdAt: string
    prospect: { nom: string | null; prenom: string | null; telephone: string }
  }[]
}

const STATUT_LABELS: Record<string, string> = {
  en_attente: 'En attente', en_cours: 'En cours', pause: 'En pause', termine: 'Terminée',
  initie: 'Initié', en_cours_appel: 'En cours', termine_appel: 'Terminé', echec: 'Échec',
  interesse: 'Intéressé', transfere: 'Transféré', appele: 'Appelé', refuse: 'Refusé',
}

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>()
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')

  const load = useCallback(async () => {
    const res = await fetch(`/api/campaigns/${params.id}`)
    if (!res.ok) return
    setCampaign(await res.json())
    setLoading(false)
  }, [params.id])

  useEffect(() => { load() }, [load])

  // Poll every 6s when running
  useEffect(() => {
    if (!campaign || campaign.statut !== 'en_cours') return
    const t = setInterval(load, 6000)
    return () => clearInterval(t)
  }, [campaign, load])

  async function doAction(action: 'start' | 'pause' | 'tick') {
    setActionLoading(action)
    await fetch(`/api/campaigns/${params.id}/${action}`, { method: 'POST' })
    setActionLoading('')
    load()
  }

  if (loading) return <div style={{ padding: 40, color: '#6b7280' }}>Chargement...</div>
  if (!campaign) return <div className="alert alert-error">Campagne introuvable.</div>

  const pct = campaign.totalProspects > 0
    ? Math.round((campaign.applesEffectues / campaign.totalProspects) * 100) : 0
  const tauxConnexion = campaign.applesEffectues > 0
    ? Math.round(((campaign.applesEffectues - campaign.applesEchec) / campaign.applesEffectues) * 100) : 0
  const tauxConversion = campaign.applesEffectues > 0
    ? Math.round((campaign.applesReussis / campaign.applesEffectues) * 100) : 0

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href="/campaigns" style={{ color: '#6b7280', fontSize: 13 }}>← Campagnes</Link>
        <span style={{ color: '#d1d5db' }}>/</span>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>{campaign.nom}</h1>
        <span style={{
          fontSize: 12, padding: '3px 10px', borderRadius: 20, fontWeight: 600,
          background: campaign.statut === 'en_cours' ? '#d1fae5' : campaign.statut === 'pause' ? '#fef3c7' : '#f3f4f6',
          color: campaign.statut === 'en_cours' ? '#065f46' : campaign.statut === 'pause' ? '#92400e' : '#374151',
        }}>
          {campaign.statut === 'en_cours' && '● '}{STATUT_LABELS[campaign.statut] ?? campaign.statut}
        </span>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {(campaign.statut === 'en_attente' || campaign.statut === 'pause') && (
          <button className="btn btn-primary" onClick={() => doAction('start')} disabled={!!actionLoading}>
            ▶ {campaign.statut === 'pause' ? 'Reprendre la campagne' : 'Démarrer la campagne'}
          </button>
        )}
        {campaign.statut === 'en_cours' && (
          <>
            <button className="btn btn-secondary" onClick={() => doAction('pause')} disabled={!!actionLoading}>
              ⏸ Mettre en pause
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => doAction('tick')} disabled={!!actionLoading} title="Forcer l'avancement">
              ⟳ Avancer
            </button>
          </>
        )}
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard label="Appelés" value={`${campaign.applesEffectues} / ${campaign.totalProspects}`} sub={`${pct}%`} color="#4f46e5" />
        <StatCard label="En cours" value={String(campaign.activeCalls)} sub="simultanés" color="#d97706" />
        <StatCard label="Intéressés" value={String(campaign.applesReussis)} sub={`${tauxConversion}% conversion`} color="#059669" />
        <StatCard label="Taux connexion" value={`${tauxConnexion}%`} sub={`${campaign.applesEchec} échecs`} color="#7c3aed" />
      </div>

      {/* Progress bar */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
          <span>Progression</span>
          <span style={{ fontWeight: 600 }}>{pct}%</span>
        </div>
        <div style={{ height: 12, background: '#e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{
            width: `${pct}%`, height: '100%', borderRadius: 6, transition: 'width 0.5s',
            background: campaign.statut === 'en_cours' ? '#059669' : '#4f46e5',
          }} />
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 10, fontSize: 12, color: '#6b7280' }}>
          <span>⏱ {campaign.concurrency} appels simultanés</span>
          <span>🕐 {campaign.heureDebut}–{campaign.heureFin}</span>
          {campaign.filtreStatut && <span>🔎 filtre: {campaign.filtreStatut}</span>}
        </div>
      </div>

      {/* Recent calls */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>
          Appels récents ({campaign.recentCalls.length})
          {campaign.statut === 'en_cours' && <span style={{ marginLeft: 8, fontSize: 12, color: '#059669', fontWeight: 400 }}>● mise à jour automatique</span>}
        </div>
        {campaign.recentCalls.length === 0 ? (
          <div style={{ padding: 24, color: '#6b7280', textAlign: 'center' }}>Aucun appel effectué.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Prospect</th><th>Statut</th><th>Durée</th><th>Score</th><th>Résumé</th><th>Date</th></tr>
            </thead>
            <tbody>
              {campaign.recentCalls.map(call => (
                <tr key={call.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>
                      {[call.prospect.prenom, call.prospect.nom].filter(Boolean).join(' ') || '—'}
                    </div>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#6b7280' }}>{call.prospect.telephone}</div>
                  </td>
                  <td><span className={`badge badge-${call.statut}`}>{STATUT_LABELS[call.statut] ?? call.statut}</span></td>
                  <td style={{ fontSize: 13 }}>
                    {call.duree ? `${Math.floor(call.duree / 60)}m${call.duree % 60}s` : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 30, height: 5, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${call.leadScore ?? 0}%`, height: '100%', background: '#4f46e5' }} />
                      </div>
                      <span style={{ fontSize: 11 }}>{call.leadScore ?? 0}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: '#374151', maxWidth: 240 }}>
                    {call.resume ? call.resume.slice(0, 80) + (call.resume.length > 80 ? '…' : '') : '—'}
                  </td>
                  <td style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {new Date(call.createdAt).toLocaleString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="card" style={{ borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{label}</div>
      <div style={{ fontSize: 11, color: '#9ca3af' }}>{sub}</div>
    </div>
  )
}
