'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Agent { id: string; nom: string; modele: string; vapiAssistantId: string | null }
interface Prospect { id: string; nom: string | null; prenom: string | null; telephone: string; statut: string }

const MODELE_LABELS: Record<string, string> = {
  'claude-haiku-4-5': '⚡ Haiku', 'claude-sonnet-4-6': '🎯 Sonnet', 'gemini-flash': '🌐 Gemini',
}

export default function CallPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [phone, setPhone] = useState('')
  const [prospectSearch, setProspectSearch] = useState('')
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    fetch('/api/agents').then(r => r.json()).then(d => {
      if (Array.isArray(d)) { setAgents(d); if (d.length > 0) setSelectedAgent(d[0].id) }
    })
  }, [])

  useEffect(() => {
    if (prospectSearch.length < 2) { setProspects([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/prospects?search=${encodeURIComponent(prospectSearch)}&limit=10`)
      const data = await res.json()
      setProspects(data.prospects ?? [])
    }, 300)
    return () => clearTimeout(t)
  }, [prospectSearch])

  async function handleCall(e: React.FormEvent) {
    e.preventDefault()
    setResult(null)
    setLoading(true)

    const targetPhone = selectedProspect ? selectedProspect.telephone : phone.trim()
    if (!targetPhone) { setResult({ ok: false, message: 'Entrez un numéro de téléphone.' }); setLoading(false); return }
    if (!selectedAgent) { setResult({ ok: false, message: 'Sélectionnez un agent.' }); setLoading(false); return }

    // If no prospect selected, we need a prospectId — for manual calls, find or skip
    const body = selectedProspect
      ? { prospectId: selectedProspect.id, agentId: selectedAgent }
      : { phone: targetPhone, agentId: selectedAgent } // direct number call (no prospectId)

    const res = await fetch('/api/calls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setLoading(false)

    if (res.ok) {
      setResult({ ok: true, message: `Appel lancé avec succès ! ID: ${data.vapiCallId ?? data.callId}` })
    } else {
      setResult({ ok: false, message: data.error ?? 'Erreur lors du lancement de l\'appel.' })
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 className="page-title">☎️ Appel manuel</h1>

      {agents.length === 0 ? (
        <div className="alert alert-info">
          Aucun agent disponible. <Link href="/agents" style={{ color: '#4f46e5' }}>Créez un agent IA d'abord.</Link>
        </div>
      ) : (
        <div className="card">
          <form onSubmit={handleCall}>
            <div className="form-group">
              <label>Agent qui parle *</label>
              <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.nom} — {MODELE_LABELS[a.modele] ?? a.modele}
                    {!a.vapiAssistantId ? ' ⚠ (clés manquantes)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Chercher un prospect (optionnel)</label>
              <input
                value={prospectSearch}
                onChange={e => { setProspectSearch(e.target.value); setSelectedProspect(null) }}
                placeholder="Nom, prénom, téléphone..."
              />
              {prospects.length > 0 && (
                <div style={{ border: '1px solid #d1d5db', borderRadius: 6, marginTop: 4, overflow: 'hidden' }}>
                  {prospects.map(p => (
                    <div
                      key={p.id}
                      onClick={() => { setSelectedProspect(p); setPhone(p.telephone); setProspects([]); setProspectSearch(`${p.prenom ?? ''} ${p.nom ?? ''}`.trim() || p.telephone) }}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
                      onMouseOver={e => (e.currentTarget.style.background = '#f9fafb')}
                      onMouseOut={e => (e.currentTarget.style.background = '#fff')}
                    >
                      <strong>{[p.prenom, p.nom].filter(Boolean).join(' ') || '—'}</strong>
                      <span style={{ marginLeft: 10, fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{p.telephone}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Numéro de téléphone *</label>
              <input
                value={selectedProspect ? selectedProspect.telephone : phone}
                onChange={e => { setPhone(e.target.value); setSelectedProspect(null) }}
                placeholder="+33612345678"
                style={selectedProspect ? { background: '#f0fdf4', color: '#065f46' } : {}}
                required
              />
              {selectedProspect && (
                <small style={{ color: '#065f46' }}>
                  ✓ Prospect : {[selectedProspect.prenom, selectedProspect.nom].filter(Boolean).join(' ')}
                  <button type="button" onClick={() => { setSelectedProspect(null); setPhone(''); setProspectSearch('') }} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}>× effacer</button>
                </small>
              )}
            </div>

            {result && (
              <div className={`alert ${result.ok ? 'alert-success' : 'alert-error'}`}>
                {result.message}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Lancement en cours...' : '📞 Lancer l\'appel'}
            </button>
          </form>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <Link href="/prospects" style={{ color: '#4f46e5', fontSize: 13 }}>← Retour à la liste des prospects</Link>
      </div>
    </div>
  )
}
