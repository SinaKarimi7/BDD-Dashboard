type PublicEnvName =
  | "VITE_GITHUB_CLIENT_ID"
  | "VITE_API_ORIGIN"
  | "VITE_SUPABASE_URL"
  | "VITE_SUPABASE_ANON_KEY";

declare global {
  interface Window {
    __BDD_CONFIG__?: Partial<Record<PublicEnvName, string>>;
  }
}

export function publicEnv(name: PublicEnvName): string {
  const runtime = window.__BDD_CONFIG__?.[name];
  if (typeof runtime === "string" && runtime !== "") return runtime;
  const built = import.meta.env[name];
  return typeof built === "string" ? built : "";
}
