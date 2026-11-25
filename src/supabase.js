import { createClient } from '@supabase/supabase-js'

/* Use the public anon key here; database and storage access must be protected
   by Supabase Auth and Row Level Security. Never use a service-role key in client code. */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

export const BUCKET = 'sales'
export const SIGNED_URL_TTL = 60 * 60 * 8 // 8 hours

export const isConfigured =
  SUPABASE_URL.startsWith('http') && !SUPABASE_ANON_KEY.startsWith('YOUR_')

// When unconfigured, hand createClient a valid dummy so it doesn't throw at
// import — the app shows the Setup screen and never calls this client.
const url = isConfigured ? SUPABASE_URL : 'https://placeholder.supabase.co'
const key = isConfigured ? SUPABASE_ANON_KEY : 'placeholder-anon-key'

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
