'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { registerServiceWorker, showOrderNotification, subscribeToPush } from '@/lib/notify'

type OrderItem = {
  id: string
  name_snapshot: string
  price_snapshot: number | null
  quantity: number
}
type Order = {
  id: string
  table_id: string
  status: string
  created_at: string
  order_items: OrderItem[]
}
type TableInfo = { id: string; table_number: string }

const STATUS_FLOW = ['pending', 'preparing', 'ready', 'completed'] as const

function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
  } catch {
    // Web Audio not available - fail silently
  }
}

export default function OrdersPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<Order[]>([])
  const [tablesMap, setTablesMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [notifStatus, setNotifStatus] = useState<NotificationPermission | 'unsupported'>('default')
  const userIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setNotifStatus(Notification.permission)
    } else {
      setNotifStatus('unsupported')
    }

    registerServiceWorker()

    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function setup() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      if (cancelled) return
      userIdRef.current = user.id

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        subscribeToPush(supabase, user.id)
      }

      const { data: tables } = await supabase
        .from('tables')
        .select('id, table_number')
        .eq('owner_id', user.id)
      if (cancelled) return

      const map: Record<string, string> = {}
      ;(tables ?? []).forEach((t: TableInfo) => (map[t.id] = t.table_number))
      setTablesMap(map)

      await loadOrders(user.id)
      if (cancelled) return

      channel = supabase
        .channel(`orders-live-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'orders', filter: `owner_id=eq.${user.id}` },
          (payload) => {
            playChime()
            const tableId = (payload.new as any).table_id
            const tableNumber = map[tableId] ?? '?'
            showOrderNotification('New order', `Table ${tableNumber} just ordered`)
            loadOrders(user.id)
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: `owner_id=eq.${user.id}` },
          () => loadOrders(user.id)
        )
        .subscribe((status, err) => {
          console.log('Realtime channel status:', status, err ?? '')
        })
    }

    setup()

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && userIdRef.current) {
        // Mobile browsers pause the realtime connection while the tab is
        // backgrounded, so anything that arrived during that time can be
        // missed. Catch up the instant the tab becomes visible again.
        loadOrders(userIdRef.current)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleVisibilityChange)

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleVisibilityChange)
    }
  }, [])

  async function loadOrders(ownerId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('owner_id', ownerId)
      .neq('status', 'completed')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })

    if (error) console.error(error)
    setOrders((data as unknown as Order[]) ?? [])
    setLoading(false)
  }

  async function setStatus(orderId: string, status: string) {
    await supabase.from('orders').update({ status }).eq('id', orderId)
    if (userIdRef.current) loadOrders(userIdRef.current)
  }

  async function requestNotifications() {
    if (typeof Notification === 'undefined') return
    const perm = await Notification.requestPermission()
    setNotifStatus(perm)

    if (perm === 'granted' && userIdRef.current) {
      const result = await subscribeToPush(supabase, userIdRef.current)
      if (!result.ok) {
        console.error('Push subscription did not complete:', result.reason)
      }
    }
  }

  if (loading) return <div className="dash-body">Loading orders…</div>

  return (
    <div className="dash-body">
      <h1 className="dash-h1">Orders</h1>
      <p className="dash-lede">New orders appear here the moment a customer submits one.</p>

      {notifStatus !== 'granted' && notifStatus !== 'unsupported' && (
        <div className="notif-banner">
          <span>Turn on notifications to get alerted the instant an order comes in — even in another tab.</span>
          <button onClick={requestNotifications} className="btn btn-outline" style={{ whiteSpace: 'nowrap' }}>
            Enable notifications
          </button>
        </div>
      )}

      {orders.length === 0 && <p className="empty-note">No active orders right now.</p>}

      {orders.map((order) => {
        const total = order.order_items.reduce(
          (sum, i) => sum + (i.price_snapshot ?? 0) * i.quantity,
          0
        )
        return (
          <div key={order.id} className="order-card">
            <div className="order-card-head">
              <span className="order-table-badge">Table {tablesMap[order.table_id] ?? '?'}</span>
              <span className="order-time">{new Date(order.created_at).toLocaleTimeString()}</span>
            </div>
            {order.order_items.map((item) => (
              <div key={item.id} className="order-line">
                <span>
                  <span className="qty">{item.quantity}×</span>
                  {item.name_snapshot}
                </span>
                <span>₹{((item.price_snapshot ?? 0) * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="order-total">
              <span>Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
            <div className="status-row">
              {STATUS_FLOW.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(order.id, s)}
                  className={`status-btn ${order.status === s ? `is-current ${s}` : ''}`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
              <button
                onClick={() => setStatus(order.id, 'cancelled')}
                className={`status-btn ${order.status === 'cancelled' ? 'is-current cancelled' : ''}`}
              >
                Cancel
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
