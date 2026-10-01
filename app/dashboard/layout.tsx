import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SignOutButton from './sign-out-button'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div>
      <div className="dash-topbar">
        <div className="dash-topbar-inner">
          <Link href="/dashboard" className="dash-brand">
            Board
          </Link>
          <nav>
            <Link href="/dashboard">Overview</Link>
            <Link href="/dashboard/orders">Orders</Link>
            <Link href="/dashboard/menu">Menu</Link>
            <Link href="/dashboard/tables">Tables</Link>
            <Link href="/dashboard/settings">Settings</Link>
            <SignOutButton />
          </nav>
        </div>
      </div>
      <main>{children}</main>
    </div>
  )
}
