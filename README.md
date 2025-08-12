
# CryptoVerse — Prices, News & Encrypted Chat

A Next.js (App Router) site that shows live crypto prices, aggregates news from top publishers, and includes a peer‑to‑peer encrypted chatroom. TailwindCSS styling.

## Quickstart

```bash
pnpm i   # or npm i or yarn
pnpm dev # http://localhost:3000
```

## Features

- **Live Prices:** CoinGecko Simple Price API (no key), refreshed every minute.
- **News Aggregation:** Server‑side route `/api/news` fetches and parses RSS from CoinDesk, Cointelegraph, and Decrypt using `fast-xml-parser`. Auto-refresh every 5 minutes on the client.
- **Encrypted Chatroom:** WebRTC data channel with an additional AES‑GCM message layer. Copy‑paste SDP flow; no server required.
- **Affiliate Spots:** Coinbase CTA buttons wired to your referral link.

## Deploy to Vercel

1. Create a new Vercel project from this repo.
2. No special env vars needed. (Optional: set `NEXT_PUBLIC_COINBASE_AFFILIATE_URL` and use it in the code.)
3. Deploy.

## Notes

- Some browsers may block third‑party cookies/trackers; WebRTC requires peers to be reachable and may need both users to be online simultaneously.
- If RSS publishers change their XML shape, update the parser in `app/api/news/route.ts`.


## Open Comments (Disqus‑style) via Supabase

1. Create a Supabase project. Add a table `comments` with columns:
   - `id uuid primary key default uuid_generate_v4()`
   - `created_at timestamp default now()`
   - `author text`
   - `body text`
2. Enable RLS and add policies to allow anonymous `select` and `insert` (or restrict as you like).
3. Set env vars in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy. The comments will live-update via Supabase Realtime.



## Comments: Replies, Upvotes, and Auth

### Tables
```sql
-- Enable UUIDs
create extension if not exists "uuid-ossp";

create table if not exists public.comments (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone not null default now(),
  author text,
  body text not null,
  parent_id uuid null references public.comments(id) on delete cascade,
  user_id uuid null
);

create table if not exists public.comment_votes (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone not null default now(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null
);

create unique index if not exists comment_votes_unique on public.comment_votes(comment_id, user_id);
```

### Row Level Security (RLS)
```sql
alter table public.comments enable row level security;
alter table public.comment_votes enable row level security;

-- Anyone can read
create policy "comments_select_all" on public.comments for select using (true);
create policy "votes_select_all" on public.comment_votes for select using (true);

-- Post comments: allow anon and authed (optional tighten here)
create policy "comments_insert_anyone" on public.comments for insert with check (true);

-- Upvotes require login
create policy "votes_insert_authed" on public.comment_votes for insert to authenticated with check (true);
```

### Auth
- Magic link (email) and OAuth (GitHub/Google) wired in the UI.
- Set in Vercel env:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- In Supabase dashboard, enable the providers you want (GitHub, Google) and add redirect URLs (your site URL).


## Deploy to Vercel

Click this button to deploy your own copy:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=<REPLACE_WITH_YOUR_GITHUB_REPO_URL>&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY&project-name=cryptoverse-affiliate-site&repository-name=cryptoverse-affiliate-site)

### GitHub Push (if you prefer CLI)
```bash
# From the project root
git init
git add .
git commit -m "Initial commit: CryptoVerse site"
gh repo create cryptoverse-affiliate-site --public --source=. --remote=origin --push  # requires GitHub CLI
# Or create a repo in GitHub UI and:
# git remote add origin https://github.com/<you>/cryptoverse-affiliate-site.git
# git push -u origin main
```
Then visit https://vercel.com/new and **Import Project** from your GitHub repo.


## Troubleshooting Vercel 404 (arn1:: NOT_FOUND)

If you see a Vercel 404 like `arn1::... NOT_FOUND`:
1. Visit `/api/health` on your deployment. You should get `{ ok: true }`.
2. Visit `/api/news`. If this works, the client will also load.
3. Make sure project **Framework Preset = Next.js** in Vercel → Settings.
4. Do **not** set `output: export` in `next.config`. (We don't.)
5. We ship **both** App Router API (`app/api/news/route.ts`) **and** Pages API (`pages/api/news.ts`). Either should resolve 404s across configs.
6. Re-deploy after any change.


## Vercel framework detection tips

If Vercel says "No Next.js version detected":
- Ensure your **Root Directory** is the project root that contains:
  - `package.json` (with `"next"` in dependencies),
  - `next.config.js` or `next.config.mjs`,
  - `app/` or `pages/` folder.
- We include both **`app/`** (App Router) and **`pages/`** fallbacks to make detection bulletproof.
- Re-deploy after pushing these files.
