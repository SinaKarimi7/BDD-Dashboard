import { describe, expect, it } from "vitest";
import { MAX_FEATURE_FILE_BYTES, screenFeatureFiles } from "@/lib/fileImport";

const file = (name: string, size = 10) => ({ name, size });

describe("screenFeatureFiles", () => {
  it("accepts .feature and .txt files, any case", () => {
    const files = [file("a.feature"), file("B.FEATURE"), file("c.txt")];
    expect(screenFeatureFiles(files)).toEqual({ accepted: files, errors: [] });
  });

  it("rejects other files, folders included, by name", () => {
    const { accepted, errors } = screenFeatureFiles([
      file("notes.md"),
      file("features", 0),
      file("ok.feature"),
    ]);
    expect(accepted).toEqual([file("ok.feature")]);
    expect(errors).toEqual([
      "notes.md: not a .feature file",
      "features: not a .feature file",
    ]);
  });

  it("rejects files over the size limit", () => {
    const { accepted, errors } = screenFeatureFiles([
      file("big.feature", MAX_FEATURE_FILE_BYTES + 1),
      file("edge.feature", MAX_FEATURE_FILE_BYTES),
    ]);
    expect(accepted.map((f) => f.name)).toEqual(["edge.feature"]);
    expect(errors).toEqual(["big.feature: larger than 1 MB"]);
  });
});
