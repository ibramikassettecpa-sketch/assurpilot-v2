import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { NavBar } from '@/components/NavBar'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <NavBar />
      <main style={{ flex: 1, padding: '24px 28px', overflow: 'auto' }}>{children}</main>
    </div>
  )
}
