import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

const STATUT_LABELS: Record<string, string> = {
  nouveau: 'Nouveau', en_appel: 'En appel', appele: 'Appelé',
  interesse: 'Intéressé', transfere: 'Transféré', refuse: 'Refusé',
}

export default async function ProspectDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const prospect = await prisma.prospect.findUnique({
    where: { id: params.id },
    include: { calls: { orderBy: { createdAt: 'desc' } } },
  })
  if (!prospect) notFound()

  const customFields = JSON.parse(prospect.customFields || '{}') as Record<string, unknown>
  const hasCustom = Object.keys(customFields).length > 0

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href="/prospects" style={{ color: '#6b7280', fontSize: 13 }}>← Prospects</Link>
        <span style={{ color: '#d1d5db' }}>/</span>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>
          {[prospect.prenom, prospect.nom].filter(Boolean).join(' ') || prospect.telephone}
        </h1>
        <span className={`badge badge-${prospect.statut}`}>{STATUT_LABELS[prospect.statut] ?? prospect.statut}</span>
        {prospect.doNotCall && <span style={{ fontSize: 12, color: '#b91c1c', background: '#fee2e2', padding: '2px 8px', borderRadius: 20 }}>⛔ Ne pas appeler</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Informations principales */}
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: 15, color: '#374151' }}>Informations</h3>
          <dl style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 10 }}>
            <Field label="Prénom" value={prospect.prenom} />
            <Field label="Nom" value={prospect.nom} />
            <Field label="Téléphone" value={prospect.telephone} mono />
            <Field label="Date de naissance" value={prospect.dateNaissance} />
            <Field label="Email" value={prospect.email} />
            <Field label="Société" value={prospect.societe} />
            <Field label="Adresse" value={prospect.adresse} />
            <Field label="Ville" value={prospect.ville} />
            <Field label="Code postal" value={prospect.codePostal} />
          </dl>
        </div>

        {/* Notes + score */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <h3 style={{ marginBottom: 12, fontSize: 15, color: '#374151' }}>Score & Statut</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1, height: 10, background: '#e5e7eb', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ width: `${prospect.leadScore}%`, height: '100%', background: '#4f46e5' }} />
              </div>
              <strong>{prospect.leadScore} / 100</strong>
            </div>
            <p style={{ fontSize: 13, color: '#6b7280' }}>Importé le {new Date(prospect.createdAt).toLocaleDateString('fr-FR')}</p>
          </div>
          {prospect.notes && (
            <div className="card">
              <h3 style={{ marginBottom: 8, fontSize: 15, color: '#374151' }}>Notes</h3>
              <p style={{ color: '#374151', whiteSpace: 'pre-wrap', fontSize: 14 }}>{prospect.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Custom fields */}
      {hasCustom && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 16, fontSize: 15, color: '#374151' }}>Champs personnalisés</h3>
          <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {Object.entries(customFields).map(([key, val]) => (
              <div key={key} style={{ background: '#f9fafb', padding: '10px 14px', borderRadius: 8 }}>
                <dt style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 2 }}>{key}</dt>
                <dd style={{ fontSize: 14, color: '#1a1a2e' }}>{String(val) || '—'}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Call history */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 16, fontSize: 15, color: '#374151' }}>Historique des appels ({prospect.calls.length})</h3>
        {prospect.calls.length === 0 ? (
          <p style={{ color: '#6b7280' }}>Aucun appel enregistré pour ce prospect.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Date</th><th>Statut</th><th>Durée</th><th>Score</th><th>Résumé</th></tr>
            </thead>
            <tbody>
              {prospect.calls.map(call => (
                <tr key={call.id}>
                  <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{new Date(call.createdAt).toLocaleString('fr-FR')}</td>
                  <td><span className={`badge badge-${call.statut}`}>{call.statut}</span></td>
                  <td>{call.duree ? `${Math.floor(call.duree / 60)}m ${call.duree % 60}s` : '—'}</td>
                  <td>{call.leadScore ?? '—'}</td>
                  <td style={{ fontSize: 13, color: '#374151', maxWidth: 300 }}>{call.resume ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <>
      <dt style={{ fontWeight: 500, color: '#6b7280', fontSize: 13 }}>{label}</dt>
      <dd style={{ fontFamily: mono ? 'monospace' : 'inherit', fontSize: 14 }}>{value || <span style={{ color: '#9ca3af' }}>—</span>}</dd>
    </>
  )
}
