import assert from "node:assert/strict";
import { test } from "node:test";
import {
  handleGitHubCallback,
  safeAppOrigin,
  safeRedirectPath,
  type HttpResponse,
} from "./github-callback.ts";

interface MockResponse extends HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

function mockRes(): MockResponse {
  return {
    status: 0,
    headers: {},
    body: "",
    writeHead(status: number, headers?: Record<string, string>) {
      this.status = status;
      this.headers = headers ?? {};
    },
    end(body?: string) {
      this.body = body ?? "";
    },
  };
}

test("safeRedirectPath keeps app paths", () => {
  assert.equal(safeRedirectPath("/projects/abc/github"), "/projects/abc/github");
  assert.equal(safeRedirectPath("https://evil.example"), "/");
  assert.equal(safeRedirectPath("//evil.example"), "/");
  assert.equal(safeRedirectPath(null), "/");
});

test("safeRedirectPath rejects paths a browser turns into another host", () => {
  assert.equal(safeRedirectPath("/\t/evil.example"), "/");
  assert.equal(safeRedirectPath("/\n/evil.example"), "/");
  assert.equal(safeRedirectPath("/\r/evil.example"), "/");
  assert.equal(safeRedirectPath("/\\evil.example"), "/");
  assert.equal(safeRedirectPath("/%09/evil.example"), "/");
});

test("safeAppOrigin keeps an origin", () => {
  assert.equal(safeAppOrigin("https://user.github.io"), "https://user.github.io");
  assert.equal(safeAppOrigin("https://user.github.io/repo"), "");
  assert.equal(safeAppOrigin("javascript:alert(1)"), "");
});

test("missing code is 400", async () => {
  const res = mockRes();
  await handleGitHubCallback(new URL("http://localhost/api/github/callback"), res);
  assert.equal(res.status, 400);
});

test("missing OAuth config is 500", async () => {
  const res = mockRes();
  await handleGitHubCallback(
    new URL("http://localhost/api/github/callback?code=abc"),
    res,
    fetch,
    {},
  );
  assert.equal(res.status, 500);
});

test("exchanges the code and redirects to state", async () => {
  const res = mockRes();
  await handleGitHubCallback(
    new URL("http://localhost/api/github/callback?code=abc&state=/projects/1/github"),
    res,
    async () => ({
      json: async () => ({ access_token: "tok en" }),
    }),
    { GITHUB_CLIENT_ID: "id", GITHUB_CLIENT_SECRET: "secret" },
  );
  assert.equal(res.status, 302);
  assert.equal(
    res.headers.Location,
    "/projects/1/github#github_token=tok%20en",
  );
});

test("APP_ORIGIN sends the token back to the site", async () => {
  const res = mockRes();
  await handleGitHubCallback(
    new URL("http://localhost/api/github/callback?code=abc&state=/projects/1/github"),
    res,
    async () => ({
      json: async () => ({ access_token: "tok" }),
    }),
    {
      GITHUB_CLIENT_ID: "id",
      GITHUB_CLIENT_SECRET: "secret",
      APP_ORIGIN: "https://user.github.io",
    },
  );
  assert.equal(
    res.headers.Location,
    "https://user.github.io/projects/1/github#github_token=tok",
  );
});
