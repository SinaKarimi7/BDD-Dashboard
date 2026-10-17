const TOKEN_URL = "https://github.com/login/oauth/access_token";

export interface HttpResponse {
  writeHead(status: number, headers?: Record<string, string>): void;
  end(body?: string): void;
}

type TokenFetch = (url: string, init: RequestInit) => Promise<{ json(): Promise<unknown> }>;

export function safeRedirectPath(state: unknown): string {
  if (typeof state !== "string") return "/";
  if (!state.startsWith("/") || state.startsWith("//")) return "/";
  if (state.includes("\\") || state.includes("://")) return "/";
  return state;
}

export function safeAppOrigin(value: unknown): string {
  if (typeof value !== "string" || value === "") return "";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "";
  if (url.username || url.password || url.search || url.hash) return "";
  if (url.pathname !== "" && url.pathname !== "/") return "";
  return url.origin;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function redirectTarget(path: string): string {
  return `${safeAppOrigin(process.env.APP_ORIGIN)}${path}`;
}

function redirect(res: HttpResponse, location: string): void {
  res.writeHead(302, { Location: location });
  res.end();
}

function json(res: HttpResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function oauthError(data: Record<string, unknown>): string | null {
  if (!data.error) return null;
  return typeof data.error_description === "string"
    ? data.error_description
    : String(data.error);
}

function accessToken(data: Record<string, unknown>): string | null {
  const token = data.access_token;
  return typeof token === "string" && token !== "" ? token : null;
}

export async function handleGitHubCallback(
  url: URL,
  res: HttpResponse,
  fetchImpl: TokenFetch = fetch,
): Promise<void> {
  const code = url.searchParams.get("code");
  if (!code) return json(res, 400, { error: "Missing authorization code" });

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return json(res, 500, {
      error: "GitHub OAuth is not configured on the server.",
    });
  }

  try {
    const tokenRes = await fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });
    const payload = await tokenRes.json();
    const data = isRecord(payload) ? payload : {};
    const message = oauthError(data);
    if (message) {
      return redirect(res, redirectTarget(`/?github_error=${encodeURIComponent(message)}`));
    }
    const token = accessToken(data);
    if (!token) {
      return redirect(
        res,
        redirectTarget(`/?github_error=${encodeURIComponent("OAuth token exchange failed")}`),
      );
    }
    const path = safeRedirectPath(url.searchParams.get("state"));
    return redirect(
      res,
      redirectTarget(`${path}#github_token=${encodeURIComponent(token)}`),
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "OAuth token exchange failed";
    return redirect(res, redirectTarget(`/?github_error=${encodeURIComponent(message)}`));
  }
}
