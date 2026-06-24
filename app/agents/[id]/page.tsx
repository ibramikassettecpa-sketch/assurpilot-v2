'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Agent } from '../page'

export default function AgentDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const [phrases, setPhrases] = useState<string[]>([])
  const [newPhrase, setNewPhrase] = useState('')
  const [transferPhone, setTransferPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/agents/${params.id}`)
      .then(r => r.json())
      .then(data => {
        setAgent(data)
        setPhrases(JSON.parse(data.triggerPhrases || '[]'))
        setTransferPhone(data.transferPhone || '')
        setLoading(false)
      })
  }, [params.id])

  function addPhrase() {
    const p = newPhrase.trim().toLowerCase()
    if (p && !phrases.includes(p)) setPhrases(prev => [...prev, p])
    setNewPhrase('')
  }

  function removePhrase(i: number) {
    setPhrases(prev => prev.filter((_, j) => j !== i))
  }

  async function saveRules() {
    setSaving(true)
    setError('')
    setSaved(false)
    const res = await fetch(`/api/agents/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ triggerPhrases: phrases, transferPhone }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Erreur lors de la sauvegarde.')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  if (loading) return <div style={{ padding: 40, color: '#6b7280' }}>Chargement...</div>
  if (!agent) return <div className="alert alert-error">Agent introuvable.</div>

  const MODELE_LABELS: Record<string, string> = {
    'claude-haiku-4-5': 'Claude Haiku 4.5 ⚡',
    'claude-sonnet-4-6': 'Claude Sonnet 4.6 🎯',
    'gemini-flash': 'Gemini Flash 🌐',
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href="/agents" style={{ color: '#6b7280', fontSize: 13 }}>← Agents IA</Link>
        <span style={{ color: '#d1d5db' }}>/</span>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>{agent.nom}</h1>
        <span style={{ fontSize: 12, background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 20 }}>
          {MODELE_LABELS[agent.modele] ?? agent.modele}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Transfer rules */}
        <div className="card" style={{ border: '2px solid #4f46e5' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>🔀 Règles de transfert</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
            Quand l'IA détecte l'une de ces phrases dans la conversation, elle transfère immédiatement l'appel vers le numéro humain configuré — avec un résumé de la conversation.
          </p>

          {error && <div className="alert alert-error">{error}</div>}
          {saved && <div className="alert alert-success">✓ Règles sauvegardées et synchronisées avec Vapi.</div>}

          <div className="form-group">
            <label>Numéro de transfert (humain)</label>
            <input
              value={transferPhone}
              onChange={e => setTransferPhone(e.target.value)}
              placeholder="+33612345678"
            />
            <small style={{ color: '#6b7280', fontSize: 12 }}>
              Format E.164. L'appel sera chaudement transféré avec un résumé de la conversation.
            </small>
          </div>

          <div className="form-group">
            <label>Phrases déclencheurs ({phrases.length})</label>
            <small style={{ display: 'block', color: '#6b7280', fontSize: 12, marginBottom: 10 }}>
              L'IA transfère dès qu'elle détecte une formulation équivalente à l'une de ces phrases.
            </small>

            {phrases.length === 0 && (
              <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 10, fontStyle: 'italic' }}>
                Aucune phrase configurée — l'appel ne sera jamais transféré automatiquement.
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {phrases.map((p, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#f5f3ff', border: '1px solid #ede9fe',
                  borderRadius: 8, padding: '8px 14px',
                }}>
                  <span style={{ fontSize: 14 }}>"{p}"</span>
                  <button
                    onClick={() => removePhrase(i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', fontWeight: 700, fontSize: 16, padding: '0 4px' }}
                  >×</button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={newPhrase}
                onChange={e => setNewPhrase(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPhrase() } }}
                placeholder="Ex: je suis intéressé..."
                style={{ flex: 1 }}
              />
              <button type="button" className="btn btn-secondary" onClick={addPhrase}>Ajouter</button>
            </div>
          </div>

          <button className="btn btn-primary" onClick={saveRules} disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
            {saving ? 'Sauvegarde...' : '💾 Sauvegarder les règles'}
          </button>
        </div>

        {/* Agent info + script preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <h3 style={{ fontSize: 15, marginBottom: 12 }}>Message d'accueil</h3>
            <p style={{ fontStyle: 'italic', color: '#374151', background: '#f9fafb', padding: '10px 14px', borderRadius: 8, fontSize: 14 }}>
              "{agent.messageAccueil}"
            </p>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 15, marginBottom: 12 }}>Script commercial</h3>
            <p style={{ color: '#374151', whiteSpace: 'pre-wrap', fontSize: 13, maxHeight: 200, overflow: 'auto' }}>
              {agent.scriptCommercial}
            </p>
          </div>

          {agent.notesObjections && (
            <div className="card">
              <h3 style={{ fontSize: 15, marginBottom: 8 }}>Notes objections</h3>
              <p style={{ color: '#374151', whiteSpace: 'pre-wrap', fontSize: 13 }}>{agent.notesObjections}</p>
            </div>
          )}

          <div className="card">
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>Statut Vapi</h3>
            {agent.vapiAssistantId ? (
              <div>
                <span style={{ fontSize: 12, background: '#d1fae5', color: '#065f46', padding: '4px 10px', borderRadius: 20 }}>
                  ✓ Synchronisé — ID: {agent.vapiAssistantId.slice(0, 8)}...
                </span>
                <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                  Webhook URL à configurer dans Vapi :<br />
                  <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
                    {process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/webhooks/vapi
                  </code>
                </p>
              </div>
            ) : (
              <span style={{ fontSize: 12, background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: 20 }}>
                ⚠ Non synchronisé — ajoutez vos clés API dans .env
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
        <Link href="/agents" className="btn btn-secondary">← Retour aux agents</Link>
        <button className="btn btn-danger btn-sm" onClick={async () => {
          if (!confirm('Supprimer cet agent ?')) return
          await fetch(`/api/agents/${agent.id}`, { method: 'DELETE' })
          router.push('/agents')
        }}>🗑️ Supprimer l'agent</button>
      </div>
    </div>
  )
}
