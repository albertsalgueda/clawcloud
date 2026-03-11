import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

// Lazy init to avoid build-time errors when env vars aren't set
export const supabaseAdmin = typeof process.env.NEXT_PUBLIC_SUPABASE_URL === 'string'
  ? getAdminClient()
  : (null as unknown as ReturnType<typeof createClient>)
