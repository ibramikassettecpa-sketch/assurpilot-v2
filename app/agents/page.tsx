'use client'
import { useEffect, useState } from 'react'
import AgentForm from './AgentForm'

export interface Agent {
  id: string
  nom: string
  langue: string
  modele: string
  voix: string
  messageAccueil: string
  scriptCommercial: string
  notesObjections: string
  objectif: string
  phoneNumberId: string
  transferPhone: string
  triggerPhrases: string // JSON string
  vapiAssistantId: string | null
  createdAt: string
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Agent | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/agents')
    const data = await res.json()
    setAgents(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cet agent ? Cette action est irréversible.')) return
    await fetch(`/api/agents/${id}`, { method: 'DELETE' })
    load()
  }

  const MODELE_LABELS: Record<string, string> = {
    'claude-haiku-4-5': 'Claude Haiku 4.5 ⚡',
    'claude-sonnet-4-6': 'Claude Sonnet 4.6 🎯',
    'gemini-flash': 'Gemini Flash 🌐',
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ margin: 0 }}>Agents IA</h1>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>
          + Créer un agent
        </button>
      </div>

      {(showForm || editing) && (
        <AgentForm
          agent={editing}
          onSave={() => { setShowForm(false); setEditing(null); load() }}
          onCancel={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Chargement...</div>
      ) : agents.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
          <p>Aucun agent créé. Créez votre premier agent IA pour commencer les appels.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {agents.map(agent => {
            const phrases = JSON.parse(agent.triggerPhrases || '[]') as string[]
            return (
              <div key={agent.id} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  🤖
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <strong style={{ fontSize: 16 }}>{agent.nom}</strong>
                    <span style={{ fontSize: 12, background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 20 }}>
                      {MODELE_LABELS[agent.modele] ?? agent.modele}
                    </span>
                    {agent.vapiAssistantId ? (
                      <span style={{ fontSize: 11, background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: 20 }}>✓ Vapi</span>
                    ) : (
                      <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 20 }}>⚠ Clés manquantes</span>
                    )}
                  </div>
                  <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 6 }}>
                    <em>"{agent.messageAccueil}"</em>
                  </p>
                  {agent.transferPhone && (
                    <p style={{ fontSize: 12, color: '#374151' }}>
                      📲 Transfert → <strong>{agent.transferPhone}</strong>
                      {phrases.length > 0 && <span style={{ color: '#6b7280' }}> ({phrases.length} phrase(s) déclencheur)</span>}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <a href={`/agents/${agent.id}`} className="btn btn-secondary btn-sm">
                    🔀 Transferts
                  </a>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(agent); setShowForm(false) }}>
                    ✏️ Modifier
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(agent.id)}>
                    🗑️
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
