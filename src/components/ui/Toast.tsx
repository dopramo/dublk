'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  exiting: boolean;
  createdAt: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

let toastId = 0;

// Global function for use outside React tree (e.g., AuthContext that wraps ToastProvider)
let globalShowToast: ((message: string, type?: ToastType) => void) | null = null;

export function showToastGlobal(message: string, type: ToastType = 'success') {
  if (globalShowToast) {
    globalShowToast(message, type);
  }
}

const TOAST_DURATION = 5000;
const EXIT_DURATION = 400;

const TOAST_CONFIG: Record<ToastType, {
  bg: string;
  border: string;
  text: string;
  progressColor: string;
  icon: JSX.Element;
}> = {
  success: {
    bg: 'bg-gradient-to-r from-emerald-500/15 to-green-600/10',
    border: 'border-emerald-500/25',
    text: 'text-emerald-300',
    progressColor: 'bg-emerald-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  error: {
    bg: 'bg-gradient-to-r from-red-500/15 to-rose-600/10',
    border: 'border-red-500/25',
    text: 'text-red-300',
    progressColor: 'bg-red-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
  info: {
    bg: 'bg-gradient-to-r from-blue-500/15 to-indigo-600/10',
    border: 'border-blue-500/25',
    text: 'text-blue-300',
    progressColor: 'bg-blue-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  warning: {
    bg: 'bg-gradient-to-r from-amber-500/15 to-yellow-600/10',
    border: 'border-amber-500/25',
    text: 'text-amber-300',
    progressColor: 'bg-amber-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: number) => void }) {
  const config = TOAST_CONFIG[toast.type];
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef(toast.createdAt);
  const animationRef = useRef<number>();

  useEffect(() => {
    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / TOAST_DURATION) * 100);
      setProgress(remaining);
      if (remaining > 0 && !toast.exiting) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [toast.exiting]);

  return (
    <div
      className={`pointer-events-auto transform transition-all ${
        toast.exiting
          ? 'animate-toast-exit'
          : 'animate-toast-enter'
      }`}
    >
      <div
        className={`relative flex items-start gap-3 px-4 py-3.5 rounded-2xl border backdrop-blur-2xl shadow-2xl shadow-black/40 min-w-[320px] max-w-[420px] overflow-hidden ${config.bg} ${config.border}`}
      >
        {/* Icon */}
        <div className={`flex-shrink-0 mt-0.5 ${config.text}`}>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${config.bg} ${config.border} border`}>
            {config.icon}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-1">
          <p className={`text-sm font-medium leading-snug ${config.text}`}>
            {toast.message}
          </p>
        </div>

        {/* Close */}
        <button
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 mt-0.5 opacity-40 hover:opacity-100 transition-opacity duration-200"
        >
          <svg className={`w-4 h-4 ${config.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5">
          <div
            className={`h-full ${config.progressColor} rounded-full transition-none`}
            style={{ width: `${progress}%`, opacity: 0.6 }}
          />
        </div>
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, EXIT_DURATION);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type, exiting: false, createdAt: Date.now() }]);
    setTimeout(() => {
      removeToast(id);
    }, TOAST_DURATION);
  }, [removeToast]);

  // Register global function
  useEffect(() => {
    globalShowToast = showToast;
    return () => {
      globalShowToast = null;
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container — right side */}
      <div className="fixed top-20 right-4 z-[70] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
