# Google Calendar setup

Gather works fully without Google — you can mark availability manually on the
**My Calendar** page. Follow these steps only when you want automatic calendar
sync. Gather stores **only** busy/free time windows, never event titles.

## 1. Create a Google Cloud OAuth client

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and
   create (or pick) a project.
2. Enable the **Google Calendar API**
   (APIs & Services → Library → Google Calendar API → Enable).
3. Configure the **OAuth consent screen** (External). Add the scope
   `https://www.googleapis.com/auth/calendar.readonly`. Add yourself as a test
   user while in testing mode.
4. Create **OAuth client ID** credentials of type **Web application**.
5. Under **Authorized redirect URIs**, add your Supabase callback:
   `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
6. Copy the **Client ID** and **Client secret**.

## 2. Enable Google in Supabase Auth

In the Supabase dashboard → **Authentication → Providers → Google**:

- Enable the provider.
- Paste the Client ID and Client secret from step 1.
- Under **Authentication → URL Configuration**, set the **Site URL**
  (e.g. `http://localhost:3000` for dev or your Vercel URL) and add
  `http://localhost:3000/**` and your production URL to **Redirect URLs**.

## 3. Add server env vars

Set these in `.env.local` (dev) and in Vercel project settings (prod):

```
GOOGLE_CLIENT_ID=...        # same client ID as above
GOOGLE_CLIENT_SECRET=...    # same client secret
CRON_SECRET=...             # any random string; protects the cron sync route
SUPABASE_SERVICE_ROLE_KEY=...  # Supabase dashboard → Settings → API
```

The `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are needed by Gather's sync
route to refresh tokens server-side. They are the same credentials you gave
Supabase.

## 4. Connect & sync

1. Sign in to Gather and open **Settings → Google Calendar → Connect**.
   This re-runs Google OAuth requesting the calendar scope and offline access,
   storing a refresh token in `calendar_connections`.
2. Click **Sync now**, or wait for the daily Vercel Cron job
   (`/api/sync/google`, configured in `vercel.json`).

## How sync behaves

- Window: yesterday through ~30 days ahead.
- Each confirmed, non-"free" timed event becomes a **Busy (committed)** block.
- All-day, cancelled, and "free"/transparent events are ignored.
- You can override any synced block to **Free** or **Tentative** on the
  calendar; overrides are preserved across future syncs.
- On the Vercel Hobby tier, cron runs at most once per day; use **Sync now**
  for immediate updates.
