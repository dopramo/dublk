import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { generateSecureEmbedUrl, getBasicEmbedUrl } from '@/lib/bunny';
import { executeSQL } from '@/lib/supabase/admin';

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

export async function GET(
  request: NextRequest,
  { params }: { params: { movieId: string } }
) {
  const movieId = params.movieId;

  // 1. Verify Authentication
  const supabase = getSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // 2. Get movie details using Management API (bypasses RLS for unpublished movies too)
  try {
    const movies = await executeSQL(
      `SELECT id, bunny_video_id, title FROM public.movies WHERE id = '${movieId}' LIMIT 1`
    );

    const movie = movies?.[0];
    if (!movie) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    if (!movie.bunny_video_id) {
      return NextResponse.json({ error: 'Video not available yet' }, { status: 404 });
    }

    // 3. Check purchase access using Management API
    const fullAccess = await executeSQL(
      `SELECT id FROM public.purchases WHERE user_id = '${user.id}' AND type = 'full' AND status = 'verified' LIMIT 1`
    );

    if (!fullAccess || fullAccess.length === 0) {
      const singleAccess = await executeSQL(
        `SELECT id FROM public.purchases WHERE user_id = '${user.id}' AND movie_id = '${movieId}' AND type = 'single' AND status = 'verified' LIMIT 1`
      );

      if (!singleAccess || singleAccess.length === 0) {
        return NextResponse.json(
          { error: 'Access denied. Purchase required.' },
          { status: 403 }
        );
      }
    }

    // 4. Generate secure embed URL
    const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
    const tokenSecret = process.env.BUNNY_TOKEN_SECRET;

    let embedUrl: string;

    if (libraryId && tokenSecret) {
      embedUrl = generateSecureEmbedUrl(
        movie.bunny_video_id,
        libraryId,
        tokenSecret,
        600
      );
    } else if (libraryId) {
      embedUrl = getBasicEmbedUrl(movie.bunny_video_id, libraryId);
    } else {
      return NextResponse.json(
        { error: 'Streaming service not configured' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      embedUrl,
      title: movie.title,
      expiresIn: 600,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
