'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Category = { id: string; name: string; sort_order: number }
type MenuItem = {
  id: string
  category_id: string
  name: string
  description: string | null
  price: number | null
  image_url: string | null
}

export default function OrderClient({
  ownerId,
  ownerName,
  logoUrl,
  theme,
  tableId,
  tableNumber,
  categories,
  items,
}: {
  ownerId: string
  ownerName: string
  logoUrl: string | null
  theme: string
  tableId: string
  tableNumber: string
  categories: Category[]
  items: MenuItem[]
}) {
  const supabase = createClient()
  const [cart, setCart] = useState<Record<string, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function changeQty(itemId: string, delta: number) {
    setCart((prev) => {
      const next = { ...prev }
      const current = next[itemId] ?? 0
      const updated = Math.max(0, current + delta)
      if (updated === 0) {
        delete next[itemId]
      } else {
        next[itemId] = updated
      }
      return next
    })
  }

  const cartEntries = Object.entries(cart)
  const itemCount = cartEntries.reduce((sum, [, qty]) => sum + qty, 0)
  const total = cartEntries.reduce((sum, [id, qty]) => {
    const item = items.find((i) => i.id === id)
    return sum + (item?.price ?? 0) * qty
  }, 0)

  async function placeOrder() {
    if (itemCount === 0) return
    setSubmitting(true)
    setError(null)

    const newOrderId = crypto.randomUUID()

    const { error: orderError } = await supabase
      .from('orders')
      .insert({ id: newOrderId, owner_id: ownerId, table_id: tableId, status: 'pending' })

    if (orderError) {
      setError('Could not send your order. Please try again.')
      setSubmitting(false)
      console.error(orderError)
      return
    }

    const orderItems = cartEntries.map(([itemId, qty]) => {
      const item = items.find((i) => i.id === itemId)!
      return {
        order_id: newOrderId,
        menu_item_id: item.id,
        name_snapshot: item.name,
        price_snapshot: item.price,
        quantity: qty,
      }
    })

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)

    if (itemsError) {
      setError('Could not send your order. Please try again.')
      setSubmitting(false)
      console.error(itemsError)
      return
    }

    setSubmitting(false)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="board-page" data-theme={theme}>
        <div className="order-success">
          <h1>Order sent</h1>
          <p>Table {tableNumber} — the kitchen has your order.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="board-page" data-theme={theme} style={{ paddingBottom: itemCount > 0 ? 100 : 60 }}>
      <div className="board-frame">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="board-logo" />
        )}
        <h1 className="board-title">{ownerName}</h1>
        <p className="board-subtitle">Table {tableNumber} — tap + to add an item</p>

        {items.length === 0 && <p className="board-empty">This menu is being set up — check back soon.</p>}

        {categories.map((cat) => {
          const catItems = items.filter((i) => i.category_id === cat.id)
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
                  <div className="qty-control">
                    <button className="qty-btn" onClick={() => changeQty(item.id, -1)} aria-label={`Remove one ${item.name}`}>
                      −
                    </button>
                    <span className="qty-count">{cart[item.id] ?? 0}</span>
                    <button className="qty-btn" onClick={() => changeQty(item.id, 1)} aria-label={`Add one ${item.name}`}>
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        })}

        {error && (
          <p style={{ color: '#e08a6f', textAlign: 'center', marginTop: 16 }}>{error}</p>
        )}
      </div>

      {itemCount > 0 && (
        <div className="order-fab-bar">
          <span className="order-fab-total">
            {itemCount} item{itemCount > 1 ? 's' : ''} — ₹{total.toFixed(2)}
          </span>
          <button onClick={placeOrder} disabled={submitting} className="btn btn-accent">
            {submitting ? 'Sending…' : 'Place order'}
          </button>
        </div>
      )}
    </div>
  )
}
