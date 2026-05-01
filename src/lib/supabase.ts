import { createClient } from '@supabase/supabase-js';

// These should be replaced with actual Supabase Project URL and Anon Key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const hasRealSupabaseUrl =
  Boolean(supabaseUrl) &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('your-project') &&
  /^https:\/\/.+\.supabase\.co$/i.test(supabaseUrl);

const hasRealSupabaseKey =
  Boolean(supabaseAnonKey) &&
  supabaseAnonKey !== 'your-anon-key' &&
  supabaseAnonKey !== 'your-anon-key-here';

// Mock client for local development if keys are missing
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to check if Supabase is properly configured with real keys
export const isSupabaseConfigured = hasRealSupabaseUrl && hasRealSupabaseKey;

/**
 * PRO TIP: To enable real Google Auth:
 * 1. Create a Supabase project at supabase.com
 * 2. Go to Authentication -> Providers -> Google
 * 3. Follow the instructions to get a Google Client ID and Secret
 * 4. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file
 */
