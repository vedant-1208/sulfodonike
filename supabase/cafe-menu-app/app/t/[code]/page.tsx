import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import OrderClient from './order-client'
import { resolveTheme } from '@/lib/themes'

export default async function TableOrderPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const supabase = await createClient()

  const { data: table } = await supabase
    .from('tables')
    .select('*')
    .eq('code', code)
    .single()

  if (!table) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', table.owner_id)
    .single()

  if (!profile) notFound()

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('owner_id', profile.id)
    .order('sort_order')

  const { data: items } = await supabase
    .from('menu_items')
    .select('*')
    .eq('owner_id', profile.id)
    .eq('is_available', true)
    .order('sort_order')

  return (
    <OrderClient
      ownerId={profile.id}
      ownerName={profile.restaurant_name ?? 'Menu'}
      logoUrl={profile.logo_url}
      theme={resolveTheme(profile.menu_theme)}
      tableId={table.id}
      tableNumber={table.table_number}
      categories={categories ?? []}
      items={items ?? []}
    />
  )
}
