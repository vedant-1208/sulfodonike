'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadImageToCloudinary } from '@/lib/cloudinary'

type Category = { id: string; name: string; sort_order: number }
type MenuItem = {
  id: string
  category_id: string
  name: string
  description: string | null
  price: number | null
  image_url: string | null
  is_available: boolean
}

export default function MenuManagerPage() {
  const supabase = createClient()
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const [form, setForm] = useState({
    category_id: '',
    name: '',
    description: '',
    price: '',
    file: null as File | null,
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      alert('Your session has expired. Please sign in again.')
      window.location.href = '/login'
      return
    }

    setUserId(user.id)

    const { data: cats, error: catError } = await supabase
      .from('categories')
      .select('*')
      .eq('owner_id', user.id)
      .order('sort_order')

    const { data: menuItems, error: itemError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('owner_id', user.id)
      .order('sort_order')

    if (catError) console.error('Error loading categories:', catError)
    if (itemError) console.error('Error loading items:', itemError)

    setCategories(cats ?? [])
    setItems(menuItems ?? [])
    setLoading(false)
  }

  async function addCategory() {
    if (!newCategoryName.trim()) return
    if (!userId) {
      alert('Your session has expired. Please refresh the page and sign in again.')
      return
    }
    const { error } = await supabase.from('categories').insert({
      owner_id: userId,
      name: newCategoryName.trim(),
    })
    if (error) {
      alert('Could not add category: ' + error.message)
      console.error(error)
      return
    }
    setNewCategoryName('')
    loadData()
  }

  async function deleteCategory(id: string) {
    if (!confirm('Delete this category and all its items?')) return
    await supabase.from('categories').delete().eq('id', id)
    loadData()
  }

  async function addItem() {
    if (!form.name.trim() || !form.category_id) {
      alert('Name and category are required')
      return
    }
    if (!userId) {
      alert('Your session has expired. Please refresh the page and sign in again.')
      return
    }

    let image_url: string | null = null
    if (form.file) {
      setUploading(true)
      try {
        image_url = await uploadImageToCloudinary(form.file)
      } catch {
        alert('Image upload failed')
        setUploading(false)
        return
      }
      setUploading(false)
    }

    const { error } = await supabase.from('menu_items').insert({
      owner_id: userId,
      category_id: form.category_id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: form.price ? parseFloat(form.price) : null,
      image_url,
    })

    if (error) {
      alert('Could not add item: ' + error.message)
      console.error(error)
      return
    }

    setForm({ category_id: '', name: '', description: '', price: '', file: null })
    loadData()
  }

  async function toggleAvailability(item: MenuItem) {
    await supabase
      .from('menu_items')
      .update({ is_available: !item.is_available })
      .eq('id', item.id)
    loadData()
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this item?')) return
    await supabase.from('menu_items').delete().eq('id', id)
    loadData()
  }

  if (loading) return <div className="dash-body">Loading your menu…</div>

  return (
    <div className="dash-body">
      <h1 className="dash-h1">Menu</h1>
      <p className="dash-lede">Organize dishes into categories, then add items with a photo and price.</p>

      <div className="panel">
        <h2>Categories</h2>
        {categories.length === 0 && <p className="empty-note">No categories yet — add your first one below.</p>}
        <div style={{ marginBottom: 16 }}>
          {categories.map((c) => (
            <span key={c.id} className="category-chip">
              {c.name}
              <button onClick={() => deleteCategory(c.id)} aria-label={`Delete ${c.name}`}>
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="form-row-inline" style={{ display: 'flex', gap: 8 }}>
          <input
            className="field-input"
            placeholder="e.g. Starters, Drinks, Desserts"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
          />
          <button onClick={addCategory} className="btn btn-outline" style={{ whiteSpace: 'nowrap' }}>
            Add category
          </button>
        </div>
      </div>

      <div className="panel">
        <h2>Add a menu item</h2>
        <div className="form-grid">
          <div className="field">
            <label className="field-label">Category</label>
            <select
              className="field-select"
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Name</label>
            <input
              className="field-input"
              placeholder="e.g. Flat white"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="field-label">Description (optional)</label>
            <textarea
              className="field-textarea"
              placeholder="e.g. Double shot, steamed milk"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="field-label">Price</label>
            <input
              className="field-input"
              placeholder="e.g. 4.99"
              type="text"
              inputMode="decimal"
              value={form.price}
              onChange={(e) => {
                const val = e.target.value
                if (/^\d*\.?\d{0,2}$/.test(val)) {
                  setForm({ ...form, price: val })
                }
              }}
            />
          </div>
          <div className="field">
            <label className="field-label">Photo (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })}
            />
          </div>
          <button onClick={addItem} disabled={uploading} className="btn btn-primary">
            {uploading ? 'Uploading photo…' : 'Add item'}
          </button>
        </div>
      </div>

      <div className="panel">
        <h2>Current items</h2>
        {items.length === 0 && <p className="empty-note">No items yet — add one above.</p>}
        {items.map((item) => (
          <div key={item.id} className="ticket-row">
            {item.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.image_url} alt={item.name} className="ticket-thumb" />
            ) : (
              <div className="ticket-thumb" />
            )}
            <div className="ticket-info">
              <div className="ticket-name">
                {item.name} {item.price ? <span className="ticket-price">— ₹{item.price}</span> : null}
              </div>
              {item.description && <p className="ticket-desc">{item.description}</p>}
            </div>
            <div className="ticket-actions">
              <button
                onClick={() => toggleAvailability(item)}
                className={`avail-btn ${item.is_available ? 'is-available' : 'is-hidden'}`}
              >
                {item.is_available ? 'Available' : 'Hidden'}
              </button>
              <button onClick={() => deleteItem(item.id)} className="link-danger">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
