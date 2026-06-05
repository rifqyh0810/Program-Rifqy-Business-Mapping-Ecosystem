import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://nnjopskeajrnwwslkkfh.supabase.co',
  process.env.REACT_APP_SUPABASE_ANON_KEY
)