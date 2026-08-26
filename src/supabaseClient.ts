import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ihlhmpsclyjysoawvaua.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Manejo seguro para evitar que el empaquetador Minified rompa la función de inicialización
const createClientFn = typeof createClient === 'function' ? createClient : (createClient as any).default || (createClient as any).createClient;

export const supabase = createClientFn(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});
