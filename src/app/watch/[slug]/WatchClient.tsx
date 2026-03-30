'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface WatchClientProps {
  movie: {
    id: string;
    title: string;
    slug: string;
  };
}

export default function WatchClient({ movie }: WatchClientProps) {
  const { user, isLoading: authLoading, openAuthModal } = useAuth();
  const router = useRouter();
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStreamUrl = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/stream/${movie.id}`);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          // Not logged in — redirect to movie page
          router.replace(`/movies/${movie.slug}`);
          return;
        }
        if (res.status === 403) {
          // No purchase — redirect to movie page where they can buy
          router.replace(`/movies/${movie.slug}`);
          return;
        }
        throw new Error(data.error || 'Failed to load stream');
      }

      setEmbedUrl(data.embedUrl);

      // Auto-refresh token before it expires
      if (data.expiresIn) {
        // Clear any existing timer
        if (refreshTimerRef.current) {
          clearTimeout(refreshTimerRef.current);
        }
        const refreshTimeout = Math.max((data.expiresIn - 60) * 1000, 60000); // Min 1 min
        refreshTimerRef.current = setTimeout(() => {
          fetchStreamUrl();
        }, refreshTimeout);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [movie.id, movie.slug, router]);

  // When user signs out while watching, immediately kill the stream and redirect
  useEffect(() => {
    if (authLoading) return; // Wait for auth to initialize

    if (!user) {
      // User signed out or not logged in — kill the stream
      setEmbedUrl(null);
      setError(null);
      
      // Clear refresh timer
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }

      // Redirect to movie page
      router.replace(`/movies/${movie.slug}`);
      return;
    }

    // User is logged in — fetch stream
    fetchStreamUrl();
  }, [user, authLoading, movie.slug, router, fetchStreamUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  // If auth is still loading, show loading spinner
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black pt-16 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Verifying access..." />
      </div>
    );
  }

  // If no user, show nothing (will redirect)
  if (!user) {
    return (
      <div className="min-h-screen bg-black pt-16 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Redirecting..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-16 page-enter">
      {/* Theater Header */}
      <div className="bg-dark-950/80 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/movies/${movie.slug}`)}
              className="p-2 rounded-lg hover:bg-white/5 text-dark-400 hover:text-white transition-all"
              aria-label="Go back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-sm font-medium text-white">{movie.title}</h1>
              <p className="text-xs text-dark-500">සිංහල හඩකැවූ - SINHALA DUBBED</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/20 border border-brand-500/30">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-brand-300 font-medium">Secure Stream</span>
          </div>
        </div>
      </div>

      {/* Video Container */}
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 120px)' }}>
        {loading ? (
          <LoadingSpinner size="lg" text="Loading secure stream..." />
        ) : error ? (
          <div className="text-center px-4">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Unable to Load Stream</h3>
            <p className="text-dark-400 text-sm mb-4">{error}</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={fetchStreamUrl}
                className="px-6 py-2.5 rounded-xl bg-brand-600 text-white font-medium hover:bg-brand-500 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push(`/movies/${movie.slug}`)}
                className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        ) : embedUrl ? (
          <div className="w-full h-full max-w-[1400px] mx-auto px-4">
            <div className="relative w-full h-0 pb-[56.25%] rounded-xl overflow-hidden shadow-2xl shadow-black/50">
              <iframe
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={`Watch ${movie.title}`}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
