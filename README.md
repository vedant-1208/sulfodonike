# Cafe Menu App

Next.js + Supabase + Cloudinary + Netlify starter for restaurant owners to
sign in with Google, build a menu, and share a public menu link with
customers (no login required for customers).

## 1. Install dependencies

```bash
npm install
```

## 2. Set up the database

1. Open your Supabase project → **SQL Editor** → New query.
2. Paste the contents of `supabase/schema.sql` and click **Run**.
   This creates the `profiles`, `categories`, `menu_items` tables,
   Row Level Security policies, and a trigger that auto-creates a
   profile row whenever someone signs up.

## 3. Set up ordering (tables, orders, realtime)

1. Open your Supabase project → **SQL Editor** → New query.
2. Paste the contents of `supabase/orders_schema.sql` and click **Run**.
   This creates `tables`, `orders`, and `order_items`, their RLS policies,
   and turns on Realtime for the `orders` table so the admin dashboard
   gets new orders instantly.
3. If the last line (`alter publication supabase_realtime add table orders;`)
   errors saying the table is already a member, that's fine — ignore it.
   If Realtime still doesn't seem to fire later, double check it's on:
   Supabase Dashboard → **Database → Replication** → make sure `orders`
   is toggled on.

## 4. Set up real push notifications (works even with the site closed)

1. Run `supabase/push_schema.sql` in the SQL Editor - creates `push_subscriptions`.
2. `.env.local` already has real, working VAPID keys and a webhook secret
   generated for you (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
   `ORDER_WEBHOOK_SECRET`) - no need to generate your own unless you want to
   rotate them later (`npx web-push generate-vapid-keys`).
3. Add those same 3 variables to Netlify's environment variables when you
   deploy (see step 8 below) - the push-sending endpoint runs on Netlify,
   not in the browser, so it needs them there too.
4. Once deployed, set up the trigger: Supabase Dashboard → **Database →
   Webhooks → Create a new webhook**:
   - Table: `orders`
   - Events: `Insert`
   - Type: `HTTP Request`, Method: `POST`
   - URL: `https://<your-site>.netlify.app/api/push/order-created`
   - HTTP Headers: add `x-webhook-secret` with the same value as your
     `ORDER_WEBHOOK_SECRET` env var - this is what stops random people on
     the internet from hitting your push endpoint directly.
5. On each device that should receive notifications, open **Dashboard →
   Orders** and click **Enable notifications** once. This registers that
   specific browser/device with the push service and saves it to
   `push_subscriptions` - it's per-device, so do this on the owner's phone
   too, not just your laptop.
6. Test it for real: grant notifications on your phone, then either lock
   the phone or fully close the browser, and place a test order from
   another device. The notification should still arrive - that's the
   webhook firing on Supabase's side and pushing straight to your phone's
   OS, with nothing running in your browser at all.

A couple of honest limits worth knowing:
- **iOS Safari** only supports this if the site has been added to the
  home screen as a PWA (iOS 16.4+) - a plain Safari tab can't receive
  push on iPhone. Android Chrome (and desktop) work with just the button.
- If someone force-stops the browser app entirely in their phone's app
  switcher (not just locks the screen), some Android versions may delay
  delivery until the OS wakes the browser's push service again - this is
  an OS battery-management behavior, not something the app controls.

## 5. Set up Telegram notifications (most reliable on mobile)

Web push (section 4) can be finicky on some Android/Chrome setups. Telegram
sidesteps that completely, since it's a real installed app with its own
rock-solid OS-level notifications - it'll fire even with your site's browser
tab fully closed.

1. Run `supabase/telegram_schema.sql` in the SQL Editor.
2. In Telegram, message **@BotFather** → `/newbot` → follow the prompts.
   It gives you a bot token like `123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxx`.
3. Open a chat with your new bot and send it any message (e.g. `/start`) -
   required, since bots can only message people who've messaged them first.
4. Visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` in a browser
   (swap in your real token). Find `"chat":{"id":123456789, ...}` in the
   response - that number is your chat ID.
5. Add `TELEGRAM_BOT_TOKEN` (from step 2) to `.env.local` and to Netlify's
   environment variables.
6. In the app, go to **Dashboard → Settings** and paste your chat ID into
   the "Telegram chat ID" field, then save.
7. Place a test order. You should get a Telegram message instantly,
   regardless of whether your site is open anywhere.

This runs alongside web push, not instead of it - web push still fires
fine on desktop, and now Telegram covers mobile reliably too.

## 6. Enable Google login in Supabase (not in this app's code)

1. Supabase Dashboard → **Authentication → Providers → Google** → enable it.
2. Paste in your **Google Client ID** and **Google Client Secret**
   (from Google Cloud Console → Credentials → OAuth Client ID).
3. In Google Cloud Console, add this Authorized redirect URI (Supabase
   shows you the exact value on the same provider settings page):
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. Supabase Dashboard → **Authentication → URL Configuration** → add
   `http://localhost:3000/auth/callback` (for local dev) and later your
   Netlify URL + `/auth/callback` (for production) to the Redirect URLs list.

