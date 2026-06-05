import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nnjopskeajrnwwslkkfh.supabase.co/rest/v1/'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uam9wc2tlYWpybnd3c2xra2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTU2NjAsImV4cCI6MjA5NjEzMTY2MH0.wvmYR14KfLYe42bZFllyts6Hq10BX3GpmeqQeZZ58sM'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)