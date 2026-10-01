import type { SupabaseClient } from '@supabase/supabase-js'

export async function registerServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  try {
    await navigator.serviceWorker.register('/sw.js')
  } catch (e) {
    console.error('Service worker registration failed:', e)
  }
}

// Shows a notification immediately, from an open tab's own JavaScript.
// Useful while the dashboard is open, but does NOT work once the tab/site
// is closed - for that, see subscribeToPush below.
export async function showOrderNotification(title: string, body: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(title, { body })
      return
    } catch (e) {
      console.error('showNotification via service worker failed:', e)
    }
  }

  try {
    new Notification(title, { body })
  } catch (e) {
    console.error('Plain Notification constructor failed:', e)
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Registers this device with the browser's push service and saves the
// subscription to Supabase. This is what makes notifications arrive even
// with the site fully closed - the OS/browser delivers the push directly
// to the service worker, independent of any open tab.
export async function subscribeToPush(supabase: SupabaseClient, ownerId: string) {
  if (typeof window === 'undefined') return { ok: false, reason: 'no-window' }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'unsupported' }
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidPublicKey) {
    console.error('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set')
    return { ok: false, reason: 'missing-key' }
  }

  try {
    const registration = await navigator.serviceWorker.ready

    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })
    }

    const json = subscription.toJSON()
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        owner_id: ownerId,
        endpoint: json.endpoint!,
        p256dh: json.keys!.p256dh,
        auth: json.keys!.auth,
      },
      { onConflict: 'endpoint' }
    )

    if (error) {
      console.error('Saving push subscription failed:', error)
      return { ok: false, reason: 'save-failed' }
    }

    return { ok: true }
  } catch (e) {
    console.error('Push subscription failed:', e)
    return { ok: false, reason: 'subscribe-failed' }
  }
}
