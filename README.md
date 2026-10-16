# LayerLedger 🧵

A sleek, dark-mode workshop console sales ledger tailored for 3D-printing makers and print studios (**Pyraxis Prints**).

Instead of generic business accounting, **LayerLedger** treats commercial sales through the domain model of additive manufacturing: each sale is a layer deposited onto the build plate, tracking print weights in grams, speed profiles, CAD/slicer attachments, and product photos.

---

## Features

- **Workshop Console Aesthetic**: High-contrast industrial dark mode built with Space Grotesk and JetBrains Mono typography, custom filament spool indicators, and tactile feedback.
- **Additive Manufacturing Specifics**:
  - Gram weight tracking per item
  - Speed presets: **Regular** vs. **Express**
  - Quantity tracking and INR currency formatting (`₹`)
  - CAD model attachments (`.stl`, `.3mf`, `.obj`, `.gcode`, `.step`, `.stp`, `.zip`)
  - Finished product photo documentation with direct mobile camera capture (`capture="environment"`)
- **Real-Time Cross-Device Sync**: Powered by Supabase Realtime WebSocket subscriptions.
- **Secure File Storage**: Private bucket storage for 3D models and photos with short-lived signed URLs (8-hour TTL).
- **Operator Authentication Gate**: Streamlined username/password login mapped to a synthetic internal domain (`@pyraxis-prints.app`).
- **Telemetry & Metrics**: Total revenue, average sale build-height Z-bar visualizer, top single sale, and live layer deposit counter.

---

## Tech Stack

- **Frontend**: [React 18](https://react.dev) + [Vite](https://vitejs.dev)
- **Styling**: Vanilla CSS (custom design system, zero external runtime CSS)
- **Backend & Database**: [Supabase](https://supabase.com) (PostgreSQL, Row Level Security, Supabase Auth, Storage, and Realtime)

---

## Quick Start

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Configure Supabase Environment
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Update `.env.local` with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```
*(Alternatively, insert them into `src/supabase.js`)*.

### 3. Run Database Migrations
1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** → **New Query**.
3. Copy and run the SQL code from [`supabase/schema.sql`](supabase/schema.sql).

This script:
- Creates the `public.sales` table and indices.
- Configures Row Level Security (RLS) policies for authenticated operators.
- Enables Realtime replication on `public.sales`.
- Creates the private `sales` storage bucket with authenticated RLS access policies.

### 4. Create an Operator User
1. In the Supabase Dashboard, go to **Authentication** → **Users**.
2. Click **Add User** → **Create User**.
3. Email: `<username>@pyraxis-prints.app` (e.g. `operator@pyraxis-prints.app` or `rick@pyraxis-prints.app`).
4. Set an operator password and confirm creation.

### 5. Launch the Console
```bash
npm run dev
```
Open `http://localhost:5173` in your browser, enter your operator username and password, and begin logging layers!

---

## Project Structure

```
LayerLedger/
├── public/                  # Static assets & SVG favicon
├── src/
│   ├── App.jsx              # Core React console (Auth, Form, Ledger, Detail, KPIs)
│   ├── index.css            # Complete industrial design system & variables
│   ├── main.jsx             # React entrypoint
│   └── supabase.js          # Supabase client initialization & config checks
├── supabase/
│   └── schema.sql           # Database schema, RLS policies, & bucket creation
├── .env.example             # Sample environment configuration
├── package.json             # NPM dependencies & scripts
└── vite.config.js           # Vite configuration
```

---

## License

Private project for Pyraxis Prints.
