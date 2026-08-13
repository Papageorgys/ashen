// Lovable auth shim — replaced with direct Supabase OAuth for Replit.
// This module is kept for import compatibility. The auth page calls
// supabase.auth.signInWithOAuth directly instead of going through this.
export const lovable = {
  auth: {
    signInWithOAuth: async (_provider: string, _opts?: unknown) => {
      return { error: new Error("Use supabase.auth.signInWithOAuth directly.") };
    },
  },
};
