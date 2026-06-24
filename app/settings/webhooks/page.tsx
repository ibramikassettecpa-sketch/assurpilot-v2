'use client'
import { useEffect, useState, useCallback } from 'react'

interface WebhookConfig {
  id: string
  url: string
  secret: string
  actif: boolean
  createdAt: string
}

export default function WebhooksPage() {
  const [configs, setConfigs] = useState<WebhookConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/webhooks/config')
    if (res.ok) setConfigs(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setNewSecret(null)
    setCreating(true)
    const res = await fetch('/api/webhooks/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    setCreating(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Erreur'); return }
    const data = await res.json()
    setNewSecret(data.secret)
    setUrl('')
    load()
  }

  async function handleToggle(id: string, actif: boolean) {
    await fetch(`/api/webhooks/config/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif: !actif }),
    })
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce webhook ?')) return
    await fetch(`/api/webhooks/config/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <h1 className="page-title">Webhooks sortants</h1>

      <div className="card" style={{ marginBottom: 20, background: '#f0f9ff', border: '1px solid #bae6fd' }}>
        <div style={{ fontSize: 13, color: '#0369a1', lineHeight: 1.6 }}>
          <strong>Comment ça marche :</strong> AssurPilot envoie une requête <code>POST</code> signée à votre URL pour chaque événement.
          Vérifiez la signature avec l'en-tête <code>X-AssurPilot-Signature</code> (HMAC-SHA256 du corps).<br />
          <strong>Événements :</strong> <code>call.ended</code> · <code>lead.transferred</code> · <code>lead.qualified</code>
        </div>
      </div>

      {/* Create form */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Ajouter un endpoint</h2>
        {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
        {newSecret && (
          <div className="alert" style={{ marginBottom: 12, background: '#d1fae5', border: '1px solid #6ee7b7', color: '#065f46' }}>
            <strong>Clé secrète (copiez-la maintenant, elle ne sera plus affichée) :</strong><br />
            <code style={{ fontSize: 12, wordBreak: 'break-all' }}>{newSecret}</code>
          </div>
        )}
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 10 }}>
          <input
            value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://votre-serveur.com/webhook"
            required style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? 'Ajout...' : '+ Ajouter'}
          </button>
        </form>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ color: '#6b7280', padding: 20 }}>Chargement...</div>
      ) : configs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>
          Aucun webhook configuré.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {configs.map(c => (
            <div key={c.id} className="card" style={{ opacity: c.actif ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, wordBreak: 'break-all' }}>{c.url}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                    Secret : <code>{c.secret}</code> · Créé le {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 600,
                  background: c.actif ? '#d1fae5' : '#f3f4f6',
                  color: c.actif ? '#065f46' : '#6b7280',
                }}>
                  {c.actif ? 'Actif' : 'Inactif'}
                </span>
                <button className="btn btn-secondary btn-sm" onClick={() => handleToggle(c.id, c.actif)}>
                  {c.actif ? 'Désactiver' : 'Activer'}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
