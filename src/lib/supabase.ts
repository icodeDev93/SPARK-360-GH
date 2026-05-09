import { createClient } from '@supabase/supabase-js';

const url        = import.meta.env.VITE_SUPABASE_URL as string;
const key        = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY as string;

// Use sessionStorage so the auth session is tied to the browser tab.
// Closing the tab or opening the app fresh always starts at the login page.
export const supabase = createClient(url, key, {
  auth: {
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Admin client — bypasses RLS, used only for admin operations (e.g. updating another user's password).
export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
