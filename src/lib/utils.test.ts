import { describe, expect, it } from "vitest";
import { normalizeTagName } from "@/lib/utils";

describe("normalizeTagName", () => {
  it("trims and strips a leading @", () => {
    expect(normalizeTagName("  @smoke ")).toEqual({ name: "smoke" });
    expect(normalizeTagName("@@wip")).toEqual({ name: "wip" });
  });

  it("rejects names with whitespace", () => {
    expect(normalizeTagName("smoke test").error).toBeTruthy();
    expect(normalizeTagName("@smoke\ttest").error).toBeTruthy();
  });

  it("rejects an @ after the start", () => {
    expect(normalizeTagName("a@b").error).toBeTruthy();
  });

  it("rejects empty names", () => {
    expect(normalizeTagName("  ").error).toBeTruthy();
    expect(normalizeTagName("@").error).toBeTruthy();
  });

  it("keeps ordinary tag names", () => {
    expect(normalizeTagName("JIRA-123")).toEqual({ name: "JIRA-123" });
  });
});
