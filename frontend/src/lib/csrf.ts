/** CSRF token handling for session-authenticated writes.
 *
 * Django rotates the CSRF token after login and logout. The React app asks
 * `/api/auth/csrf/` for the current token (which also sets the cookie) and
 * re-fetches it after every auth change.
 */

import { API_BASE } from "./config";

let storedToken: string | null = null;

function cookieToken(): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** The token to send in `X-CSRFToken` (may be null before the first request). */
export function getCsrfToken(): string | null {
  return storedToken ?? cookieToken();
}

/** Ask Django for a fresh token. Never throws: an auth page should still work
 * when the token request fails, and the next write will show the real error. */
export async function refreshCsrfToken(): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE}/auth/csrf/`, {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });
    if (!response.ok) {
      storedToken = cookieToken();
      return storedToken;
    }
    const data = (await response.json()) as { csrfToken?: string };
    storedToken = data.csrfToken ?? cookieToken();
  } catch {
    storedToken = cookieToken();
  }
  return storedToken;
}
