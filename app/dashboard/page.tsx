import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  const { count: itemCount } = await supabase
    .from('menu_items')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', user!.id)

  const { count: categoryCount } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', user!.id)

  const { count: activeOrderCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', user!.id)
    .not('status', 'in', '(completed,cancelled)')

  return (
    <div className="dash-body">
      <h1 className="dash-h1">{profile?.restaurant_name ?? 'Your restaurant'}</h1>
      <p className="dash-lede">Here&apos;s how your menu looks right now.</p>

      <div className="stat-row">
        <div className="stat-pill">
          <span className="num">{activeOrderCount ?? 0}</span>
          <span className="label">Active orders</span>
        </div>
        <div className="stat-pill">
          <span className="num">{categoryCount ?? 0}</span>
          <span className="label">Categories</span>
        </div>
        <div className="stat-pill">
          <span className="num">{itemCount ?? 0}</span>
          <span className="label">Menu items</span>
        </div>
      </div>

      <Link href="/dashboard/orders" className="dash-link-card">
        <span>View orders</span>
        <span className="arrow">→</span>
      </Link>
      <Link href="/dashboard/menu" className="dash-link-card">
        <span>Manage your menu</span>
        <span className="arrow">→</span>
      </Link>
      <Link href="/dashboard/tables" className="dash-link-card">
        <span>Tables &amp; QR codes</span>
        <span className="arrow">→</span>
      </Link>
      <Link href="/dashboard/settings" className="dash-link-card">
        <span>Restaurant name, slug and logo</span>
        <span className="arrow">→</span>
      </Link>
      <a
        href={`/menu/${profile?.slug}`}
        target="_blank"
        rel="noreferrer"
        className="dash-link-card"
      >
        <span>View your public menu — /menu/{profile?.slug}</span>
        <span className="arrow">↗</span>
      </a>
    </div>
  )
}
