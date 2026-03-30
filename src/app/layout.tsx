import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import AuthModal from '@/components/auth/AuthModal';

export const metadata: Metadata = {
  title: {
    default: 'DubLK - Sinhala Dubbed Movies',
    template: '%s | DubLK',
  },
  description: 'Watch your favorite Hollywood movies dubbed in Sinhala. Sri Lanka\'s premier Sinhala dubbed movie streaming platform.',
  keywords: ['sinhala dubbed movies', 'sinhala movies', 'dubbed movies sri lanka', 'watch movies sinhala', 'DubLK'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'DubLK',
    title: 'DubLK - Sinhala Dubbed Movies',
    description: 'Watch your favorite Hollywood movies dubbed in Sinhala.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DubLK - Sinhala Dubbed Movies',
    description: 'Watch your favorite Hollywood movies dubbed in Sinhala.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col">
        <ToastProvider>
          <AuthProvider>
            <Navbar />
            <AuthModal />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
