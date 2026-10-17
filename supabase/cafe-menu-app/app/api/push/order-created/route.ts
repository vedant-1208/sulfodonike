import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

// This route is called by a Supabase Database Webhook the instant a new
// row is inserted into `orders`. It runs on Netlify's servers, independent
// of whether anyone has the site open - that's what lets a push notification
// reach a device even with the browser fully closed.

webpush.setVapidDetails(
  'mailto:admin@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

// Uses the service role key - this route runs server-side only and must
// never be reachable without the shared secret check below.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const secret = request.headers.get('x-webhook-secret')
  if (secret !== process.env.ORDER_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await request.json()
  const order = payload.record

  if (!order?.owner_id || !order?.table_id) {
    return NextResponse.json({ error: 'Bad payload' }, { status: 400 })
  }

  const { data: table } = await supabaseAdmin
    .from('tables')
    .select('table_number')
    .eq('id', order.table_id)
    .single()

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('telegram_chat_id')
    .eq('id', order.owner_id)
    .single()

  let telegramSent = false
  if (profile?.telegram_chat_id && process.env.TELEGRAM_BOT_TOKEN) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: profile.telegram_chat_id,
            text: `🔔 New order — Table ${table?.table_number ?? '?'}`,
          }),
        }
      )
      telegramSent = res.ok
      if (!res.ok) {
        console.error('Telegram send failed:', await res.text())
      }
    } catch (err) {
      console.error('Telegram send threw:', err)
    }
  }

  const { data: subscriptions } = await supabaseAdmin
    .from('push_subscriptions')
    .select('*')
    .eq('owner_id', order.owner_id)

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, telegramSent })
  }

  const notificationPayload = JSON.stringify({
    title: 'New order',
    body: `Table ${table?.table_number ?? '?'} just ordered`,
    url: '/dashboard/orders',
  })

  let sent = 0
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        notificationPayload
      )
      sent++
    } catch (err: any) {
      // 410 Gone / 404 means the subscription is dead (browser data cleared,
      // uninstalled, etc.) - clean it up so we stop trying it.
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
      } else {
        console.error('Push send failed:', err)
      }
    }
  }

  return NextResponse.json({ sent, telegramSent })
}
