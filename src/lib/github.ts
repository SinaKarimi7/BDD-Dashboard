// ─── GitHub REST API Client ─────────────────────────────────
// Uses the GitHub REST API directly with fetch. No external deps needed.

import type { GitHubRepo, GitHubBranch, GitHubContentItem } from "@/types";

const API = "https://api.github.com";

// ─── OAuth ──────────────────────────────────────────────────

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID as
  | string
  | undefined;

/**
 * Start the GitHub OAuth flow by redirecting to GitHub's authorize page.
 * The Vercel serverless function at /api/github/callback handles the token exchange.
 */
export function startOAuthFlow(redirectPath: string) {
  if (!GITHUB_CLIENT_ID) {
    throw new Error(
      "VITE_GITHUB_CLIENT_ID is not configured. Set it in your environment variables.",
    );
  }

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    scope: "repo",
    redirect_uri: `${window.location.origin}/api/github/callback`,
    state: redirectPath,
  });

  window.location.href = `https://github.com/login/oauth/authorize?${params}`;
}

/**
 * Check if OAuth is configured (client ID is available).
 */
export function isOAuthConfigured(): boolean {
  return !!GITHUB_CLIENT_ID;
}

/**
 * Extract a GitHub token from the URL hash fragment (set by the OAuth callback).
 * Returns the token and cleans up the URL.
 */
export function extractOAuthToken(): string | null {
  const hash = window.location.hash;
  const match = hash.match(/github_token=([^&]+)/);
  if (match) {
    // Clean the hash from the URL without triggering navigation
    const cleanHash = hash
      .replace(/[#&]?github_token=[^&]+/, "")
      .replace(/^#$/, "");
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search + cleanHash,
    );
    return decodeURIComponent(match[1]);
  }
  return null;
}

// GitHub sends file content as base64 of the raw UTF-8 bytes.
function decodeBase64Utf8(b64: string): string {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64Utf8(text: string): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(text)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function ghRequest(
  token: string,
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { ...headers(token), ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `GitHub API error: ${res.status}`);
  }
  return res;
}

async function ghFetch<T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await ghRequest(token, `${API}${path}`, init);
  return res.json();
}

const MAX_PAGES = 10;

function nextPageUrl(link: string | null): string | null {
  if (!link) return null;
  for (const part of link.split(",")) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="?next"?/);
    if (match) return match[1];
  }
  return null;
}

// Follows the Link header so lists don't stop at the first 100 items.
async function ghFetchAll<T>(token: string, path: string): Promise<T[]> {
  const items: T[] = [];
  let url: string | null = `${API}${path}`;
  for (let page = 0; url && page < MAX_PAGES; page++) {
    const res = await ghRequest(token, url);
    items.push(...((await res.json()) as T[]));
    url = nextPageUrl(res.headers.get("link"));
  }
  return items;
}

