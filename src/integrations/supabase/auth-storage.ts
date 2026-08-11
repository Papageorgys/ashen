// Session persistence that honours a "remember me" preference.
//   remember on  -> localStorage   (survives browser restarts — the default)
//   remember off -> sessionStorage (cleared when the tab/window closes)
// The preference flag itself always lives in localStorage so it can be read
// synchronously while the Supabase client boots.

const REMEMBER_KEY = "ashen.auth.remember";

/** Record whether the next sign-in should be remembered across browser restarts. */
export function setRememberSession(remember: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
}

/** Whether sessions are currently set to persist across browser restarts (default: yes). */
export function getRememberSession(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(REMEMBER_KEY) !== "0";
}

type WebStorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

/**
 * Storage adapter for supabase-js. Reads from whichever store holds the token
 * (so toggling "remember" mid-session still resolves), and writes to the store
 * chosen by the current preference — keeping the token in exactly one place.
 * Returns undefined during SSR, matching the previous localStorage-or-undefined.
 */
export function createAuthStorage(): WebStorageLike | undefined {
  if (typeof window === "undefined") return undefined;
  const primary = () => (getRememberSession() ? window.localStorage : window.sessionStorage);
  const secondary = () => (getRememberSession() ? window.sessionStorage : window.localStorage);
  return {
    getItem: (key) => window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key),
    setItem: (key, value) => {
      primary().setItem(key, value);
      secondary().removeItem(key);
    },
    removeItem: (key) => {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    },
  };
}
