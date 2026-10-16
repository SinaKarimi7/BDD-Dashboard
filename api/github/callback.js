import { handleGitHubCallback } from "../../server/github-callback.mjs";

export default async function handler(req, res) {
  const host = req.headers.host || "localhost";
  const proto = req.headers["x-forwarded-proto"] || "http";
  const url = new URL(req.url || "/", `${proto}://${host}`);
  await handleGitHubCallback(url, res);
}
