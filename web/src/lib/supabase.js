import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// Support both old and new env variable names
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Check your .env file.')
}

// Create client - let Supabase handle auth headers automatically
// Don't override Authorization header as it breaks user authentication/RLS
export const supabase = createClient(supabaseUrl, supabaseKey)
