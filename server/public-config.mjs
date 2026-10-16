const KEYS = [
  "VITE_GITHUB_CLIENT_ID",
  "VITE_API_ORIGIN",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
];

export function publicConfigScript(env = process.env) {
  const body = {};
  for (const key of KEYS) {
    const value = env[key];
    body[key] = typeof value === "string" ? value : "";
  }
  return `window.__BDD_CONFIG__=${JSON.stringify(body)};\n`;
}
