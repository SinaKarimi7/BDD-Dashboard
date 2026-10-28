import { describe, expect, it } from "vitest";
import { newFeaturePaths } from "@/lib/sync";

describe("newFeaturePaths", () => {
  it("slugs names under the base path", () => {
    const paths = newFeaturePaths(
      [{ id: "1", name: "User Login" }],
      "features",
      [],
    );
    expect(paths.get("1")).toBe("features/user_login.feature");
  });

  it("suffixes names that slug the same", () => {
    const paths = newFeaturePaths(
      [
        { id: "1", name: "Login" },
        { id: "2", name: "login!" },
        { id: "3", name: "LOGIN" },
      ],
      "",
      [],
    );
    expect([...paths.values()]).toEqual([
      "login.feature",
      "login_2.feature",
      "login_3.feature",
    ]);
  });

  it("falls back to 'feature' for names without letters or digits", () => {
    const paths = newFeaturePaths(
      [
        { id: "1", name: "???" },
        { id: "2", name: "" },
      ],
      "",
      [],
    );
    expect([...paths.values()]).toEqual([
      "feature.feature",
      "feature_2.feature",
    ]);
  });

  it("does not reuse paths that are already mapped", () => {
    const paths = newFeaturePaths([{ id: "1", name: "Login" }], "features", [
      "features/login.feature",
      "features/Login_2.feature",
    ]);
    expect(paths.get("1")).toBe("features/login_3.feature");
  });
});
