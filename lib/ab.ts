export const AB_HOMEPAGE_COOKIE = 'ab-homepage';

/** Read a cookie value client-side */
export function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]*)`)
  );
  return match ? match[1] : null;
}

/** Evenly assign to a random bucket using crypto */
export function getBucket(buckets: readonly string[]): string {
  const n =
    crypto.getRandomValues(new Uint32Array(1))[0] / (0xffffffff + 1);
  const pct = 100 / buckets.length;
  let remaining = n * 100;
  return (
    buckets.find(() => {
      remaining -= pct;
      return remaining <= 0;
    }) ?? buckets[0]
  );
}