function repoPath(owner: string, repo: string) {
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

// Encode each segment but keep the slashes between them
function encodePath(path: string) {
  return encodeURIComponent(path).replace(/%2F/g, "/");
}

// ─── User ───────────────────────────────────────────────────

export async function getUser(token: string) {
  return ghFetch<{ login: string; avatar_url: string; name: string | null }>(
    token,
    "/user",
  );
}

// ─── Repos ──────────────────────────────────────────────────

export async function listRepos(token: string): Promise<GitHubRepo[]> {
  const raw = await ghFetchAll<{
    full_name: string;
    owner: { login: string };
    name: string;
    private: boolean;
    default_branch: string;
  }>(
    token,
    "/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
  );

  return raw.map((r) => ({
    full_name: r.full_name,
    owner: r.owner.login,
    name: r.name,
    private: r.private,
    default_branch: r.default_branch,
  }));
}

// ─── Branches ───────────────────────────────────────────────

export async function listBranches(
  token: string,
  owner: string,
  repo: string,
): Promise<GitHubBranch[]> {
  const raw = await ghFetchAll<{ name: string; commit: { sha: string } }>(
    token,
    `${repoPath(owner, repo)}/branches?per_page=100`,
  );
  return raw.map((b) => ({ name: b.name, sha: b.commit.sha }));
}

// ─── Contents ───────────────────────────────────────────────

export async function getContents(
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch: string,
): Promise<GitHubContentItem[]> {
  const encodedPath = path ? `/${encodePath(path)}` : "";
  const raw = await ghFetch<
    { name: string; path: string; sha: string; type: string; size?: number }[]
  >(
    token,
    `${repoPath(owner, repo)}/contents${encodedPath}?ref=${encodeURIComponent(branch)}`,
  );

  return raw.map((item) => ({
    name: item.name,
    path: item.path,
    sha: item.sha,
    type: item.type as "file" | "dir",
    size: item.size,
  }));
}

// Get .feature files under `path` with one recursive tree request
export async function getFeatureFiles(
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch: string,
): Promise<GitHubContentItem[]> {
  const tree = await ghFetch<{
    truncated: boolean;
    tree: { path: string; type: string; sha: string; size?: number }[];
  }>(
    token,
    `${repoPath(owner, repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
  );
  // Very large repos return a partial tree, so walk the folders instead
  if (tree.truncated) {
    return walkFeatureFiles(token, owner, repo, path, branch);
  }

  const base = path.replace(/^\/+|\/+$/g, "");
  const prefix = base ? `${base}/` : "";
  return tree.tree
    .filter(
      (item) =>
        item.type === "blob" &&
        item.path.endsWith(".feature") &&
        item.path.startsWith(prefix),
    )
    .map((item) => ({
      name: item.path.slice(item.path.lastIndexOf("/") + 1),
      path: item.path,
      sha: item.sha,
      type: "file" as const,
      size: item.size,
    }));
}

async function walkFeatureFiles(
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch: string,
): Promise<GitHubContentItem[]> {
  const items = await getContents(token, owner, repo, path, branch);
  const results: GitHubContentItem[] = [];

  for (const item of items) {
    if (item.type === "file" && item.name.endsWith(".feature")) {
      results.push(item);
    } else if (item.type === "dir") {
      const subItems = await walkFeatureFiles(
        token,
        owner,
        repo,
        item.path,
        branch,
      );
      results.push(...subItems);
    }
  }

  return results;
}

// ─── File Content ───────────────────────────────────────────

export async function getFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch: string,
): Promise<{ content: string; sha: string }> {
  const raw = await ghFetch<{ content: string; sha: string; encoding: string }>(
    token,
    `${repoPath(owner, repo)}/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`,
  );

  const content = decodeBase64Utf8(raw.content.replace(/\n/g, ""));
  return { content, sha: raw.sha };
}

// ─── Create / Update File ───────────────────────────────────

export async function createOrUpdateFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  sha?: string,
  branch?: string,
): Promise<{ sha: string }> {
  const body: Record<string, string> = {
    message,
    content: encodeBase64Utf8(content),
  };
  if (sha) body.sha = sha;
  if (branch) body.branch = branch;

  const raw = await ghFetch<{ content: { sha: string } }>(
    token,
    `${repoPath(owner, repo)}/contents/${encodePath(path)}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
  );
  return { sha: raw.content.sha };
}

// ─── Delete File ────────────────────────────────────────────

export async function deleteGitHubFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  sha: string,
  message: string,
  branch?: string,
): Promise<void> {
  const body: Record<string, string> = { message, sha };
  if (branch) body.branch = branch;

  await ghFetch(token, `${repoPath(owner, repo)}/contents/${encodePath(path)}`, {
    method: "DELETE",
    body: JSON.stringify(body),
  });
}

// ─── Branches ───────────────────────────────────────────────

export async function createBranch(
  token: string,
  owner: string,
  repo: string,
  branchName: string,
  fromBranch: string,
): Promise<void> {
  // Read the source ref directly so it works past the first page of branches
  const source = await ghFetch<{ object: { sha: string } }>(
    token,
    `${repoPath(owner, repo)}/git/ref/heads/${encodePath(fromBranch)}`,
  );

  await ghFetch(token, `${repoPath(owner, repo)}/git/refs`, {
    method: "POST",
    body: JSON.stringify({
      ref: `refs/heads/${branchName}`,
      sha: source.object.sha,
    }),
  });
}

// ─── Validate Token ─────────────────────────────────────────

export async function validateToken(token: string): Promise<boolean> {
  try {
    await getUser(token);
    return true;
  } catch {
    return false;
  }
}
