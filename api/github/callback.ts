// Vercel Serverless Function — GitHub OAuth Callback
// Exchanges the authorization code for an access token and redirects back to the app.

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, state } = req.query;

  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Missing authorization code" });
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res
      .status(500)
      .json({ error: "GitHub OAuth is not configured on the server." });
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch(
      "https://github.com/login/oauth/access_token",
      {
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
      },
    );

    const data = await tokenRes.json();

    if (data.error) {
      return res.redirect(
        `/?github_error=${encodeURIComponent(data.error_description || data.error)}`,
      );
    }

    // state contains the redirect path (e.g. /projects/abc/github)
    const redirectPath = typeof state === "string" ? state : "/dashboard";

    // Redirect back to the app with the token in a hash fragment (not logged by servers)
    return res.redirect(`${redirectPath}#github_token=${data.access_token}`);
  } catch (err: any) {
    return res.redirect(
      `/?github_error=${encodeURIComponent(err.message || "OAuth token exchange failed")}`,
    );
  }
}
