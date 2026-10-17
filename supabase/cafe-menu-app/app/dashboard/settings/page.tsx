'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadImageToCloudinary } from '@/lib/cloudinary'
import { MENU_THEMES, DEFAULT_THEME, resolveTheme } from '@/lib/themes'

export default function SettingsPage() {
  const supabase = createClient()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [telegramChatId, setTelegramChatId] = useState('')
  const [theme, setTheme] = useState(DEFAULT_THEME)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { data } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
    if (data) {
      setName(data.restaurant_name ?? '')
      setSlug(data.slug ?? '')
      setLogoUrl(data.logo_url)
      setTelegramChatId(data.telegram_chat_id ?? '')
      setTheme(resolveTheme(data.menu_theme))
    }
    setLoading(false)
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSaving(true)
    try {
      const url = await uploadImageToCloudinary(file)
      setLogoUrl(url)
    } catch {
      alert('Logo upload failed')
    }
    setSaving(false)
  }

  async function save() {
    setSaving(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('profiles')
      .update({ restaurant_name: name, slug, logo_url: logoUrl, telegram_chat_id: telegramChatId || null, menu_theme: theme })
      .eq('id', user!.id)
    setSaving(false)
    if (error) {
      alert('Save failed: ' + error.message + ' (slug may already be taken)')
    } else {
      alert('Saved!')
    }
  }

  if (loading) return <div className="dash-body">Loading…</div>

  return (
    <div className="dash-body">
      <h1 className="dash-h1">Settings</h1>
      <p className="dash-lede">This is what customers see at the top of your menu.</p>

      <div className="panel" style={{ maxWidth: 420 }}>
        <div className="form-grid">
          <div className="field">
            <label className="field-label">Restaurant name</label>
            <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Public URL slug</label>
            <input className="field-input" value={slug} onChange={(e) => setSlug(e.target.value)} />
            <p className="field-hint">Your menu will be at /menu/{slug}</p>
          </div>
          <div className="field">
            <label className="field-label">Logo</label>
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                width={64}
                height={64}
                alt="Logo"
                style={{ borderRadius: '50%', objectFit: 'cover', display: 'block', marginBottom: 10 }}
              />
            )}
            <input type="file" accept="image/*" onChange={handleLogoChange} />
          </div>
          <div className="field">
            <label className="field-label">Telegram chat ID (for order notifications)</label>
            <input
              className="field-input"
              placeholder="e.g. 123456789"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
            />
            <p className="field-hint">
              Get this by messaging your bot, then visiting
              api.telegram.org/bot&lt;TOKEN&gt;/getUpdates in a browser.
            </p>
          </div>
          <button onClick={save} disabled={saving} className="btn btn-primary">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="panel">
        <h2>Menu theme</h2>
        <p className="dash-lede" style={{ marginBottom: 16 }}>
          Pick how your menu looks to customers. It applies to your public menu and the table ordering page.
        </p>
        <div className="theme-grid">
          {MENU_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              className={`theme-option ${theme === t.id ? 'is-selected' : ''}`}
              aria-pressed={theme === t.id}
            >
              <div className="board-page is-preview" data-theme={t.id}>
                <div className="board-frame">
                  <p className="board-title">Corner Cafe</p>
                  <div className="board-category">
                    <p className="board-category-name">Mornings</p>
                    <hr className="board-category-rule" />
                    <div className="menu-row">
                      <div className="menu-row-body">
                        <div className="menu-row-head">
                          <span className="menu-row-name">Flat white</span>
                          <span className="menu-row-leader" />
                          <span className="menu-row-price">₹120</span>
                        </div>
                      </div>
                    </div>
                    <div className="menu-row">
                      <div className="menu-row-body">
                        <div className="menu-row-head">
                          <span className="menu-row-name">Croissant</span>
                          <span className="menu-row-leader" />
                          <span className="menu-row-price">₹90</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="theme-option-label">
                {t.name}
                <small>{t.blurb}</small>
              </div>
            </button>
          ))}
        </div>
        <button onClick={save} disabled={saving} className="btn btn-primary" style={{ marginTop: 18 }}>
          {saving ? 'Saving…' : 'Save theme'}
        </button>
      </div>
    </div>
  )
}
