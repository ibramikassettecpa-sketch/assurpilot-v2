'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface DashStats {
  totalProspects: number
  totalAgents: number
  appelsAujourdhui: number
  transfertsAujourdhui: number
  interessesAujourdhui: number
  tauxConnexion: number
  tauxConversion: number
  dureeMoyenne: number
  campaignesEnCours: number
  appelsSemaine: { day: string; count: number }[]
  prospectsParStatut: { statut: string; count: number }[]
}

const STATUT_LABELS: Record<string, string> = {
  nouveau: 'Nouveau', appele: 'Appelé', interesse: 'Intéressé',
  transfere: 'Transféré', refuse: 'Refusé', ne_pas_appeler: 'Ne pas appeler',
}
const STATUT_COLORS: Record<string, string> = {
  nouveau: '#6366f1', appele: '#d97706', interesse: '#059669',
  transfere: '#0891b2', refuse: '#dc2626', ne_pas_appeler: '#6b7280',
}

function fmtDuree(s: number) {
  if (!s) return '—'
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`
}

function MiniBar({ day, count, max }: { day: string; count: number; max: number }) {
  const h = max > 0 ? Math.max(4, Math.round((count / max) * 80)) : 4
  const d = new Date(day + 'T00:00:00')
  const label = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{count}</div>
      <div style={{ height: 80, display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ width: 24, height: h, background: '#4f46e5', borderRadius: '3px 3px 0 0' }} />
      </div>
      <div style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', whiteSpace: 'nowrap' }}>{label}</div>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashStats | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await fetch('/api/dashboard')
    if (res.ok) setStats(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Refresh every 30s if campaigns running
  useEffect(() => {
    if (!stats?.campaignesEnCours) return
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [stats?.campaignesEnCours, load])

  if (loading) return <div style={{ padding: 40, color: '#6b7280' }}>Chargement...</div>
  if (!stats) return null

  const maxSemaine = Math.max(...stats.appelsSemaine.map(d => d.count), 1)
  const totalStatuts = stats.prospectsParStatut.reduce((acc, r) => acc + r.count, 0)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ margin: 0 }}>Tableau de bord</h1>
        <span style={{ fontSize: 13, color: '#6b7280' }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>

      {/* Top KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        <KpiCard label="Appels aujourd'hui" value={String(stats.appelsAujourdhui)} color="#4f46e5" icon="📞" />
        <KpiCard label="Transferts" value={String(stats.transfertsAujourdhui)} color="#0891b2" icon="🔀" />
        <KpiCard label="Intéressés" value={String(stats.interessesAujourdhui)} color="#059669" icon="✅" />
        <KpiCard label="Taux connexion" value={`${stats.tauxConnexion}%`} color="#d97706" icon="📡" />
        <KpiCard label="Taux conversion" value={`${stats.tauxConversion}%`} color="#7c3aed" icon="🎯" />
        <KpiCard label="Durée moyenne" value={fmtDuree(stats.dureeMoyenne)} color="#059669" icon="⏱" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Weekly chart */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14 }}>Appels — 7 derniers jours</div>
          {stats.appelsSemaine.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 20 }}>Aucun appel cette semaine.</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
              {stats.appelsSemaine.map(d => (
                <MiniBar key={d.day} day={d.day} count={Number(d.count)} max={maxSemaine} />
              ))}
            </div>
          )}
        </div>

        {/* Campaigns status */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>État</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <InfoRow label="Prospects total" value={String(stats.totalProspects)} href="/prospects" />
            <InfoRow label="Agents IA" value={String(stats.totalAgents)} href="/agents" />
            <InfoRow
              label="Campagnes actives"
              value={String(stats.campaignesEnCours)}
              href="/campaigns"
              highlight={stats.campaignesEnCours > 0}
            />
          </div>
        </div>
      </div>

      {/* Prospects by status */}
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>Répartition des prospects</div>
        {totalStatuts === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: 13 }}>
            Aucun prospect. <Link href="/prospects/import" style={{ color: '#4f46e5' }}>Importez votre liste.</Link>
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.prospectsParStatut.map(r => {
              const pct = Math.round((r.count / totalStatuts) * 100)
              const color = STATUT_COLORS[r.statut] ?? '#9ca3af'
              return (
                <div key={r.statut}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                    <span style={{ color: '#374151' }}>{STATUT_LABELS[r.statut] ?? r.statut}</span>
                    <span style={{ color: '#6b7280' }}>{r.count} ({pct}%)</span>
                  </div>
                  <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function KpiCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <div className="card" style={{ borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 22, marginBottom: 2 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function InfoRow({ label, value, href, highlight }: { label: string; value: string; href: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <Link href={href} style={{
        fontWeight: 700, color: highlight ? '#059669' : '#374151',
        background: highlight ? '#d1fae5' : '#f3f4f6',
        padding: '2px 8px', borderRadius: 12, textDecoration: 'none',
      }}>
        {value}
      </Link>
    </div>
  )
}