> Google credentials are configured on Supabase's side, not read by this
> app's own environment variables.

## 7. Environment variables

`.env.local` is already filled in with the Supabase and Cloudinary values
you gave me. Double check it before running:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

⚠️ These are real, live secrets. `.env.local` is already listed in
`.gitignore` so it won't get pushed to GitHub — keep it that way.
Since these values were previously pasted into a chat, rotate them
in the Supabase, Google Cloud, and Cloudinary dashboards when you get a
chance, then update this file with the new values.

## 8. Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` → click **Sign in** → Continue with Google.
You'll land on `/dashboard`. Go to **Settings** to set your restaurant
name, then **Menu** to add categories and items, then **Tables** to add
your physical tables — each gets its own QR code and link.

Try the full loop:
1. On **Tables**, add a table and click **Copy link** (or scan its QR code
   with your phone).
2. Open that link — this is exactly what a customer sees. Add a couple of
   items and tap **Place order**.
3. Open **Orders** in another tab — the order should appear within a
   second or two, with a chime, thanks to Supabase Realtime. If you've
   clicked **Enable notifications**, you'll also get an on-device
   notification even if that tab isn't focused.
4. Click through **Pending → Preparing → Ready → Completed** to move the
   order along; once it's Completed or Cancelled it drops off this list.

Your public read-only menu (no ordering, just browsing) is still at
`http://localhost:3000/menu/<your-slug>` if you want a plain menu link too.

## 9. Deploy to Netlify

1. Push this project to a GitHub repo.
2. Netlify → **Add new site → Import an existing project** → pick the repo.
3. Netlify auto-detects Next.js via the `@netlify/plugin-nextjs` plugin
   (already declared in `netlify.toml`) — no extra build config needed.
4. In Netlify → **Site settings → Environment variables**, add all
   10 variables from `.env.local` (the original 7, plus
   `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and
   `ORDER_WEBHOOK_SECRET` for push notifications).
5. Deploy. Then go back to Supabase → Authentication → URL Configuration
   and add `https://your-site.netlify.app/auth/callback` to the redirect
   URLs list (Google login won't work in production until you do this).

## Project structure

```
app/
  login/page.tsx              -> Google sign-in button
  auth/callback/route.ts      -> exchanges OAuth code for a session
  dashboard/
    layout.tsx                -> auth-gated shell + nav
    page.tsx                  -> overview: active orders, categories, items
    menu/page.tsx             -> add/edit/delete categories & items, image upload
    tables/page.tsx           -> add/delete tables, view & copy each QR code
    orders/page.tsx           -> live order queue, realtime + sound + notifications
    settings/page.tsx         -> restaurant name, slug, logo
  menu/[slug]/page.tsx        -> public, read-only menu page (no ordering)
  t/[code]/
    page.tsx                  -> looks up the table by its QR code
    order-client.tsx          -> the cart UI customers use to place an order
lib/
  supabase/client.ts          -> browser Supabase client
  supabase/server.ts          -> server Supabase client (reads cookies)
  cloudinary.ts                -> unsigned image upload helper
middleware.ts                 -> redirects unauthenticated users away from /dashboard
supabase/
  schema.sql                  -> profiles, categories, menu_items (run first)
  orders_schema.sql           -> tables, orders, order_items + realtime (run second)
```

## Notes

- Images upload directly from the browser to Cloudinary using your
  **unsigned upload preset** (`sulfodonike`) — no server round trip needed.
- `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` aren't used by this
  starter (unsigned uploads don't need them) but are kept in `.env.local`
  in case you later add signed uploads or server-side image management.
- Row Level Security in `schema.sql` ensures owners can only edit their
  own menu, while anyone (no login) can read `menu_items`,
  `categories`, and `profiles` — that's what powers the public menu page.
- Customers never sign in to place an order. Their identity is just
  "whichever table's QR code they scanned" — `orders_schema.sql`'s RLS
  policies let anyone insert an order, but only if its `owner_id` matches
  the real owner of that `table_id`, so orders can't be spoofed onto a
  different restaurant.
- Notifications on the Orders page use the browser's Notification API —
  they'll fire as long as the owner's browser is open (even in a background
  tab), but not if the browser itself is fully closed. Turning that into a
  true push notification (works even with the browser closed) needs a
  service worker and a push server (e.g. web-push + VAPID keys) — ask if
  you'd like that added next.
