import crypto from 'crypto';

/**
 * Generate a secure, time-limited embed URL for Bunny.net Stream.
 * Uses SHA256(tokenSecret + videoId + expiration) as a hex-encoded token.
 * 
 * @see https://docs.bunny.net/docs/stream-embedding-videos#token-authentication
 */
export function generateSecureEmbedUrl(
  videoId: string,
  libraryId: string,
  tokenSecret: string,
  expirationSeconds: number = 600 // 10 minutes
): string {
  const expires = Math.floor(Date.now() / 1000) + expirationSeconds;
  
  // Bunny Stream embed token: SHA256(security_key + video_id + expiration_time) as hex
  const hashableBase = tokenSecret + videoId + expires;
  const token = crypto.createHash('sha256').update(hashableBase).digest('hex');

  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}`;
}

/**
 * Get a basic (unsigned) embed URL. Used as fallback when no token secret is configured.
 */
export function getBasicEmbedUrl(videoId: string, libraryId: string): string {
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;
}
