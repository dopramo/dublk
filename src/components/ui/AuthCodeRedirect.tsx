'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

/**
 * Safety-net component: detects OAuth/email-confirmation `?code=` params
 * that land on the wrong page (e.g. homepage) and redirects them to
 * /auth/callback so the session exchange can happen properly.
 */
export default function AuthCodeRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      // Build the proper callback URL with the code
      const callbackUrl = `/auth/callback?code=${encodeURIComponent(code)}`;
      router.replace(callbackUrl);
    }
  }, [searchParams, router]);

  return null;
}
