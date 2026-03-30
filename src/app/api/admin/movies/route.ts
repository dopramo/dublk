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

// Helper to check admin status
async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();
  return data?.is_admin === true;
}

// GET - List all movies (admin)
export async function GET(request: NextRequest) {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || !(await isAdmin(supabase, user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { data: movies, error } = await supabase
    .from('movies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ movies: movies || [] });
}

// POST - Add a new movie
export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || !(await isAdmin(supabase, user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json();
  const { tmdb_id, title, slug, description, poster_url, backdrop_url, genres, rating, release_year, runtime, bunny_video_id, is_published } = body;

  if (!tmdb_id || !title || !slug) {
    return NextResponse.json({ error: 'tmdb_id, title, and slug are required' }, { status: 400 });
  }

  const { data: movie, error } = await supabase
    .from('movies')
    .insert([{
      tmdb_id,
      title,
      slug,
      description,
      poster_url,
      backdrop_url,
      genres: genres || [],
      rating: rating || 0,
      release_year,
      runtime,
      bunny_video_id,
      is_published: !!is_published
    }])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ movie });
}

// PATCH - Update a movie
export async function PATCH(request: NextRequest) {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || !(await isAdmin(supabase, user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'Movie ID required' }, { status: 400 });
  }

  const { data: movie, error } = await supabase
    .from('movies')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ movie });
}

// DELETE - Delete a movie
export async function DELETE(request: NextRequest) {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || !(await isAdmin(supabase, user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: 'Movie ID required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('movies')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
