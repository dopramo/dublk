import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, executeSQL } from '@/lib/supabase/admin';
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

function escapeSQL(str: string | null | undefined): string {
  if (str === null || str === undefined) return 'NULL';
  return "'" + str.replace(/'/g, "''") + "'";
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

// GET - List all movies (admin)
export async function GET(request: NextRequest) {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const movies = await executeSQL(
      `SELECT * FROM public.movies ORDER BY created_at DESC`
    );
    return NextResponse.json({ movies: movies || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Add a new movie
export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json();
  const { tmdb_id, title, slug, description, poster_url, backdrop_url, genres, rating, release_year, runtime, bunny_video_id, is_published } = body;

  if (!tmdb_id || !title || !slug) {
    return NextResponse.json({ error: 'tmdb_id, title, and slug are required' }, { status: 400 });
  }

  const genresArr = (genres || []).map((g: string) => escapeSQL(g)).join(',');

  try {
    const result = await executeSQL(`
      INSERT INTO public.movies (tmdb_id, title, slug, description, poster_url, backdrop_url, genres, rating, release_year, runtime, bunny_video_id, is_published)
      VALUES (
        ${tmdb_id},
        ${escapeSQL(title)},
        ${escapeSQL(slug)},
        ${escapeSQL(description)},
        ${escapeSQL(poster_url)},
        ${escapeSQL(backdrop_url)},
        ARRAY[${genresArr}]::TEXT[],
        ${rating || 0},
        ${release_year || 'NULL'},
        ${runtime || 'NULL'},
        ${bunny_video_id ? escapeSQL(bunny_video_id) : 'NULL'},
        ${is_published ? 'true' : 'false'}
      )
      RETURNING *;
    `);
    return NextResponse.json({ movie: result?.[0] || null });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update a movie
export async function PATCH(request: NextRequest) {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: 'Movie ID required' }, { status: 400 });

  // Build SET clause
  const setClauses: string[] = [];
  for (const [key, value] of Object.entries(updates)) {
    if (key === 'is_published') {
      setClauses.push(`${key} = ${value ? 'true' : 'false'}`);
    } else if (key === 'genres' && Array.isArray(value)) {
      setClauses.push(`${key} = ARRAY[${(value as string[]).map(g => escapeSQL(g)).join(',')}]::TEXT[]`);
    } else if (typeof value === 'number') {
      setClauses.push(`${key} = ${value}`);
    } else if (value === null) {
      setClauses.push(`${key} = NULL`);
    } else {
      setClauses.push(`${key} = ${escapeSQL(value as string)}`);
    }
  }

  try {
    const result = await executeSQL(
      `UPDATE public.movies SET ${setClauses.join(', ')} WHERE id = '${id}' RETURNING *;`
    );
    return NextResponse.json({ movie: result?.[0] || null });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete a movie
export async function DELETE(request: NextRequest) {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'Movie ID required' }, { status: 400 });

  try {
    await executeSQL(`DELETE FROM public.movies WHERE id = '${id}'`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
