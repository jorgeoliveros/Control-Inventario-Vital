import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read Supabase environment variables from Vite runtime or provide safe fallbacks
const metaEnv = (import.meta as any).env || {};
const rawUrl: string = metaEnv.VITE_SUPABASE_URL || '';
const rawKey: string = metaEnv.VITE_SUPABASE_ANON_KEY || '';

/**
 * Sanitizes and cleans the Supabase URL to prevent PGRST125 ("Invalid path specified in request URL")
 * and malformed URL path issues (trailing slashes, duplicate /rest/v1 prefixes, dashboard URLs, etc.)
 */
function sanitizeSupabaseUrl(urlInput: string): string {
  if (!urlInput) return 'https://placeholder.supabase.co';
  let cleaned = String(urlInput).trim();

  // Strip surrounding quotes
  cleaned = cleaned.replace(/^['"]+|['"]+$/g, '');

  // Extract project ref if the user mistakenly pasted the Supabase dashboard URL
  // e.g. https://supabase.com/dashboard/project/abcxyz123 -> https://abcxyz123.supabase.co
  const dashboardMatch = cleaned.match(/supabase\.com\/dashboard\/project\/([a-zA-Z0-9_-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // Strip trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');

  // Strip /rest/v1, /rest/v1/, /rest if accidentally appended
  cleaned = cleaned.replace(/\/rest(\/v1)?(\/)?$/i, '');

  // Strip trailing slashes again
  cleaned = cleaned.replace(/\/+$/, '');

  // Ensure protocol
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }

  return cleaned;
}

function sanitizeSupabaseKey(keyInput: string): string {
  if (!keyInput) return 'dummy-anon-key';
  let cleaned = String(keyInput).trim();
  cleaned = cleaned.replace(/^['"]+|['"]+$/g, '');
  return cleaned;
}

const cleanedUrl = sanitizeSupabaseUrl(rawUrl);
const cleanedKey = sanitizeSupabaseKey(rawKey);

export const isSupabaseConfigured: boolean = Boolean(
  rawUrl &&
  rawKey &&
  !rawUrl.includes('placeholder') &&
  !rawUrl.includes('xyzcompany.supabase.co') &&
  !rawKey.includes('dummy_key') &&
  !rawKey.includes('dummy-anon-key')
);

export const supabase: SupabaseClient = createClient(cleanedUrl, cleanedKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

