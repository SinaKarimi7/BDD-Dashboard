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

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function ghFetch<T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...headers(token), ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `GitHub API error: ${res.status}`);
  }
  return res.json();
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
  const raw = await ghFetch<
    {
      full_name: string;
      owner: { login: string };
      name: string;
      private: boolean;
      default_branch: string;
    }[]
  >(
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
  const raw = await ghFetch<{ name: string; commit: { sha: string } }[]>(
    token,
    `/repos/${owner}/${repo}/branches?per_page=100`,
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
  const encodedPath = path
    ? `/${encodeURIComponent(path).replace(/%2F/g, "/")}`
    : "";
  const raw = await ghFetch<
    { name: string; path: string; sha: string; type: string; size?: number }[]
  >(token, `/repos/${owner}/${repo}/contents${encodedPath}?ref=${branch}`);

  return raw.map((item) => ({
    name: item.name,
    path: item.path,
    sha: item.sha,
    type: item.type as "file" | "dir",
    size: item.size,
  }));
}

// Get .feature files recursively
export async function getFeatureFiles(
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
      const subItems = await getFeatureFiles(
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
  const encodedPath = encodeURIComponent(path).replace(/%2F/g, "/");
  const raw = await ghFetch<{ content: string; sha: string; encoding: string }>(
    token,
    `/repos/${owner}/${repo}/contents/${encodedPath}?ref=${branch}`,
  );

  const content = atob(raw.content.replace(/\n/g, ""));
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
  const encodedPath = encodeURIComponent(path).replace(/%2F/g, "/");
  const body: Record<string, string> = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
  };
  if (sha) body.sha = sha;
  if (branch) body.branch = branch;

  const raw = await ghFetch<{ content: { sha: string } }>(
    token,
    `/repos/${owner}/${repo}/contents/${encodedPath}`,
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
  const encodedPath = encodeURIComponent(path).replace(/%2F/g, "/");
  const body: Record<string, string> = { message, sha };
  if (branch) body.branch = branch;

  await ghFetch(token, `/repos/${owner}/${repo}/contents/${encodedPath}`, {
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
  // Get the SHA of the source branch
  const branches = await listBranches(token, owner, repo);
  const source = branches.find((b) => b.name === fromBranch);
  if (!source) throw new Error(`Branch "${fromBranch}" not found`);

  await ghFetch(token, `/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    body: JSON.stringify({
      ref: `refs/heads/${branchName}`,
      sha: source.sha,
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
