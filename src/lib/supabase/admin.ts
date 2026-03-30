import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client using the anon key.
 * 
 * Used for server components that need to fetch public data (published movies etc.)
 * This respects RLS policies, so only publicly accessible data can be read.
 * 
 * NOTE: The SUPABASE_SERVICE_ROLE_KEY is currently a Management API PAT (sbp_...).
 * When you have the actual service role JWT key from Supabase Dashboard > Settings > API,
 * replace it in .env.local and the admin client will bypass RLS.
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  // Check if we have a real service role JWT key (starts with eyJ)
  // or a Management API PAT (starts with sbp_)
  const isRealServiceKey = serviceKey.startsWith('eyJ');
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    isRealServiceKey ? serviceKey : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Execute raw SQL via the Supabase Management API.
 * Uses the personal access token (sbp_...).
 */
export async function executeSQL(query: string) {
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL
    ?.replace('https://', '')
    .replace('.supabase.co', '') || '';
  
  const token = process.env.SUPABASE_MANAGEMENT_TOKEN || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SQL execution failed (${res.status}): ${text}`);
  }

  return await res.json();
}
