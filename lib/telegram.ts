export type TelegramResult = { ok: boolean; detail: string }

// Sends a Telegram message and always returns a human-readable reason, so
// failures are visible instead of silent. The bot token is never included
// in the returned text.
export async function sendTelegramMessage(chatId: string, text: string): Promise<TelegramResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    return {
      ok: false,
      detail:
        'TELEGRAM_BOT_TOKEN is not set on the server. Add it in Netlify environment variables, then redeploy.',
    }
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
    const body = await res.json().catch(() => null)
    if (res.ok && body?.ok) return { ok: true, detail: 'sent' }
    return { ok: false, detail: `Telegram replied: ${body?.description ?? `HTTP ${res.status}`}` }
  } catch (e) {
    return { ok: false, detail: `Could not reach Telegram: ${String(e)}` }
  }
}
