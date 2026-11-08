export const SUPABASE_URL: string | undefined = import.meta.env.VITE_SUPABASE_URL || undefined;
export const SUPABASE_KEY: string | undefined =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || undefined;

/** Sync is only available when the build was given Supabase settings. */
export const syncConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);
