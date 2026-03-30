'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  movieId: string;
  movieTitle: string;
}

const PAYMENT_METHODS = [
  { id: 'ezcash', name: 'eZ Cash', icon: '📱', instructions: 'Send payment to eZ Cash number: 077XXXXXXX' },
  { id: 'onepay', name: 'OnePay', icon: '💳', instructions: 'Pay via OnePay merchant: DubLK' },
  { id: 'helapay', name: 'HelaPay', icon: '🏦', instructions: 'Transfer to HelaPay account: DubLK' },
  { id: 'crypto', name: 'Crypto', icon: '₿', instructions: 'Send USDT (TRC20) to: TXXXXXXXXXXXXXXXXXXXXXXX' },
];

type Step = 'plans' | 'payment' | 'proof';

export default function PricingModal({ isOpen, onClose, movieId, movieTitle }: PricingModalProps) {
  const { user, openAuthModal } = useAuth();
  const [step, setStep] = useState<Step>('plans');
  const [selectedPlan, setSelectedPlan] = useState<'single' | 'full' | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  if (!isOpen) return null;

  const handleSelectPlan = (plan: 'single' | 'full') => {
    setSelectedPlan(plan);
    setStep('payment');
  };

  const handleSelectPayment = (methodId: string) => {
    setSelectedMethod(methodId);
    // If user not logged in, require sign up before showing proof upload
    if (!user) {
      openAuthModal(() => {
        // After login, move to proof step
        setStep('proof');
      });
      return;
    }
    setStep('proof');
  };

  const handleBack = () => {
    if (step === 'proof') {
      setStep('payment');
    } else if (step === 'payment') {
      setStep('plans');
      setSelectedPlan(null);
      setSelectedMethod(null);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      openAuthModal(() => {});
      return;
    }
    if (!selectedPlan || !selectedMethod || !proofFile) {
      setError('Please upload your payment proof screenshot');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Upload proof image to Supabase Storage
      const fileName = `${user.id}/${Date.now()}-${proofFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, proofFile);

      if (uploadError) throw uploadError;

      // Create purchase record
      const { error: insertError } = await supabase.from('purchases').insert({
        user_id: user.id,
        movie_id: selectedPlan === 'single' ? movieId : null,
        type: selectedPlan,
        amount: selectedPlan === 'single' ? 20 : 100,
        payment_method: selectedMethod,
        payment_proof_url: fileName,
        status: 'pending',
      });

      if (insertError) throw insertError;

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit payment');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    // Reset all state on close
    setStep('plans');
    setSelectedPlan(null);
    setSelectedMethod(null);
    setProofFile(null);
    setSuccess(false);
    setError('');
    onClose();
  };

  const selectedMethodInfo = PAYMENT_METHODS.find(m => m.id === selectedMethod);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="rounded-2xl border border-white/10 bg-dark-900/95 backdrop-blur-xl shadow-2xl">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500 to-transparent" />

          <div className="p-6 sm:p-8">
            {/* Close */}
            <button onClick={handleClose} className="absolute top-4 right-4 text-dark-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {success ? (
              /* ===== SUCCESS STATE ===== */
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-display font-bold text-white mb-2">Payment Submitted!</h3>
                <p className="text-dark-400 text-sm mb-6">
                  Your payment proof has been submitted for verification. We&apos;ll notify you once it&apos;s approved.
                </p>
                <button onClick={handleClose} className="px-6 py-2.5 rounded-xl bg-brand-600 text-white font-medium hover:bg-brand-500 transition-colors">
                  Got it
                </button>
              </div>
            ) : (
              <>
                {/* Step Progress */}
                <div className="flex items-center gap-2 mb-6">
                  {step !== 'plans' && (
                    <button onClick={handleBack} className="p-1.5 rounded-lg hover:bg-white/5 text-dark-400 hover:text-white transition-all mr-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  <div className="flex items-center gap-2 flex-1">
                    {(['plans', 'payment', 'proof'] as Step[]).map((s, i) => (
                      <div key={s} className="flex items-center gap-2 flex-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                          step === s
                            ? 'bg-brand-500 text-white ring-2 ring-brand-500/30'
                            : i < ['plans', 'payment', 'proof'].indexOf(step)
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-dark-700 text-dark-500'
                        }`}>
                          {i < ['plans', 'payment', 'proof'].indexOf(step) ? '✓' : i + 1}
                        </div>
                        {i < 2 && (
                          <div className={`flex-1 h-0.5 rounded-full transition-all ${
                            i < ['plans', 'payment', 'proof'].indexOf(step)
                              ? 'bg-green-500/30'
                              : 'bg-dark-700'
                          }`} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ===== STEP 1: CHOOSE PLAN ===== */}
                {step === 'plans' && (
                  <div className="animate-fade-in">
                    <h2 className="text-xl font-display font-bold text-white mb-1">Choose a Plan</h2>
                    <p className="text-sm text-dark-400 mb-6">Select how you want to watch &quot;{movieTitle}&quot;</p>

                    <div className="space-y-3">
                      {/* Single Movie Plan */}
                      <button
                        onClick={() => handleSelectPlan('single')}
                        className="w-full p-5 rounded-xl border border-white/10 bg-white/5 hover:border-brand-500/50 hover:bg-brand-500/5 text-left transition-all duration-200 group/plan"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">🎬</span>
                              <h3 className="text-base font-semibold text-white">Single Movie</h3>
                            </div>
                            <p className="text-xs text-dark-400">Lifetime access to this movie only</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-white">{formatCurrency(20)}</p>
                            <p className="text-[10px] text-dark-500">one-time</p>
                          </div>
                        </div>
                      </button>

                      {/* Full Access Plan */}
                      <button
                        onClick={() => handleSelectPlan('full')}
                        className="w-full p-5 rounded-xl border border-brand-500/30 bg-brand-500/5 hover:border-brand-500/60 hover:bg-brand-500/10 text-left transition-all duration-200 relative overflow-hidden"
                      >
                        <div className="absolute -top-px -right-px px-3 py-1 bg-brand-500 text-white text-[10px] font-bold rounded-bl-xl">
                          BEST VALUE
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">👑</span>
                              <h3 className="text-base font-semibold text-white">All Movies</h3>
                            </div>
                            <p className="text-xs text-dark-400">Lifetime access to all 115+ movies</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-white">{formatCurrency(100)}</p>
                            <p className="text-[10px] text-dark-500">one-time</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* ===== STEP 2: PAYMENT METHOD ===== */}
                {step === 'payment' && (
                  <div className="animate-fade-in">
                    <h2 className="text-xl font-display font-bold text-white mb-1">Payment Method</h2>
                    <p className="text-sm text-dark-400 mb-1">
                      {selectedPlan === 'single' ? 'Single Movie' : 'All Movies'} — <span className="text-brand-400 font-semibold">{formatCurrency(selectedPlan === 'single' ? 20 : 100)}</span>
                    </p>
                    <p className="text-xs text-dark-500 mb-6">Select your preferred payment method</p>

                    <div className="grid grid-cols-2 gap-3">
                      {PAYMENT_METHODS.map((method) => (
                        <button
                          key={method.id}
                          onClick={() => handleSelectPayment(method.id)}
                          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/10 bg-white/5 hover:border-brand-500/40 hover:bg-brand-500/5 text-center transition-all duration-200"
                        >
                          <span className="text-2xl">{method.icon}</span>
                          <span className="text-sm font-medium text-white">{method.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ===== STEP 3: UPLOAD PROOF ===== */}
                {step === 'proof' && (
                  <div className="animate-fade-in">
                    <h2 className="text-xl font-display font-bold text-white mb-1">Upload Payment Proof</h2>
                    <p className="text-xs text-dark-500 mb-4">
                      {selectedPlan === 'single' ? 'Single Movie' : 'All Movies'} — {formatCurrency(selectedPlan === 'single' ? 20 : 100)} via {selectedMethodInfo?.name}
                    </p>

                    {/* Payment Instructions */}
                    {selectedMethodInfo && (
                      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-5">
                        <div className="flex items-start gap-3">
                          <span className="text-xl">{selectedMethodInfo.icon}</span>
                          <div>
                            <p className="text-sm font-medium text-blue-300 mb-1">{selectedMethodInfo.name} Instructions</p>
                            <p className="text-xs text-blue-300/70">{selectedMethodInfo.instructions}</p>
                            <p className="text-xs text-blue-300/70 mt-1">
                              Amount: <span className="font-bold text-blue-200">{formatCurrency(selectedPlan === 'single' ? 20 : 100)}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Upload Area */}
                    <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-brand-500/30 transition-colors mb-5">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      />
                      {proofFile ? (
                        <div className="text-center">
                          <svg className="w-10 h-10 text-green-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm font-medium text-white">{proofFile.name}</p>
                          <p className="text-xs text-dark-400 mt-1">Click to change file</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <svg className="w-10 h-10 text-dark-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-sm text-dark-300">Upload payment screenshot</p>
                          <p className="text-xs text-dark-500 mt-1">PNG, JPG up to 5MB</p>
                        </div>
                      )}
                    </label>

                    {error && (
                      <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {error}
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      onClick={handleSubmit}
                      disabled={!proofFile || uploading}
                      className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:from-brand-500 hover:to-brand-400 transition-all duration-200 shadow-lg shadow-brand-500/25"
                    >
                      {uploading ? 'Submitting...' : 'Submit Payment Proof'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
