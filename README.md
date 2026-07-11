# LayerLedger — Pyraxis Prints

A workshop-console sales ledger for 3D-printed goods, behind a single-account
login. Log each order — item, **qty ordered**, customer, **price (₹)**, print
weight, regular/express, a **model file**, and **photos of the finished print**
(camera or file manager on mobile) — then click any row to view it in a detail
sheet. Data lives in **Supabase** (Auth + Postgres + Storage) and syncs in real
time across devices. **No paid plan required** — Supabase's free tier needs no
credit card.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
```

Build for production: `npm run build` → serve the `dist/` folder anywhere static.

## Supabase setup (one-time, free)

Create a project at [supabase.com](https://supabase.com) (no card needed), then:

### 1. Add your keys

Dashboard → *Project Settings → API*. Copy the **Project URL** and the **anon
public** key. Either:

- create `.env.local` (copy from [`.env.example`](.env.example)) with
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, **or**
- paste them into [`src/supabase.js`](src/supabase.js).

Until this is done the app shows a "Connect Supabase" screen.

### 2. Create the table, policies, and storage bucket

Dashboard → *SQL Editor → New query* → paste all of
[`supabase/schema.sql`](supabase/schema.sql) → **Run**. That creates the `sales`
table, Row Level Security policies (signed-in users only), the private `sales`
storage bucket, and enables realtime.

### 3. Create the operator account (the login)

Dashboard → *Authentication → Users → Add user*:

- Email: `thulasi@pyraxis-prints.app`
- Password: `Type-C`
- **Check "Auto Confirm User"** (the synthetic email can't receive a
  confirmation mail).

The login screen takes the username **Thulasi** and maps it to that email, so
you sign in with **Thulasi / Type-C**. To change the operator, add a different
user and log in with the part before the `@`.

Then turn off public sign-ups: *Authentication → Providers → Email* → disable
**Allow new users to sign up**. Now only the account you created can get in.

## Security — a real gate

- **Auth is enforced by Postgres.** Row Level Security requires
  `auth.role() = 'authenticated'`, so no data or file is reachable without
  signing in — a leaked URL alone gets nobody in. Safe for a public subdomain.
- **Files are private.** The `sales` storage bucket is private; the app serves
  photos and model files through short-lived **signed URLs** (8 h), generated
  only after login.
- **The password is never in the bundle.** Only the username→email mapping is in
  the code; the password you type goes straight to Supabase Auth. The **anon
  key** is public by design (like a Firebase apiKey) — protection comes from RLS,
  not from hiding it.
- **No public sign-up** once you disable it in step 3, so nobody can self-register.

## Data model — Postgres `public.sales`

| column       | type          | notes                                  |
|--------------|---------------|----------------------------------------|
| `id`         | uuid          | primary key                            |
| `item`       | text          | what was printed                       |
| `customer`   | text          | buyer name                             |
| `qty`        | integer       | items ordered (≥ 1)                    |
| `price`      | numeric       | rupees                                 |
| `weight_g`   | numeric       | print weight in grams (nullable)       |
| `print_type` | text          | `regular` \| `express`                 |
| `model_file` | jsonb         | `{ path, name }` in bucket, or null    |
| `images`     | text[]        | storage paths of product photos        |
| `created_at` | timestamptz   | ordering + timestamps                  |

Files live in the private `sales` bucket at `sales/{id}/model_*` and
`sales/{id}/img_*`.

## Stack

React 18 · Vite · Supabase (Auth + Postgres + Storage). Design: Space Grotesk +
JetBrains Mono, graphite-blue workshop theme, filament-orange / slicer-teal.
