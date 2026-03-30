import { NextRequest, NextResponse } from 'next/server';
import { executeSQL } from '@/lib/supabase/admin';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

function getSupabaseClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          try { cookieStore.set({ name, value, ...options }); } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try { cookieStore.set({ name, value: '', ...options }); } catch {}
        },
      },
    }
  );
}

async function isAdmin(userId: string): Promise<boolean> {
  try {
    const result = await executeSQL(
      `SELECT is_admin FROM public.profiles WHERE id = '${userId}' LIMIT 1`
    );
    return result?.[0]?.is_admin === true;
  } catch {
    return false;
  }
}

// GET - List pending payments
export async function GET(request: NextRequest) {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const statusFilter = request.nextUrl.searchParams.get('status') || 'pending';

  try {
    const purchases = await executeSQL(`
      SELECT 
        p.*,
        json_build_object('email', pr.email, 'full_name', pr.full_name) as profiles,
        json_build_object('title', m.title) as movies
      FROM public.purchases p
      LEFT JOIN public.profiles pr ON p.user_id = pr.id
      LEFT JOIN public.movies m ON p.movie_id = m.id
      WHERE p.status = '${statusFilter}'
      ORDER BY p.created_at DESC
    `);
    return NextResponse.json({ purchases: purchases || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Verify or reject payment
export async function PATCH(request: NextRequest) {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { purchaseId, status } = await request.json();

  if (!purchaseId || !['verified', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  try {
    const result = await executeSQL(
      `UPDATE public.purchases SET status = '${status}' WHERE id = '${purchaseId}' RETURNING *`
    );
    return NextResponse.json({ purchase: result?.[0] || null });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
