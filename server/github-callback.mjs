const TOKEN_URL = "https://github.com/login/oauth/access_token";

export function safeRedirectPath(state) {
  if (typeof state !== "string") return "/";
  if (!state.startsWith("/") || state.startsWith("//")) return "/";
  if (state.includes("\\") || state.includes("://")) return "/";
  return state;
}

export function safeAppOrigin(value) {
  if (typeof value !== "string" || value === "") return "";
  let url;
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

function redirectTarget(path) {
  return `${safeAppOrigin(process.env.APP_ORIGIN)}${path}`;
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

export async function handleGitHubCallback(url, res, fetchImpl = fetch) {
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
    const data = await tokenRes.json();
    if (data?.error) {
      const msg =
        typeof data.error_description === "string"
          ? data.error_description
          : String(data.error);
      return redirect(res, redirectTarget(`/?github_error=${encodeURIComponent(msg)}`));
    }
    if (typeof data?.access_token !== "string" || !data.access_token) {
      return redirect(
        res,
        redirectTarget(`/?github_error=${encodeURIComponent("OAuth token exchange failed")}`),
      );
    }
    const path = safeRedirectPath(url.searchParams.get("state"));
    return redirect(
      res,
      redirectTarget(`${path}#github_token=${encodeURIComponent(data.access_token)}`),
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "OAuth token exchange failed";
    return redirect(res, redirectTarget(`/?github_error=${encodeURIComponent(message)}`));
  }
}
