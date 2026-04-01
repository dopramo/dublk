'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { timeAgo, formatCurrency } from '@/lib/utils';

interface Movie {
  id: string;
  title: string;
  slug: string;
  tmdb_id: number;
  is_published: boolean;
  bunny_video_id: string | null;
  poster_url: string | null;
  description: string | null;
  runtime: number | null;
  created_at: string;
  rating: number;
  release_year: number | null;
  genres: string[];
}

interface Purchase {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  status: string;
  payment_method: string;
  payment_proof_url: string | null;
  created_at: string;
  profiles?: { email: string; full_name: string };
  movies?: { id: string; title: string };
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  is_admin: boolean;
  created_at: string;
  purchases: Purchase[];
}

type Tab = 'movies' | 'payments' | 'users' | 'add';

export default function AdminPage() {
  const { user, isAdmin, isLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('movies');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingMovie, setEditingMovie] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    bunny_video_id: string;
    runtime: string;
    description: string;
  }>({ bunny_video_id: '', runtime: '', description: '' });
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Add movie form
  const [tmdbSearch, setTmdbSearch] = useState('');
  const [tmdbResults, setTmdbResults] = useState<any[]>([]);
  const [selectedTmdb, setSelectedTmdb] = useState<any>(null);
  const [bunnyVideoId, setBunnyVideoId] = useState('');
  const [publishing, setPublishing] = useState(false);

  // Users tab
  const [usersLoading, setUsersLoading] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [grantType, setGrantType] = useState<'full' | 'single'>('full');
  const [grantMovieId, setGrantMovieId] = useState('');
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      router.push('/');
    }
  }, [user, isAdmin, isLoading, router]);

  // Fetch movies and payments
  useEffect(() => {
    async function fetchData() {
      if (!user || !isAdmin) return;

      try {
        const [moviesRes, paymentsRes] = await Promise.all([
          fetch('/api/admin/movies'),
          fetch('/api/payments/verify?status=pending'),
        ]);

        if (moviesRes.ok) {
          const { movies } = await moviesRes.json();
          setMovies(movies || []);
        }
        if (paymentsRes.ok) {
          const { purchases } = await paymentsRes.json();
          setPurchases(purchases || []);
        }
      } catch (err) {
        console.error('Failed to fetch admin data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, isAdmin]);

  // Fetch users when users tab is opened
  useEffect(() => {
    async function fetchUsers() {
      if (tab !== 'users' || users.length > 0) return;
      setUsersLoading(true);
      try {
        const res = await fetch('/api/admin/users');
        if (res.ok) {
          const { users: usersData } = await res.json();
          setUsers(usersData || []);
        }
      } catch (err) {
        console.error('Failed to fetch users:', err);
      } finally {
        setUsersLoading(false);
      }
    }
    fetchUsers();
  }, [tab, users.length]);

  // Search TMDB
  const handleTmdbSearch = async () => {
    if (!tmdbSearch.trim()) return;
    try {
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(tmdbSearch)}`);
      const { results } = await res.json();
      setTmdbResults(results || []);
    } catch {
      console.error('TMDB search failed');
    }
  };

  // Add movie
  const handleAddMovie = async () => {
    if (!selectedTmdb) return;
    setPublishing(true);

    try {
      const slug = selectedTmdb.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        + (selectedTmdb.release_date ? `-${selectedTmdb.release_date.split('-')[0]}` : '');

      const res = await fetch('/api/admin/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdb_id: selectedTmdb.id,
          title: selectedTmdb.title,
          slug,
          description: selectedTmdb.overview,
          poster_url: selectedTmdb.poster_path ? `https://image.tmdb.org/t/p/w500${selectedTmdb.poster_path}` : null,
          backdrop_url: selectedTmdb.backdrop_path ? `https://image.tmdb.org/t/p/original${selectedTmdb.backdrop_path}` : null,
          genres: (selectedTmdb.genre_ids || []).map((id: number) => {
            const genreMap: Record<number, string> = {
              28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
              80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
              14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
              9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
              53: 'Thriller', 10752: 'War', 37: 'Western',
            };
            return genreMap[id] || '';
          }).filter(Boolean),
          rating: selectedTmdb.vote_average || 0,
          release_year: selectedTmdb.release_date ? parseInt(selectedTmdb.release_date.split('-')[0]) : null,
          bunny_video_id: bunnyVideoId || null,
          is_published: true,
        }),
      });

      if (res.ok) {
        const { movie } = await res.json();
        setMovies((prev) => [movie, ...prev]);
        setSelectedTmdb(null);
        setTmdbSearch('');
        setTmdbResults([]);
        setBunnyVideoId('');
        setTab('movies');
        showToast('Movie added successfully!', 'success');
      } else {
        const { error } = await res.json();
        showToast(`Error: ${error}`, 'error');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setPublishing(false);
    }
  };

  // Toggle publish
  const togglePublish = async (movie: Movie) => {
    setActionLoading(movie.id);
    try {
      const res = await fetch('/api/admin/movies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: movie.id, is_published: !movie.is_published }),
      });
      if (res.ok) {
        setMovies((prev) =>
          prev.map((m) => (m.id === movie.id ? { ...m, is_published: !m.is_published } : m))
        );
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Start editing movie
  const startEdit = (movie: Movie) => {
    setEditingMovie(movie.id);
    setEditForm({
      bunny_video_id: movie.bunny_video_id || '',
      runtime: movie.runtime?.toString() || '',
      description: movie.description || '',
    });
    setSaveMessage(null);
    setDeleteConfirm(null);
  };

  // Save movie edits
  const saveEdit = async (movie: Movie) => {
    setActionLoading(movie.id);
    setSaveMessage(null);
    try {
      const updates: Record<string, any> = { id: movie.id };

      if (editForm.bunny_video_id !== (movie.bunny_video_id || '')) {
        updates.bunny_video_id = editForm.bunny_video_id || null;
      }
      if (editForm.runtime !== (movie.runtime?.toString() || '')) {
        updates.runtime = editForm.runtime ? parseInt(editForm.runtime) : null;
      }
      if (editForm.description !== (movie.description || '')) {
        updates.description = editForm.description || null;
      }

      if (Object.keys(updates).length <= 1) {
        setEditingMovie(null);
        return;
      }

      const res = await fetch('/api/admin/movies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const { movie: updated } = await res.json();
        setMovies((prev) => prev.map((m) => (m.id === movie.id ? { ...m, ...updated } : m)));
        setSaveMessage('Saved!');
        setTimeout(() => {
          setEditingMovie(null);
          setSaveMessage(null);
        }, 1500);
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Delete movie
  const handleDeleteMovie = async (movieId: string) => {
    setActionLoading(movieId);
    try {
      const res = await fetch('/api/admin/movies', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: movieId }),
      });
      if (res.ok) {
        setMovies((prev) => prev.filter((m) => m.id !== movieId));
        setEditingMovie(null);
        setDeleteConfirm(null);
        showToast('Movie deleted successfully', 'success');
      } else {
        const { error } = await res.json();
        showToast(`Delete failed: ${error}`, 'error');
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Verify payment
  const verifyPayment = async (purchaseId: string, status: 'verified' | 'rejected') => {
    setActionLoading(purchaseId);
    try {
      const res = await fetch('/api/payments/verify', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId, status }),
      });
      if (res.ok) {
        setPurchases((prev) => prev.filter((p) => p.id !== purchaseId));
        showToast(`Payment ${status}`, 'success');
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle user admin
  const toggleUserAdmin = async (userId: string, currentAdmin: boolean) => {
    setActionLoading(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, is_admin: !currentAdmin }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, is_admin: !currentAdmin } : u))
        );
        showToast(`Admin status updated`, 'success');
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Grant access to user
  const handleGrantAccess = async (userId: string) => {
    if (grantType === 'single' && !grantMovieId) {
      showToast('Please select a movie', 'error');
      return;
    }
    setActionLoading(`grant-${userId}`);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          type: grantType,
          movieId: grantType === 'single' ? grantMovieId : undefined,
        }),
      });
      if (res.ok) {
        const { purchase } = await res.json();
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, purchases: [purchase, ...u.purchases] } : u
          )
        );
        setGrantMovieId('');
        showToast('Access granted successfully!', 'success');
      } else {
        const { error } = await res.json();
        showToast(`Error: ${error}`, 'error');
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Revoke access
  const handleRevokeAccess = async (userId: string, purchaseId: string) => {
    setActionLoading(`revoke-${purchaseId}`);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, purchases: u.purchases.filter((p) => p.id !== purchaseId) }
              : u
          )
        );
        showToast('Access revoked', 'success');
      }
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading || !isAdmin) {
    return (
      <div className="pt-32 flex justify-center">
        <LoadingSpinner size="lg" text="Loading admin panel..." />
      </div>
    );
  }

  // Filtered users for search
  const filteredUsers = userSearch
    ? users.filter(
        (u) =>
          u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.full_name?.toLowerCase().includes(userSearch.toLowerCase())
      )
    : users;

  return (
    <div className="pt-24 pb-16 page-enter">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">Admin Panel</h1>
          <p className="text-dark-400 text-sm mt-1">Manage movies, payments, users, and content</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
          <div className="p-4 rounded-xl bg-dark-800/50 border border-white/5">
            <p className="text-2xl font-bold text-white">{movies.length}</p>
            <p className="text-xs text-dark-400 mt-1">Total Movies</p>
          </div>
          <div className="p-4 rounded-xl bg-dark-800/50 border border-white/5">
            <p className="text-2xl font-bold text-green-400">{movies.filter(m => m.bunny_video_id).length}</p>
            <p className="text-xs text-dark-400 mt-1">With Videos</p>
          </div>
          <div className="p-4 rounded-xl bg-dark-800/50 border border-white/5">
            <p className="text-2xl font-bold text-yellow-400">{movies.filter(m => !m.bunny_video_id).length}</p>
            <p className="text-xs text-dark-400 mt-1">No Video</p>
          </div>
          <div className="p-4 rounded-xl bg-dark-800/50 border border-white/5">
            <p className="text-2xl font-bold text-brand-400">{purchases.length}</p>
            <p className="text-xs text-dark-400 mt-1">Pending Payments</p>
          </div>
          <div className="p-4 rounded-xl bg-dark-800/50 border border-white/5">
            <p className="text-2xl font-bold text-purple-400">{users.length}</p>
            <p className="text-xs text-dark-400 mt-1">Users</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-dark-800/50 border border-white/5 mb-8 w-fit flex-wrap">
          {(['movies', 'payments', 'users', 'add'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
                tab === t
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/25'
                  : 'text-dark-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {t === 'movies' && `🎬 Movies (${movies.length})`}
              {t === 'payments' && `💳 Payments (${purchases.length})`}
              {t === 'users' && `👥 Users${users.length > 0 ? ` (${users.length})` : ''}`}
              {t === 'add' && '➕ Add Movie'}
            </button>
          ))}
        </div>

        {/* Movies Tab */}
        {tab === 'movies' && (
          <div className="space-y-3">
            {loading ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner text="Loading movies..." />
              </div>
            ) : movies.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-dark-400 mb-4">No movies yet</p>
                <button onClick={() => setTab('add')} className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-500 transition-colors">
                  Add First Movie
                </button>
              </div>
            ) : (
              movies.map((movie) => (
                <div
                  key={movie.id}
                  className="rounded-xl bg-dark-800/50 border border-white/5 hover:border-white/10 transition-all overflow-hidden"
                >
                  {/* Movie Row */}
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex-shrink-0 w-12 h-16 rounded-lg bg-dark-700 overflow-hidden">
                        {movie.poster_url && (
                          <img src={movie.poster_url} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{movie.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-dark-500">TMDB: {movie.tmdb_id}</span>
                          {movie.bunny_video_id ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                              ✓ Video Ready
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                              ⚠ No Video
                            </span>
                          )}
                          {movie.release_year && <span className="text-xs text-dark-500">{movie.release_year}</span>}
                          {movie.runtime && <span className="text-xs text-dark-500">{movie.runtime}m</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Edit button */}
                      <button
                        onClick={() => editingMovie === movie.id ? setEditingMovie(null) : startEdit(movie)}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                          editingMovie === movie.id
                            ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                            : 'bg-dark-700 text-dark-300 border border-white/5 hover:border-white/10 hover:text-white'
                        }`}
                      >
                        {editingMovie === movie.id ? '✕ Close' : '✎ Edit'}
                      </button>
                      {/* Publish toggle */}
                      <button
                        onClick={() => togglePublish(movie)}
                        disabled={actionLoading === movie.id}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                          movie.is_published
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20'
                            : 'bg-dark-700 text-dark-400 border border-white/5 hover:border-white/10'
                        }`}
                      >
                        {actionLoading === movie.id ? '...' : movie.is_published ? '● Published' : '○ Draft'}
                      </button>
                    </div>
                  </div>

                  {/* Edit Panel (expandable) */}
                  {editingMovie === movie.id && (
                    <div className="border-t border-white/5 p-4 bg-dark-900/50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        {/* Bunny Video ID */}
                        <div>
                          <label className="block text-xs font-medium text-dark-300 mb-1.5">
                            🎥 Bunny.net Video ID
                          </label>
                          <input
                            type="text"
                            value={editForm.bunny_video_id}
                            onChange={(e) => setEditForm({ ...editForm, bunny_video_id: e.target.value })}
                            placeholder="e.g., dc9d5179-7d46-4b59-bb40-c226c65da802"
                            className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                          />
                          <p className="text-[10px] text-dark-500 mt-1">
                            Get this from your Bunny.net Stream dashboard after uploading your video
                          </p>
                        </div>

                        {/* Runtime */}
                        <div>
                          <label className="block text-xs font-medium text-dark-300 mb-1.5">
                            ⏱️ Runtime (minutes)
                          </label>
                          <input
                            type="number"
                            value={editForm.runtime}
                            onChange={(e) => setEditForm({ ...editForm, runtime: e.target.value })}
                            placeholder="e.g., 152"
                            className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                          />
                        </div>
                      </div>

                      {/* Description */}
                      <div className="mb-4">
                        <label className="block text-xs font-medium text-dark-300 mb-1.5">
                          📝 Description
                        </label>
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none"
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => saveEdit(movie)}
                            disabled={actionLoading === movie.id}
                            className="px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-500 disabled:opacity-50 transition-all"
                          >
                            {actionLoading === movie.id ? 'Saving...' : '💾 Save Changes'}
                          </button>
                          <button
                            onClick={() => setEditingMovie(null)}
                            className="px-5 py-2 rounded-lg bg-white/5 text-dark-300 text-sm font-medium hover:bg-white/10 transition-all"
                          >
                            Cancel
                          </button>
                          {saveMessage && (
                            <span className="text-sm text-green-400 font-medium animate-fade-in">
                              ✓ {saveMessage}
                            </span>
                          )}
                        </div>

                        {/* Delete Button */}
                        <div className="flex items-center gap-2">
                          {deleteConfirm === movie.id ? (
                            <>
                              <span className="text-xs text-red-400">Are you sure?</span>
                              <button
                                onClick={() => handleDeleteMovie(movie.id)}
                                disabled={actionLoading === movie.id}
                                className="px-3 py-1.5 text-xs rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 font-medium transition-all disabled:opacity-50"
                              >
                                {actionLoading === movie.id ? 'Deleting...' : 'Yes, Delete'}
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-dark-400 hover:text-white transition-all"
                              >
                                No
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(movie.id)}
                              className="px-3 py-1.5 text-xs rounded-lg text-red-400/60 border border-transparent hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400 font-medium transition-all"
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Payments Tab */}
        {tab === 'payments' && (
          <div className="space-y-3">
            {purchases.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💳</span>
                </div>
                <p className="text-dark-400 mb-1">No pending payments</p>
                <p className="text-dark-500 text-sm">New payments will appear here when users submit payment proof</p>
              </div>
            ) : (
              purchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="p-4 rounded-xl bg-dark-800/50 border border-white/5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">
                        {purchase.profiles?.email || 'Unknown User'}
                      </p>
                      <p className="text-xs text-dark-500 mt-0.5">
                        {purchase.type === 'full' ? '👑 Full Access' : `🎬 ${purchase.movies?.title || 'Single Movie'}`} •
                        {' '}{formatCurrency(purchase.amount)} •
                        {' '}{purchase.payment_method} •
                        {' '}{timeAgo(purchase.created_at)}
                      </p>
                      {purchase.payment_proof_url && (
                        <a
                          href={purchase.payment_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                        >
                          📎 View Payment Proof
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => verifyPayment(purchase.id, 'verified')}
                        disabled={actionLoading === purchase.id}
                        className="px-4 py-2 text-xs font-medium rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-all disabled:opacity-50"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => verifyPayment(purchase.id, 'rejected')}
                        disabled={actionLoading === purchase.id}
                        className="px-4 py-2 text-xs font-medium rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-50"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users by email or name..."
                className="w-full max-w-md px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 text-sm"
              />
            </div>

            {usersLoading ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner text="Loading users..." />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-dark-400">{userSearch ? 'No users match your search' : 'No users found'}</p>
              </div>
            ) : (
              filteredUsers.map((u) => {
                const verifiedPurchases = u.purchases.filter((p) => p.status === 'verified');
                const hasFullAccess = verifiedPurchases.some((p) => p.type === 'full');
                const isExpanded = expandedUser === u.id;

                return (
                  <div
                    key={u.id}
                    className="rounded-xl bg-dark-800/50 border border-white/5 hover:border-white/10 transition-all overflow-hidden"
                  >
                    {/* User Row */}
                    <button
                      onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                      className="w-full flex items-center justify-between p-4 text-left"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-sm font-bold">
                          {(u.full_name?.[0] || u.email?.[0] || 'U').toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {u.full_name || 'No Name'}
                          </p>
                          <p className="text-xs text-dark-500 truncate">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {u.is_admin && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                            Admin
                          </span>
                        )}
                        {hasFullAccess ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-medium">
                            Full Access
                          </span>
                        ) : verifiedPurchases.length > 0 ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-medium">
                            {verifiedPurchases.length} movie{verifiedPurchases.length > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-dark-700 text-dark-400 border border-white/5 font-medium">
                            Free
                          </span>
                        )}
                        <svg
                          className={`w-4 h-4 text-dark-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {/* Expanded Panel */}
                    {isExpanded && (
                      <div className="border-t border-white/5 p-4 bg-dark-900/50 space-y-4">
                        {/* User Info */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-1">User ID</p>
                            <p className="text-xs text-dark-300 font-mono truncate">{u.id}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-1">Member Since</p>
                            <p className="text-xs text-dark-300">{timeAgo(u.created_at)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-1">Total Purchases</p>
                            <p className="text-xs text-dark-300">{u.purchases.length}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-1">Admin</p>
                            <button
                              onClick={() => toggleUserAdmin(u.id, u.is_admin)}
                              disabled={actionLoading === u.id}
                              className={`text-xs px-2 py-0.5 rounded-md transition-all ${
                                u.is_admin
                                  ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                                  : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
                              }`}
                            >
                              {actionLoading === u.id ? '...' : u.is_admin ? '✓ Yes' : '✗ No'}
                            </button>
                          </div>
                        </div>

                        {/* Current Access */}
                        <div>
                          <p className="text-xs font-medium text-dark-300 mb-2">🎫 Access & Purchases</p>
                          {u.purchases.length === 0 ? (
                            <p className="text-xs text-dark-500">No purchases</p>
                          ) : (
                            <div className="space-y-1.5">
                              {u.purchases.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex items-center justify-between p-2.5 rounded-lg bg-dark-800/70 border border-white/5"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-sm">{p.type === 'full' ? '👑' : '🎬'}</span>
                                    <div className="min-w-0">
                                      <p className="text-xs text-white truncate">
                                        {p.type === 'full' ? 'Full Access' : p.movies?.title || 'Single Movie'}
                                      </p>
                                      <p className="text-[10px] text-dark-500">
                                        {p.payment_method === 'admin_grant' ? 'Admin granted' : `${p.payment_method}`} •{' '}
                                        {timeAgo(p.created_at)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span
                                      className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                                        p.status === 'verified'
                                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                          : p.status === 'pending'
                                          ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                                      }`}
                                    >
                                      {p.status}
                                    </span>
                                    {p.status === 'verified' && (
                                      <button
                                        onClick={() => handleRevokeAccess(u.id, p.id)}
                                        disabled={actionLoading === `revoke-${p.id}`}
                                        className="text-[10px] px-1.5 py-0.5 rounded text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                                      >
                                        {actionLoading === `revoke-${p.id}` ? '...' : 'Revoke'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Grant Access */}
                        <div className="p-3 rounded-xl bg-brand-500/5 border border-brand-500/10">
                          <p className="text-xs font-medium text-brand-300 mb-2.5">➕ Grant Access</p>
                          <div className="flex items-end gap-2 flex-wrap">
                            <div>
                              <label className="block text-[10px] text-dark-400 mb-1">Type</label>
                              <select
                                value={grantType}
                                onChange={(e) => setGrantType(e.target.value as 'full' | 'single')}
                                className="px-3 py-2 rounded-lg bg-dark-800 border border-white/10 text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                              >
                                <option value="full">Full Access</option>
                                <option value="single">Single Movie</option>
                              </select>
                            </div>
                            {grantType === 'single' && (
                              <div className="flex-1 min-w-[200px]">
                                <label className="block text-[10px] text-dark-400 mb-1">Movie</label>
                                <select
                                  value={grantMovieId}
                                  onChange={(e) => setGrantMovieId(e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg bg-dark-800 border border-white/10 text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                                >
                                  <option value="">Select a movie...</option>
                                  {movies.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.title}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                            <button
                              onClick={() => handleGrantAccess(u.id)}
                              disabled={actionLoading === `grant-${u.id}`}
                              className="px-4 py-2 rounded-lg bg-brand-600 text-white text-xs font-medium hover:bg-brand-500 disabled:opacity-50 transition-all"
                            >
                              {actionLoading === `grant-${u.id}` ? 'Granting...' : 'Grant'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Add Movie Tab */}
        {tab === 'add' && (
          <div className="max-w-2xl">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-white mb-1">Add New Movie</h2>
              <p className="text-sm text-dark-400 mb-6">Search for a movie on TMDB, then add its Bunny.net video</p>

              {/* TMDB Search */}
              <div className="mb-6">
                <label className="block text-sm text-dark-300 mb-2">Step 1: Search TMDB</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tmdbSearch}
                    onChange={(e) => setTmdbSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTmdbSearch()}
                    placeholder="Enter movie title..."
                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  />
                  <button
                    onClick={handleTmdbSearch}
                    className="px-6 py-3 rounded-xl bg-brand-600 text-white font-medium hover:bg-brand-500 transition-colors"
                  >
                    Search
                  </button>
                </div>
              </div>

              {/* TMDB Results */}
              {tmdbResults.length > 0 && !selectedTmdb && (
                <div className="mb-6 max-h-60 overflow-y-auto space-y-2 rounded-xl border border-white/10 p-2">
                  {tmdbResults.map((result: any) => (
                    <button
                      key={result.id}
                      onClick={() => setSelectedTmdb(result)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-left transition-all"
                    >
                      {result.poster_path && (
                        <img
                          src={`https://image.tmdb.org/t/p/w92${result.poster_path}`}
                          alt=""
                          className="w-10 h-14 rounded object-cover"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">{result.title}</p>
                        <p className="text-xs text-dark-500">
                          {result.release_date ? result.release_date.split('-')[0] : 'Unknown year'} •{' '}
                          ⭐ {result.vote_average?.toFixed(1)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Movie */}
              {selectedTmdb && (
                <div className="mb-6">
                  <label className="block text-sm text-dark-300 mb-2">Step 2: Selected Movie</label>
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-brand-500/10 border border-brand-500/20 mb-4">
                    {selectedTmdb.poster_path && (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${selectedTmdb.poster_path}`}
                        alt=""
                        className="w-12 h-16 rounded object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{selectedTmdb.title}</p>
                      <p className="text-xs text-dark-400">
                        {selectedTmdb.release_date?.split('-')[0]} • ⭐ {selectedTmdb.vote_average?.toFixed(1)}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedTmdb(null)}
                      className="ml-auto text-dark-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Bunny Video ID */}
                  <div className="mb-4">
                    <label className="block text-sm text-dark-300 mb-2">
                      Step 3: Bunny.net Video ID <span className="text-dark-500">(optional — add later via Edit)</span>
                    </label>
                    <input
                      type="text"
                      value={bunnyVideoId}
                      onChange={(e) => setBunnyVideoId(e.target.value)}
                      placeholder="e.g., dc9d5179-7d46-4b59-bb40-c226c65da802"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                    />
                    <p className="text-[11px] text-dark-500 mt-1.5">
                      Upload your video to <a href="https://dash.bunny.net" target="_blank" className="text-brand-400 hover:text-brand-300">Bunny.net Stream</a> → copy the Video GUID
                    </p>
                  </div>

                  <button
                    onClick={handleAddMovie}
                    disabled={publishing}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold hover:from-brand-500 hover:to-brand-400 transition-all disabled:opacity-50 shadow-lg shadow-brand-500/25"
                  >
                    {publishing ? 'Adding...' : '🚀 Add & Publish Movie'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
