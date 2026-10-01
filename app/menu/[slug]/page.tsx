import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { resolveTheme } from '@/lib/themes'

export default async function PublicMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('slug', slug)
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

  const hasAnyItems = (items?.length ?? 0) > 0

  return (
    <div className="board-page" data-theme={resolveTheme(profile.menu_theme)}>
      <div className="board-frame">
        {profile.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.logo_url} alt="" className="board-logo" />
        )}
        <h1 className="board-title">{profile.restaurant_name}</h1>
        <p className="board-subtitle">Menu</p>

        {!hasAnyItems && <p className="board-empty">This menu is being set up — check back soon.</p>}

        {categories?.map((cat) => {
          const catItems = items?.filter((i) => i.category_id === cat.id) ?? []
          if (catItems.length === 0) return null
          return (
            <div key={cat.id} className="board-category">
              <p className="board-category-name">{cat.name}</p>
              <hr className="board-category-rule" />
              {catItems.map((item) => (
                <div key={item.id} className="menu-row">
                  {item.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt={item.name} className="menu-thumb" />
                  )}
                  <div className="menu-row-body">
                    <div className="menu-row-head">
                      <span className="menu-row-name">{item.name}</span>
                      <span className="menu-row-leader" />
                      {item.price != null && <span className="menu-row-price">₹{item.price}</span>}
                    </div>
                    {item.description && <p className="menu-row-desc">{item.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
