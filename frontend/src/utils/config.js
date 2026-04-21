/**
 * Runtime configuration loader.
 *
 * Instead of baking NEXT_PUBLIC_API_URL into the build, the frontend fetches
 * /api/config from the backend (proxied by Next.js rewrites) on first use.
 * This means the same Docker image can be pointed at any backend without
 * rebuilding.
 */

let _apiUrl = null;
let _fetchPromise = null;

/**
 * Returns the resolved API base URL.
 * On the server side (SSR/rewrites) we always use the internal Docker hostname.
 * On the client side we load it once from /api/config and cache it.
 */
export async function getApiUrl() {
  // Server-side: use internal network hostname directly
  if (typeof window === 'undefined') {
    return 'http://opcc-backend:3001';
  }

  // Already resolved
  if (_apiUrl) return _apiUrl;

  // Deduplicate concurrent calls
  if (_fetchPromise) return _fetchPromise;

  _fetchPromise = fetch('/api/config')
    .then((res) => res.json())
    .then((data) => {
      _apiUrl = data.apiUrl;
      return _apiUrl;
    })
    .catch(() => {
      // Fallback: same origin (works when backend is behind a reverse proxy)
      _apiUrl = '';
      return _apiUrl;
    });

  return _fetchPromise;
}
