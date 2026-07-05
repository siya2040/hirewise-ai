import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase Configuration WARNING]: SUPABASE_URL or SUPABASE_ANON_KEY environment variables are missing.');
}

// Client for standard requests (respects RLS)
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Admin Client (bypasses RLS) - USE WITH CAUTION on backend only
export const supabaseAdmin = supabaseServiceRoleKey 
  ? createClient(supabaseUrl || '', supabaseServiceRoleKey) 
  : null;
