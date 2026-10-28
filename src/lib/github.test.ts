import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createBranch,
  getFeatureFiles,
  getFileContent,
  listBranches,
  listRepos,
} from "@/lib/github";

function jsonResponse(body: unknown, link?: string) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: link ? { link } : {},
  });
}

function mockFetch(...responses: Response[]) {
  const fn = vi.fn();
  for (const res of responses) fn.mockResolvedValueOnce(res);
  vi.stubGlobal("fetch", fn);
  return fn;
}

function calledUrls(fn: ReturnType<typeof vi.fn>) {
  return fn.mock.calls.map((call) => call[0] as string);
}

function branch(name: string) {
  return { name, commit: { sha: `sha-${name}` } };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("pagination", () => {
  it("follows rel=next links for branches", async () => {
    const page2 =
      "https://api.github.com/repositories/1/branches?per_page=100&page=2";
    const fetchMock = mockFetch(
      jsonResponse(
        [branch("main"), branch("dev")],
        `<${page2}>; rel="next", <${page2}>; rel="last"`,
      ),
      jsonResponse(
        [branch("feature/x")],
        `<https://api.github.com/x?page=1>; rel="prev"`,
      ),
    );

    const branches = await listBranches("t", "me", "repo");

    expect(branches.map((b) => b.name)).toEqual(["main", "dev", "feature/x"]);
    expect(calledUrls(fetchMock)).toEqual([
      "https://api.github.com/repos/me/repo/branches?per_page=100",
      page2,
    ]);
  });

  it("stops after the page cap", async () => {
    const fn = vi.fn(async () =>
      jsonResponse([branch("b")], `<https://api.github.com/next>; rel="next"`),
    );
    vi.stubGlobal("fetch", fn);

    const branches = await listBranches("t", "me", "repo");

    expect(fn).toHaveBeenCalledTimes(10);
    expect(branches).toHaveLength(10);
  });

  it("collects repos across pages", async () => {
    const repo = (name: string) => ({
      full_name: `me/${name}`,
      owner: { login: "me" },
      name,
      private: false,
      default_branch: "main",
    });
    mockFetch(
      jsonResponse(
        [repo("a")],
        `<https://api.github.com/user/repos?page=2>; rel="next"`,
      ),
      jsonResponse([repo("b")]),
    );

    const repos = await listRepos("t");

    expect(repos.map((r) => r.full_name)).toEqual(["me/a", "me/b"]);
  });
});

describe("getFeatureFiles", () => {
  it("reads the recursive tree and keeps .feature blobs under the base path", async () => {
    const fetchMock = mockFetch(
      jsonResponse({
        truncated: false,
        tree: [
          { path: "features", type: "tree", sha: "t1" },
          { path: "features/login.feature", type: "blob", sha: "s1", size: 10 },
          {
            path: "features/sub/cart.feature",
            type: "blob",
            sha: "s2",
            size: 20,
          },
          { path: "features/readme.md", type: "blob", sha: "s3" },
          { path: "featuresx/other.feature", type: "blob", sha: "s4" },
          { path: "root.feature", type: "blob", sha: "s5" },
          { path: "features/dir.feature", type: "tree", sha: "t2" },
        ],
      }),
    );

    const files = await getFeatureFiles(
      "t",
      "me",
      "repo",
      "features/",
      "release/1.0",
    );

    expect(files).toEqual([
      {
        name: "login.feature",
        path: "features/login.feature",
        sha: "s1",
        type: "file",
        size: 10,
      },
      {
        name: "cart.feature",
        path: "features/sub/cart.feature",
        sha: "s2",
        type: "file",
        size: 20,
      },
    ]);
    expect(calledUrls(fetchMock)).toEqual([
      "https://api.github.com/repos/me/repo/git/trees/release%2F1.0?recursive=1",
    ]);
  });

  it("returns every .feature file when there is no base path", async () => {
    mockFetch(
      jsonResponse({
        truncated: false,
        tree: [
          { path: "a.feature", type: "blob", sha: "s1" },
          { path: "x/b.feature", type: "blob", sha: "s2" },
        ],
      }),
    );

    const files = await getFeatureFiles("t", "me", "repo", "", "main");

    expect(files.map((f) => f.path)).toEqual(["a.feature", "x/b.feature"]);
  });

  it("falls back to walking contents when the tree is truncated", async () => {
    const fetchMock = mockFetch(
      jsonResponse({ truncated: true, tree: [] }),
      jsonResponse([
        { name: "a.feature", path: "f/a.feature", sha: "s1", type: "file" },
        { name: "sub", path: "f/sub", sha: "d1", type: "dir" },
      ]),
      jsonResponse([
        { name: "b.feature", path: "f/sub/b.feature", sha: "s2", type: "file" },
      ]),
    );

    const files = await getFeatureFiles("t", "me", "repo", "f", "main");

    expect(files.map((f) => f.path)).toEqual([
      "f/a.feature",
      "f/sub/b.feature",
    ]);
    expect(calledUrls(fetchMock).slice(1)).toEqual([
      "https://api.github.com/repos/me/repo/contents/f?ref=main",
      "https://api.github.com/repos/me/repo/contents/f/sub?ref=main",
    ]);
  });
});

describe("encoding and refs", () => {
  it("encodes the ref query param", async () => {
    const fetchMock = mockFetch(
      jsonResponse({
        content: btoa("Feature: x"),
        sha: "s",
        encoding: "base64",
      }),
    );

    await getFileContent("t", "me", "repo", "a b/c.feature", "feat/a&b");

    expect(calledUrls(fetchMock)[0]).toBe(
      "https://api.github.com/repos/me/repo/contents/a%20b/c.feature?ref=feat%2Fa%26b",
    );
  });

  it("creates a branch from the source ref without listing branches", async () => {
    const fetchMock = mockFetch(
      jsonResponse({ object: { sha: "abc" } }),
      jsonResponse({}),
    );

    await createBranch("t", "me", "repo", "new", "release/1.0");

    expect(calledUrls(fetchMock)).toEqual([
      "https://api.github.com/repos/me/repo/git/ref/heads/release/1.0",
      "https://api.github.com/repos/me/repo/git/refs",
    ]);
    const body = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(body).toEqual({ ref: "refs/heads/new", sha: "abc" });
  });
});
