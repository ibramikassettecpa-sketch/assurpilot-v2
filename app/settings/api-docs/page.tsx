import { NavBar } from '@/components/NavBar'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

const endpoints = [
  {
    group: 'Prospects',
    items: [
      { method: 'GET', path: '/api/prospects', desc: 'Liste paginée. Params: page, limit, statut, search, doNotCall.' },
      { method: 'POST', path: '/api/prospects', desc: 'Créer un prospect. Body: { telephone (requis), nom, prenom, email, ... }' },
      { method: 'GET', path: '/api/prospects/[id]', desc: 'Détail d\'un prospect + historique des appels.' },
      { method: 'PATCH', path: '/api/prospects/[id]', desc: 'Modifier un prospect.' },
      { method: 'DELETE', path: '/api/prospects/[id]', desc: 'Supprimer un prospect.' },
      { method: 'POST', path: '/api/import', desc: 'Importer Excel/CSV. Body: FormData { file }. Retourne { imported, skipped, errors }.' },
    ],
  },
  {
    group: 'Appels',
    items: [
      { method: 'POST', path: '/api/calls', desc: 'Lancer un appel. Body: { prospectId, agentId } ou { phone, agentId }.' },
    ],
  },
  {
    group: 'Agents IA',
    items: [
      { method: 'GET', path: '/api/agents', desc: 'Liste tous les agents.' },
      { method: 'POST', path: '/api/agents', desc: 'Créer un agent. Body: { nom, modele, voix, messageAccueil, scriptCommercial, ... }' },
      { method: 'PUT', path: '/api/agents/[id]', desc: 'Modifier un agent (sync Vapi automatique).' },
      { method: 'DELETE', path: '/api/agents/[id]', desc: 'Supprimer un agent.' },
    ],
  },
  {
    group: 'Campagnes',
    items: [
      { method: 'GET', path: '/api/campaigns', desc: 'Liste toutes les campagnes avec stats.' },
      { method: 'POST', path: '/api/campaigns', desc: 'Créer une campagne. Body: { nom, agentId, concurrency, heureDebut, heureFin, filtreStatut }.' },
      { method: 'GET', path: '/api/campaigns/[id]', desc: 'Détail + 50 appels récents.' },
      { method: 'DELETE', path: '/api/campaigns/[id]', desc: 'Supprimer une campagne (statut != en_cours requis).' },
      { method: 'POST', path: '/api/campaigns/[id]/start', desc: 'Démarrer ou reprendre.' },
      { method: 'POST', path: '/api/campaigns/[id]/pause', desc: 'Mettre en pause.' },
      { method: 'POST', path: '/api/campaigns/[id]/tick', desc: 'Forcer l\'avancement (utile en dev).' },
    ],
  },
  {
    group: 'Webhooks sortants',
    items: [
      { method: 'GET', path: '/api/webhooks/config', desc: 'Liste les endpoints enregistrés (secret masqué).' },
      { method: 'POST', path: '/api/webhooks/config', desc: 'Enregistrer un endpoint. Body: { url }. Retourne { secret } — à copier immédiatement.' },
      { method: 'PATCH', path: '/api/webhooks/config/[id]', desc: 'Activer/désactiver. Body: { actif: boolean }.' },
      { method: 'DELETE', path: '/api/webhooks/config/[id]', desc: 'Supprimer un endpoint.' },
    ],
  },
  {
    group: 'Webhooks entrants (Vapi)',
    items: [
      { method: 'POST', path: '/api/webhooks/vapi', desc: 'Réception des événements Vapi : end-of-call-report, status-update, tool-calls, transfer-destination-request.' },
      { method: 'POST', path: '/api/webhooks/test', desc: '[Dev] Simuler la fin d\'un appel. Body: { callId, outcome: transfere|interesse|appele|refuse }.' },
    ],
  },
  {
    group: 'Tableau de bord',
    items: [
      { method: 'GET', path: '/api/dashboard', desc: 'KPIs du jour : appels, transferts, taux connexion/conversion, durée moyenne, campagnes actives, graphe 7 jours, répartition prospects.' },
    ],
  },
]

const METHOD_COLORS: Record<string, string> = {
  GET: '#059669', POST: '#4f46e5', PUT: '#d97706', PATCH: '#0891b2', DELETE: '#dc2626',
}

export default async function ApiDocsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <NavBar />
      <main style={{ flex: 1, padding: '24px 28px', overflow: 'auto' }}>
        <h1 className="page-title">Documentation API</h1>

        <div className="card" style={{ marginBottom: 20, background: '#fffbeb', border: '1px solid #fde68a' }}>
          <div style={{ fontSize: 13, color: '#92400e' }}>
            Toutes les routes nécessitent une session authentifiée (cookie <code>next-auth.session-token</code>).
            Format : <strong>JSON</strong>. Base URL : votre domaine de déploiement.
          </div>
        </div>

        {endpoints.map(group => (
          <div key={group.group} className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontWeight: 700, fontSize: 14 }}>
              {group.group}
            </div>
            <table>
              <tbody>
                {group.items.map(item => (
                  <tr key={item.path + item.method}>
                    <td style={{ width: 70 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
                        color: METHOD_COLORS[item.method] ?? '#374151',
                      }}>
                        {item.method}
                      </span>
                    </td>
                    <td style={{ width: 280 }}>
                      <code style={{ fontSize: 12, color: '#374151' }}>{item.path}</code>
                    </td>
                    <td style={{ fontSize: 13, color: '#6b7280' }}>{item.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {/* Webhook payload example */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Payload des webhooks sortants</div>
          <pre style={{ background: '#1e293b', color: '#e2e8f0', padding: 16, borderRadius: 8, fontSize: 12, overflow: 'auto' }}>
{`POST https://votre-serveur.com/webhook
X-AssurPilot-Signature: sha256=<hmac-sha256>
X-AssurPilot-Event: lead.transferred
Content-Type: application/json

{
  "event": "lead.transferred",
  "timestamp": "2025-05-10T14:32:00.000Z",
  "data": {
    "callId": "clxxx...",
    "prospectId": "clyyy...",
    "prospectTelephone": "+33612345678",
    "prospectNom": "Jean Dupont",
    "duree": 142,
    "leadScore": 85,
    "resume": "Prospect très intéressé par l'assurance habitation."
  }
}`}
          </pre>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 10 }}>
            Vérification de la signature :<br />
            <code>expected = "sha256=" + HMAC_SHA256(secret, requestBody)</code><br />
            Comparer avec <code>X-AssurPilot-Signature</code> (comparaison timing-safe recommandée).
          </div>
        </div>
      </main>
    </div>
  )
}
