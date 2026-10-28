import { describe, expect, it } from "vitest";
import { migrateStore } from "@/store/migrations";

const connection = {
  token: "t",
  owner: "me",
  repo: "repo",
  branch: "main",
  path: "features",
  connectedAt: "2026-01-01T00:00:00.000Z",
};

function mapping(featureId: string, filePath: string) {
  return {
    featureId,
    filePath,
    sha: `sha-${featureId}`,
    lastSyncedContent: "Feature: x",
    lastSyncedAt: "2026-01-01T00:00:00.000Z",
  };
}

const projects = [{ id: "p1" }, { id: "p2" }, { id: "p3" }];
const features = [
  { id: "f1", projectId: "p1" },
  { id: "f2", projectId: "p1" },
  { id: "f3", projectId: "p2" },
];

describe("migrateStore v0 -> v1", () => {
  it("moves the connection onto the projects its mappings point at", () => {
    const result = migrateStore(
      {
        projects,
        features,
        githubConnection: connection,
        githubFileMappings: [
          mapping("f1", "features/a.feature"),
          mapping("f3", "features/b.feature"),
          mapping("gone", "features/c.feature"),
        ],
      },
      0,
    ) as Record<string, unknown>;

    expect(result.githubConnection).toBeUndefined();
    expect(result.githubConnections).toEqual({
      p1: connection,
      p2: connection,
    });
    expect(result.githubFileMappings).toEqual([
      { ...mapping("f1", "features/a.feature"), projectId: "p1" },
      { ...mapping("f3", "features/b.feature"), projectId: "p2" },
    ]);
    expect(result.projects).toBe(projects);
    expect(result.features).toBe(features);
  });

  it("gives the connection to every project when no mapping says which", () => {
    const result = migrateStore(
      {
        projects,
        features,
        githubConnection: connection,
        githubFileMappings: [],
      },
      0,
    ) as Record<string, unknown>;

    expect(Object.keys(result.githubConnections as object)).toEqual([
      "p1",
      "p2",
      "p3",
    ]);
  });

  it("handles state that was never connected", () => {
    const result = migrateStore(
      { projects, features, githubConnection: null, githubFileMappings: [] },
      0,
    ) as Record<string, unknown>;

    expect(result.githubConnections).toEqual({});
    expect(result.githubFileMappings).toEqual([]);
  });

  it("leaves current-version state alone", () => {
    const state = {
      projects,
      features,
      githubConnections: {},
      githubFileMappings: [],
    };
    expect(migrateStore(state, 1)).toBe(state);
  });
});
