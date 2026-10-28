import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/store";
import type { Feature, GitHubFileMapping, Scenario, Tag } from "@/types";

const smoke: Tag = { id: "t1", projectId: "p1", name: "smoke", color: "#000" };
const other: Tag = { id: "t2", projectId: "p1", name: "slow", color: "#111" };

function scenario(id: string, tags: Tag[]): Scenario {
  return {
    id,
    featureId: "f1",
    name: id,
    description: "",
    type: "scenario",
    position: 0,
    tags,
    steps: [],
    examples: [],
  } as unknown as Scenario;
}

function feature(id: string, projectId: string, extra?: Partial<Feature>) {
  return {
    id,
    projectId,
    name: id,
    description: "",
    folderPath: "",
    position: 0,
    tags: [],
    scenarios: [],
    background: null,
    createdAt: "",
    updatedAt: "",
    ...extra,
  } as Feature;
}

function mapping(featureId: string): GitHubFileMapping {
  return {
    featureId,
    filePath: `${featureId}.feature`,
    sha: "sha",
    lastSyncedContent: "",
    lastSyncedAt: "",
  };
}

beforeEach(() => {
  useAppStore.setState({
    projects: [
      { id: "p1", name: "One", description: "", createdAt: "", updatedAt: "" },
      { id: "p2", name: "Two", description: "", createdAt: "", updatedAt: "" },
    ],
    features: [
      feature("f1", "p1", {
        tags: [smoke, other],
        scenarios: [scenario("s1", [smoke]), scenario("s2", [other])],
      }),
      feature("f2", "p1"),
      feature("f3", "p2"),
    ],
    tags: [smoke, other],
    githubFileMappings: [mapping("f1"), mapping("f2"), mapping("f3")],
  });
});

describe("updateTag", () => {
  it("updates the copies held by features and scenarios", () => {
    useAppStore.getState().updateTag("t1", { name: "fast", color: "#fff" });
    const { tags, features } = useAppStore.getState();
    const f1 = features.find((f) => f.id === "f1")!;

    expect(tags.find((t) => t.id === "t1")?.name).toBe("fast");
    expect(f1.tags).toEqual([{ ...smoke, name: "fast", color: "#fff" }, other]);
    expect(f1.scenarios[0].tags[0]).toMatchObject({ name: "fast" });
    expect(f1.scenarios[1].tags[0]).toEqual(other);
  });
});

describe("GitHub mapping cleanup", () => {
  it("drops the mapping of a deleted feature", () => {
    useAppStore.getState().deleteFeature("f1");
    expect(
      useAppStore.getState().githubFileMappings.map((m) => m.featureId),
    ).toEqual(["f2", "f3"]);
  });

  it("drops the mappings of every feature in a deleted project", () => {
    useAppStore.getState().deleteProject("p1");
    const state = useAppStore.getState();
    expect(state.githubFileMappings.map((m) => m.featureId)).toEqual(["f3"]);
    expect(state.features.map((f) => f.id)).toEqual(["f3"]);
  });
});
