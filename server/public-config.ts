const KEYS = [
  "VITE_GITHUB_CLIENT_ID",
  "VITE_API_ORIGIN",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
] as const;

type PublicKey = (typeof KEYS)[number];

export function publicConfigScript(env: NodeJS.ProcessEnv = process.env): string {
  const body: Record<PublicKey, string> = {
    VITE_GITHUB_CLIENT_ID: "",
    VITE_API_ORIGIN: "",
    VITE_SUPABASE_URL: "",
    VITE_SUPABASE_ANON_KEY: "",
  };
  for (const key of KEYS) {
    const value = env[key];
    body[key] = typeof value === "string" ? value : "";
  }
  return `window.__BDD_CONFIG__=${JSON.stringify(body)};\n`;
}
