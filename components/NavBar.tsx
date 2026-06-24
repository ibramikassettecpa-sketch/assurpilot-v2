'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const links = [
  { href: '/dashboard', label: 'Tableau de bord', icon: '📊' },
  { href: '/prospects', label: 'Prospects', icon: '👥' },
  { href: '/prospects/import', label: 'Importer', icon: '📥' },
  { href: '/agents', label: 'Agents IA', icon: '🤖' },
  { href: '/campaigns', label: 'Campagnes', icon: '📞' },
  { href: '/call', label: 'Appel manuel', icon: '☎️' },
  { href: '/settings/webhooks', label: 'Webhooks', icon: '🔗' },
  { href: '/settings/api-docs', label: 'API Docs', icon: '📋' },
]

export function NavBar() {
  const pathname = usePathname()

  return (
    <aside style={{
      width: 220, background: '#1a1a2e', color: '#fff', display: 'flex',
      flexDirection: 'column', flexShrink: 0,
    }}>
      <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#818cf8' }}>AssurPilot</div>
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Centre d'appels IA</div>
      </div>
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {links.map(l => {
          const active = pathname === l.href || (l.href !== '/dashboard' && pathname.startsWith(l.href))
          return (
            <Link key={l.href} href={l.href} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
              borderRadius: 7, marginBottom: 2, color: active ? '#fff' : '#9ca3af',
              background: active ? 'rgba(79,70,229,0.3)' : 'transparent',
              fontWeight: active ? 600 : 400, fontSize: 14, transition: 'all 0.15s',
            }}>
              <span>{l.icon}</span> {l.label}
            </Link>
          )
        })}
      </nav>
      <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={() => signOut({ callbackUrl: '/auth/login' })} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: 13, background: 'rgba(255,255,255,0.08)', color: '#9ca3af', border: 'none' }}>
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
