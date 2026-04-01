'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatCurrency, timeAgo } from '@/lib/utils';

type DashTab = 'profile' | 'purchases';

export default function DashboardPage() {
  const { user, isLoading, openAuthModal, signOut } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  // Tab
  const [activeTab, setActiveTab] = useState<DashTab>('profile');

  // Purchase data
  const [purchases, setPurchases] = useState<any[]>([]);
  const [purchaseLoading, setPurchaseLoading] = useState(true);

  // Profile form
  const [fullName, setFullName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const supabase = createClient();

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      openAuthModal(() => {});
    }
  }, [user, isLoading, openAuthModal]);

  // Load profile data from user metadata
  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || '');
    }
  }, [user]);

  // Fetch purchases
  useEffect(() => {
    async function fetchPurchases() {
      if (!user) return;

      const { data } = await supabase
        .from('purchases')
        .select(`
          *,
          movies:movie_id (title, slug, poster_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setPurchases(data || []);
      setPurchaseLoading(false);
    }

    if (user) fetchPurchases();
  }, [user, supabase]);

  // Save profile
  const handleSaveProfile = useCallback(async () => {
    if (!user) return;
    setProfileSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
      });

      if (error) throw error;
      showToast('Profile updated successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setProfileSaving(false);
    }
  }, [user, fullName, supabase, showToast]);

  // Change password
  const handleChangePassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess(true);
      showToast('Password updated successfully!', 'success');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password');
    } finally {
      setPasswordSaving(false);
    }
  }, [newPassword, confirmPassword, supabase, showToast]);

  if (isLoading || !user) {
    return (
      <div className="pt-32 flex justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  const verifiedPurchases = purchases.filter(p => p.status === 'verified');
  const hasFullAccess = verifiedPurchases.some(p => p.type === 'full');
  const avatarLetter = (user.user_metadata?.full_name?.[0] || user.email?.[0] || 'U').toUpperCase();
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const isOAuthUser = user.app_metadata?.provider !== 'email';

  const statusColors: Record<string, string> = {
    verified: 'bg-green-500/10 text-green-400 border-green-500/20',
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <div className="pt-24 pb-16 page-enter">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header Card */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-dark-800/80 to-dark-900/80 backdrop-blur-sm p-6 sm:p-8 mb-8 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-brand-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-brand-600/5 rounded-full blur-2xl" />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-xl shadow-brand-500/20 flex-shrink-0">
              {avatarLetter}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-display font-bold text-white truncate">{displayName}</h1>
              <p className="text-dark-400 text-sm mt-0.5 truncate">{user.email}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {hasFullAccess ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    Full Access
                  </span>
                ) : verifiedPurchases.length > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                    {verifiedPurchases.length} movie{verifiedPurchases.length > 1 ? 's' : ''} unlocked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full bg-dark-700 text-dark-400 border border-white/5">
                    Free Tier
                  </span>
                )}
                {isOAuthUser && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full bg-white/5 text-dark-400 border border-white/5">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    {user.app_metadata?.provider === 'google' ? 'Google' : user.app_metadata?.provider === 'apple' ? 'Apple' : 'OAuth'}
                  </span>
                )}
              </div>
            </div>

            {/* Sign out */}
            <button
              onClick={() => signOut()}
              className="px-4 py-2 text-sm text-dark-400 hover:text-red-400 rounded-xl border border-white/10 hover:border-red-500/20 hover:bg-red-500/5 transition-all flex-shrink-0"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-dark-800/50 border border-white/5 mb-8 w-fit">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/25'
                : 'text-dark-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profile
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'purchases'
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/25'
                : 'text-dark-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Purchases
            {purchases.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-white/10">
                {purchases.length}
              </span>
            )}
          </button>
        </div>

        {/* ===== PROFILE TAB ===== */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-fade-in">
            {/* Personal Information */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                  <svg className="w-4.5 h-4.5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Personal Information</h2>
                  <p className="text-dark-500 text-xs">Update your name and personal details</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label htmlFor="profile-name" className="block text-sm font-medium text-dark-300 mb-1.5">
                    Full Name
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all"
                    placeholder="Your full name"
                  />
                </div>

                {/* Email — read only */}
                <div>
                  <label htmlFor="profile-email" className="block text-sm font-medium text-dark-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="profile-email"
                      type="email"
                      value={user.email || ''}
                      readOnly
                      className="w-full px-4 py-3 rounded-xl bg-dark-800/60 border border-white/5 text-dark-400 cursor-not-allowed pr-24"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-dark-700 border border-white/5">
                      <svg className="w-3 h-3 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span className="text-[10px] text-dark-500 font-medium">Locked</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-dark-500 mt-1.5">
                    Email address cannot be changed for security reasons.
                  </p>
                </div>

                {/* Account Created */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">
                    Member Since
                  </label>
                  <p className="px-4 py-3 rounded-xl bg-dark-800/60 border border-white/5 text-dark-400 text-sm">
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : '—'}
                  </p>
                </div>

                {/* Save Button */}
                <div className="pt-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={profileSaving || fullName === (user.user_metadata?.full_name || '')}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-medium text-sm hover:from-brand-500 hover:to-brand-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-brand-500/25"
                  >
                    {profileSaving ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Saving...
                      </span>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Change Password — only for email users */}
            {!isOAuthUser && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <svg className="w-4.5 h-4.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Change Password</h2>
                    <p className="text-dark-500 text-xs">Update your account password</p>
                  </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label htmlFor="new-password" className="block text-sm font-medium text-dark-300 mb-1.5">
                      New Password
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                      minLength={6}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all"
                      placeholder="Minimum 6 characters"
                    />
                  </div>

                  <div>
                    <label htmlFor="confirm-password" className="block text-sm font-medium text-dark-300 mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                      minLength={6}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all"
                      placeholder="Re-enter new password"
                    />
                  </div>

                  {passwordError && (
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-red-400 text-sm">{passwordError}</p>
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-green-400 text-sm">Password updated successfully!</p>
                    </div>
                  )}

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={passwordSaving || !newPassword || !confirmPassword}
                      className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-medium text-sm hover:bg-white/10 hover:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {passwordSaving ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Updating...
                        </span>
                      ) : (
                        'Update Password'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* OAuth users - password info */}
            {isOAuthUser && (
              <div className="rounded-2xl border border-white/5 bg-dark-800/30 p-6">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4.5 h-4.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">Social Login Account</h3>
                    <p className="text-dark-400 text-xs leading-relaxed">
                      Your account uses {user.app_metadata?.provider === 'google' ? 'Google' : user.app_metadata?.provider === 'apple' ? 'Apple' : 'social'} authentication.
                      Password management is handled by your {user.app_metadata?.provider === 'google' ? 'Google' : user.app_metadata?.provider === 'apple' ? 'Apple' : 'OAuth'} account.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== PURCHASES TAB ===== */}
        {activeTab === 'purchases' && (
          <div className="space-y-6 animate-fade-in">
            {/* Access Status */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Access Status</h2>
              {hasFullAccess ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-green-300 font-semibold">Full Access Active</p>
                    <p className="text-green-400/60 text-xs">Lifetime access to all movies</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-dark-800/50 border border-white/5">
                  <div className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center">
                    <svg className="w-5 h-5 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-dark-300 font-semibold">
                      {verifiedPurchases.length > 0
                        ? `${verifiedPurchases.length} movie${verifiedPurchases.length > 1 ? 's' : ''} unlocked`
                        : 'No active access'}
                    </p>
                    <p className="text-dark-500 text-xs">Purchase movies to start watching</p>
                  </div>
                </div>
              )}
            </div>

            {/* Purchase History */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Purchase History</h2>

              {purchaseLoading ? (
                <div className="py-8 flex justify-center">
                  <LoadingSpinner text="Loading purchases..." />
                </div>
              ) : purchases.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-2xl bg-dark-800 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <p className="text-dark-400 mb-1 font-medium">No purchases yet</p>
                  <p className="text-dark-500 text-sm mb-5">Browse our collection and start watching</p>
                  <Link
                    href="/movies"
                    className="inline-flex px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-500 transition-colors shadow-lg shadow-brand-500/20"
                  >
                    Browse Movies
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {purchases.map((purchase) => (
                    <div
                      key={purchase.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-dark-800/50 border border-white/5 hover:border-white/10 transition-all"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
                          <span className="text-lg">{purchase.type === 'full' ? '👑' : '🎬'}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {purchase.type === 'full'
                              ? 'Full Access (All Movies)'
                              : purchase.movies?.title || 'Single Movie'}
                          </p>
                          <p className="text-xs text-dark-500">{timeAgo(purchase.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-sm font-medium text-dark-300">
                          {formatCurrency(purchase.amount)}
                        </span>
                        <span className={`px-2.5 py-1 text-[11px] font-medium rounded-full border ${statusColors[purchase.status]}`}>
                          {purchase.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
