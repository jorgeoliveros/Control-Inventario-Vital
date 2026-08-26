import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Lee las credenciales de las variables de entorno que configuraremos en Vercel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
