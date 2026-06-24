'use client'
import { useState } from 'react'
import type { Agent } from './page'

const MODELES = [
  { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 — Rapide & économique (recommandé)' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 — Meilleure gestion des objections' },
  { value: 'gemini-flash', label: 'Gemini Flash — Multilingue / Français natif' },
]

const VOIX = [
  { value: 'charlotte', label: 'Charlotte (française, féminine)' },
  { value: 'thomas', label: 'Thomas (français, masculin)' },
  { value: 'alice', label: 'Alice (française, féminine)' },
  { value: 'sarah', label: 'Sarah (française, féminine)' },
]

interface Props {
  agent: Agent | null
  onSave: () => void
  onCancel: () => void
}

export default function AgentForm({ agent, onSave, onCancel }: Props) {
  const existing = agent
  const [nom, setNom] = useState(existing?.nom ?? '')
  const [modele, setModele] = useState(existing?.modele ?? 'claude-haiku-4-5')
  const [voix, setVoix] = useState(existing?.voix ?? 'charlotte')
  const [messageAccueil, setMessageAccueil] = useState(
    existing?.messageAccueil ?? "Bonjour, je m'appelle Sophie et j'appelle de la part d'AssurPilot. Est-ce que vous avez quelques minutes ?"
  )
  const [scriptCommercial, setScriptCommercial] = useState(
    existing?.scriptCommercial ?? "Vous êtes un agent commercial qui propose des offres d'assurance. Soyez professionnel, à l'écoute et persuasif."
  )
  const [notesObjections, setNotesObjections] = useState(existing?.notesObjections ?? '')
  const [objectif, setObjectif] = useState(existing?.objectif ?? "Prendre rendez-vous avec le prospect ou l'intéresser à notre offre d'assurance.")
  const [transferPhone, setTransferPhone] = useState(existing?.transferPhone ?? '')
  const [triggerPhrases, setTriggerPhrases] = useState<string[]>(
    existing ? JSON.parse(existing.triggerPhrases || '[]') : [
      "je suis intéressé",
      "je veux m'abonner",
      "je peux parler à un conseiller",
      "c'est quoi le prix",
    ]
  )
  const [newPhrase, setNewPhrase] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')

  function addPhrase() {
    const p = newPhrase.trim()
    if (p && !triggerPhrases.includes(p)) {
      setTriggerPhrases([...triggerPhrases, p])
    }
    setNewPhrase('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setWarning('')
    setLoading(true)

    const payload = {
      nom, modele, voix, messageAccueil, scriptCommercial,
      notesObjections, objectif, transferPhone, triggerPhrases,
      langue: 'fr',
    }

    const res = await fetch(existing ? `/api/agents/${existing.id}` : '/api/agents', {
      method: existing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Erreur lors de la sauvegarde.')
      return
    }

    const data = await res.json()
    if (data.vapiWarning) setWarning(data.vapiWarning)
    else onSave()
  }

  return (
    <div className="card" style={{ marginBottom: 24, border: '2px solid #4f46e5' }}>
      <h2 style={{ fontSize: 18, marginBottom: 20 }}>
        {existing ? '✏️ Modifier l\'agent' : '🤖 Créer un agent IA'}
      </h2>

      {error && <div className="alert alert-error">{error}</div>}
      {warning && (
        <div className="alert alert-info">
          ⚠️ {warning}
          <br /><button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={onSave}>Fermer quand même</button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label>Nom de l'agent *</label>
            <input value={nom} onChange={e => setNom(e.target.value)} required placeholder="Ex: Sophie — Assurance Auto" />
          </div>
          <div className="form-group">
            <label>Modèle IA *</label>
            <select value={modele} onChange={e => setModele(e.target.value)}>
              {MODELES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Voix</label>
            <select value={voix} onChange={e => setVoix(e.target.value)}>
              {VOIX.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Numéro de transfert (humain)</label>
            <input value={transferPhone} onChange={e => setTransferPhone(e.target.value)} placeholder="+33612345678" />
            <small style={{ color: '#6b7280' }}>Format E.164 — l'appel sera transféré ici sur déclencheur</small>
          </div>
        </div>

        <div className="form-group">
          <label>Message d'accueil (1ère phrase prononcée) *</label>
          <textarea value={messageAccueil} onChange={e => setMessageAccueil(e.target.value)} required rows={2} />
        </div>

        <div className="form-group">
          <label>Script commercial (prompt système) *</label>
          <textarea value={scriptCommercial} onChange={e => setScriptCommercial(e.target.value)} required rows={5} placeholder="Décrivez le rôle de l'agent, le produit, le ton à adopter..." />
        </div>

        <div className="form-group">
          <label>Notes de traitement des objections</label>
          <textarea value={notesObjections} onChange={e => setNotesObjections(e.target.value)} rows={3} placeholder="Ex: Si le prospect dit qu'il n'a pas le temps → demander un rappel. Si trop cher → expliquer les économies..." />
        </div>

        <div className="form-group">
          <label>Objectif de l'appel</label>
          <input value={objectif} onChange={e => setObjectif(e.target.value)} placeholder="Ex: Décrocher un rendez-vous ou une souscription" />
        </div>

        {/* Trigger phrases */}
        <div className="form-group">
          <label>Phrases déclencheurs de transfert</label>
          <small style={{ display: 'block', color: '#6b7280', marginBottom: 8 }}>
            Quand le prospect dit l'une de ces phrases, l'appel est transféré au numéro humain configuré ci-dessus.
          </small>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {triggerPhrases.map((p, i) => (
              <span key={i} style={{ background: '#ede9fe', color: '#4f46e5', padding: '4px 10px', borderRadius: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                "{p}"
                <button type="button" onClick={() => setTriggerPhrases(triggerPhrases.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', fontWeight: 700, padding: 0 }}>×</button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={newPhrase} onChange={e => setNewPhrase(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPhrase() } }}
              placeholder="Ajouter une phrase déclencheur..."
              style={{ flex: 1 }}
            />
            <button type="button" className="btn btn-secondary" onClick={addPhrase}>Ajouter</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Annuler</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Sauvegarde...' : (existing ? 'Mettre à jour' : 'Créer l\'agent')}
          </button>
        </div>
      </form>
    </div>
  )
}
