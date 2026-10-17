'use client'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/client'

type Table = { id: string; table_number: string; code: string }

function TableQR({ url }: { url: string }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(url, { margin: 1, width: 128 }).then((dataUrl) => {
      if (!cancelled) setSrc(dataUrl)
    })
    return () => {
      cancelled = true
    }
  }, [url])

  if (!src) return <div className="table-qr" />
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="Table QR code" className="table-qr" />
}

export default function TablesPage() {
  const supabase = createClient()
  const [tables, setTables] = useState<Table[]>([])
  const [newNumber, setNewNumber] = useState('')
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
    load()
  }, [])

  async function load() {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/login'
      return
    }
    setUserId(user.id)

    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at')

    if (error) console.error(error)
    setTables(data ?? [])
    setLoading(false)
  }

  async function addTable() {
    if (!newNumber.trim() || !userId) return
    const { error } = await supabase.from('tables').insert({
      owner_id: userId,
      table_number: newNumber.trim(),
    })
    if (error) {
      alert('Could not add table: ' + error.message)
      return
    }
    setNewNumber('')
    load()
  }

  async function deleteTable(id: string) {
    if (!confirm('Delete this table? Its QR code will stop working.')) return
    await supabase.from('tables').delete().eq('id', id)
    load()
  }

  function copyLink(url: string) {
    navigator.clipboard.writeText(url)
    alert('Link copied')
  }

  if (loading) return <div className="dash-body">Loading tables…</div>

  return (
    <div className="dash-body">
      <h1 className="dash-h1">Tables</h1>
      <p className="dash-lede">
        Each table gets its own QR code. Print it and stick it on the table — scanning it opens the menu
        and sends orders straight to your Orders page, tagged with that table number.
      </p>

      <div className="panel">
        <h2>Add a table</h2>
        <div style={{ display: 'flex', gap: 8, maxWidth: 320 }}>
          <input
            className="field-input"
            placeholder="e.g. 1, or Patio 3"
            value={newNumber}
            onChange={(e) => setNewNumber(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTable()}
          />
          <button onClick={addTable} className="btn btn-outline" style={{ whiteSpace: 'nowrap' }}>
            Add table
          </button>
        </div>
      </div>

      <div className="panel">
        <h2>Your tables</h2>
        {tables.length === 0 && <p className="empty-note">No tables yet — add one above.</p>}
        {tables.map((t) => {
          const url = `${origin}/t/${t.code}`
          return (
            <div key={t.id} className="table-row">
              <TableQR url={url} />
              <div className="table-info">
                <div className="table-number">Table {t.table_number}</div>
                <div className="table-link">{url}</div>
              </div>
              <button onClick={() => copyLink(url)} className="btn btn-outline" style={{ fontSize: 13, padding: '8px 12px' }}>
                Copy link
              </button>
              <button onClick={() => deleteTable(t.id)} className="link-danger">
                Delete
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
