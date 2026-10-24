import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTelegramMessage } from '@/lib/telegram'

// Lets a signed-in owner send a test message to the chat ID saved in THEIR
// OWN settings. It only ever messages that saved ID, so it can't be used
// to message anyone else.
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, detail: 'Not signed in.' }, { status: 401 })

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('telegram_chat_id')
    .eq('id', user.id)
    .single()

  if (error) {
    return NextResponse.json({
      ok: false,
      detail: `Could not read your settings: ${error.message}. Run telegram_schema.sql in Supabase.`,
    })
  }
  if (!profile?.telegram_chat_id) {
    return NextResponse.json({ ok: false, detail: 'No chat ID saved yet. Enter it and press Save changes first.' })
  }

  const result = await sendTelegramMessage(profile.telegram_chat_id, '✅ Test message from your cafe dashboard. Telegram is working.')
  return NextResponse.json(result)
}
