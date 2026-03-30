import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="relative mt-20 border-t border-white/5">
      {/* Gradient line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="mb-4">
              <Image
                src="/logo.png"
                alt="dubLK"
                width={145}
                height={48}
                className="h-15 w-auto object-contain"
              />
            </div>
            <p className="text-sm text-dark-400 max-w-sm leading-relaxed">
              Sri Lanka&apos;s premier destination for Sinhala dubbed movies. Watch your favorite Hollywood movies in Sinhala, anytime, anywhere.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Browse</h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/movies" className="text-sm text-dark-400 hover:text-brand-400 transition-colors">
                  All Movies
                </Link>
              </li>
              <li>
                <Link href="/movies?genre=Animation" className="text-sm text-dark-400 hover:text-brand-400 transition-colors">
                  Animation
                </Link>
              </li>
              <li>
                <Link href="/movies?genre=Action" className="text-sm text-dark-400 hover:text-brand-400 transition-colors">
                  Action
                </Link>
              </li>
              <li>
                <Link href="/movies?genre=Adventure" className="text-sm text-dark-400 hover:text-brand-400 transition-colors">
                  Adventure
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Account</h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/dashboard" className="text-sm text-dark-400 hover:text-brand-400 transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <span className="text-sm text-dark-400">
                  Support: info@dublk.com
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-dark-500">
            © {new Date().getFullYear()} DubLK. All rights reserved. Movie metadata provided by TMDB.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-dark-600">Powered by</span>
            <span className="text-xs text-dark-400 font-medium">Next.js + Supabase</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
