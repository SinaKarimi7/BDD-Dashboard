import type { ServerResponse } from "node:http";

export function safeRedirectPath(state: unknown): string;

export function handleGitHubCallback(
  url: URL,
  res: ServerResponse,
  fetchImpl?: typeof fetch,
): Promise<void>;
