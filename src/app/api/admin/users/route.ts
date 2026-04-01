import { NextRequest, NextResponse } from 'next/server';
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

async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();
  return data?.is_admin === true;
}

// GET - List all users with their purchases
export async function GET(request: NextRequest) {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || !(await isAdmin(supabase, user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Get all profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  // Get all purchases with movie info
  const { data: purchases } = await supabase
    .from('purchases')
    .select(`
      *,
      movies:movie_id (id, title)
    `)
    .order('created_at', { ascending: false });

  // Map purchases to users
  const usersWithPurchases = (profiles || []).map((profile: any) => ({
    ...profile,
    purchases: (purchases || []).filter((p: any) => p.user_id === profile.id),
  }));

  return NextResponse.json({ users: usersWithPurchases });
}

// PATCH - Update user profile (admin toggle, name, etc.)
export async function PATCH(request: NextRequest) {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || !(await isAdmin(supabase, user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json();
  const { userId, ...updates } = body;

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  // Only allow specific fields to be updated
  const allowedFields: Record<string, any> = {};
  if (typeof updates.is_admin === 'boolean') allowedFields.is_admin = updates.is_admin;
  if (typeof updates.full_name === 'string') allowedFields.full_name = updates.full_name;

  if (Object.keys(allowedFields).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .update(allowedFields)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile });
}

// POST - Manually grant access to a user (create verified purchase)
export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || !(await isAdmin(supabase, user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { userId, type, movieId } = await request.json();

  if (!userId || !type) {
    return NextResponse.json({ error: 'userId and type required' }, { status: 400 });
  }

  if (!['single', 'full'].includes(type)) {
    return NextResponse.json({ error: 'type must be "single" or "full"' }, { status: 400 });
  }

  if (type === 'single' && !movieId) {
    return NextResponse.json({ error: 'movieId required for single access' }, { status: 400 });
  }

  const { data: purchase, error } = await supabase
    .from('purchases')
    .insert({
      user_id: userId,
      movie_id: type === 'single' ? movieId : null,
      type,
      amount: 0, // admin-granted
      status: 'verified',
      payment_method: 'admin_grant',
    })
    .select(`
      *,
      movies:movie_id (id, title)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ purchase });
}

// DELETE - Revoke access (delete purchase)
export async function DELETE(request: NextRequest) {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || !(await isAdmin(supabase, user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { purchaseId } = await request.json();

  if (!purchaseId) {
    return NextResponse.json({ error: 'purchaseId required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('purchases')
    .delete()
    .eq('id', purchaseId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
