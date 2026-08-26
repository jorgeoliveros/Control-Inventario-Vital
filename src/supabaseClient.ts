import { createClient } from '@supabase/supabase-js';

// Read Supabase environment variables from Vite runtime or provide safe fallbacks
const metaEnv = (import.meta as any).env || {};
const supabaseUrl: string = metaEnv.VITE_SUPABASE_URL || 'https://xyzcompany.supabase.co';
const supabaseAnonKey: string = metaEnv.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
