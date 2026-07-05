import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("Supabase URL check:", supabaseUrl ? "Loaded (Valid)" : "MISSING/EMPTY");

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase Client WARNING]: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables are missing.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
