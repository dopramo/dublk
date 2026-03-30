'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import MovieRow from '@/components/ui/MovieRow';
import PricingModal from '@/components/payment/PricingModal';

interface Movie {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  rating: number;
  release_year: number | null;
  runtime: number | null;
  genres: string[];
  bunny_video_id: string | null;
}

interface MovieDetailClientProps {
  movie: Movie;
  relatedMovies: Movie[];
}

export default function MovieDetailClient({ movie, relatedMovies }: MovieDetailClientProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);
  const [hasPending, setHasPending] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function checkAccess() {
      if (!user) {
        setCheckingAccess(false);
        return;
      }

      // Check full access
      const { data: full } = await supabase
        .from('purchases')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('type', 'full')
        .eq('status', 'verified')
        .limit(1);

      if (full && full.length > 0) {
        setHasAccess(true);
        setCheckingAccess(false);
        return;
      }

      // Check single access
      const { data: single } = await supabase
        .from('purchases')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('movie_id', movie.id)
        .eq('status', 'verified')
        .limit(1);

      if (single && single.length > 0) {
        setHasAccess(true);
      }

      // Check pending
      const { data: pending } = await supabase
        .from('purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .or(`movie_id.eq.${movie.id},type.eq.full`)
        .limit(1);

      if (pending && pending.length > 0) {
        setHasPending(true);
      }

      setCheckingAccess(false);
    }

    checkAccess();
  }, [user, movie.id, supabase]);

  const handleWatch = () => {
    // If user already has verified access, go directly to watch
    if (hasAccess) {
      router.push(`/watch/${movie.slug}`);
      return;
    }

    // Otherwise, ALWAYS show pricing first (login comes later when they pick a payment method)
    setShowPricing(true);
  };

  const formatRuntime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="page-enter">
      {/* Hero Section */}
      <section className="relative h-[60vh] sm:h-[70vh] w-full overflow-hidden">
        {/* Backdrop */}
        {movie.backdrop_url ? (
          <Image
            src={movie.backdrop_url}
            alt={movie.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        ) : (
          <div className="w-full h-full bg-dark-900" />
        )}

        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-dark-950 via-dark-950/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-transparent to-dark-950/30" />
      </section>

      {/* Content */}
      <div className="relative -mt-40 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Poster */}
            <div className="flex-shrink-0 w-48 sm:w-56 mx-auto md:mx-0">
              <div className="aspect-[2/3] relative rounded-2xl overflow-hidden shadow-2xl shadow-brand-500/10 border border-white/10">
                <Image
                  src={movie.poster_url || '/placeholder-poster.jpg'}
                  alt={movie.title}
                  fill
                  className="object-cover"
                  sizes="224px"
                />
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/20 border border-brand-500/30 mb-3">
                <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
                <span className="text-xs font-semibold text-brand-300 tracking-wide">සිංහල හඩකැවූ - SINHALA DUBBED</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white mb-4 leading-tight">
                {movie.title}
              </h1>

              {/* Meta */}
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                {movie.rating > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-500/15 border border-yellow-500/20">
                    <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-sm font-semibold text-yellow-300">{movie.rating.toFixed(1)}</span>
                  </div>
                )}
                {movie.release_year && (
                  <span className="text-sm text-dark-300">{movie.release_year}</span>
                )}
                {movie.runtime && (
                  <span className="text-sm text-dark-300">{formatRuntime(movie.runtime)}</span>
                )}
                {movie.genres.map((genre) => (
                  <span key={genre} className="px-2.5 py-1 text-xs rounded-full bg-white/5 border border-white/10 text-dark-300">
                    {genre}
                  </span>
                ))}
              </div>

              {/* Description */}
              {movie.description && (
                <p className="text-dark-300 leading-relaxed mb-8 max-w-2xl">
                  {movie.description}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handleWatch}
                  disabled={checkingAccess}
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold rounded-xl hover:from-brand-500 hover:to-brand-400 transition-all duration-200 shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                  {checkingAccess ? 'Checking...' : hasAccess ? 'Watch Now' : 'Watch Now'}
                </button>

                {hasPending && !hasAccess && (
                  <div className="px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-xs text-yellow-300">⏳ Payment pending verification</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Movies */}
      {relatedMovies.length > 0 && (
        <div className="mt-16">
          <MovieRow
            title="You May Also Like"
            movies={relatedMovies}
            icon="🎬"
          />
        </div>
      )}

      {/* Pricing Modal — 3-step flow */}
      <PricingModal
        isOpen={showPricing}
        onClose={() => setShowPricing(false)}
        movieId={movie.id}
        movieTitle={movie.title}
      />
    </div>
  );
}
