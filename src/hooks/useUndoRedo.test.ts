import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/store";
import {
  MAX_HISTORY,
  canRedo,
  canUndo,
  clearHistory,
  pushUndo,
  redo,
  undo,
} from "./useUndoRedo";

const store = () => useAppStore.getState();
const nameOf = (id: string) => store().getFeature(id)?.name;
const rename = (id: string, name: string) => {
  pushUndo(id, "Rename");
  store().updateFeature(id, { name });
};

let a: string;
let b: string;

beforeEach(() => {
  clearHistory();
  const project = store().addProject({ name: "P", description: "" });
  const input = { description: "", folderPath: "features" };
  a = store().addFeature(project.id, { ...input, name: "A0" }).id;
  b = store().addFeature(project.id, { ...input, name: "B0" }).id;
});

describe("undo history", () => {
  it("undoes and redoes a feature edit", () => {
    rename(a, "A1");
    undo(a);
    expect(nameOf(a)).toBe("A0");
    redo(a);
    expect(nameOf(a)).toBe("A1");
  });

  it("keeps each feature's history separate", () => {
    rename(a, "A1");
    rename(b, "B1");

    undo(b);
    expect(nameOf(b)).toBe("B0");
    expect(nameOf(a)).toBe("A1");
    expect(canUndo(b)).toBe(false);
    expect(canUndo(a)).toBe(true);

    // Undoing a feature with nothing left must not touch another feature
    undo(b);
    expect(nameOf(a)).toBe("A1");
  });

  it("clears redo when a new edit is pushed", () => {
    rename(a, "A1");
    undo(a);
    expect(canRedo(a)).toBe(true);
    rename(a, "A2");
    expect(canRedo(a)).toBe(false);
  });

  it("does not clear another feature's redo on push", () => {
    rename(a, "A1");
    undo(a);
    rename(b, "B1");
    expect(canRedo(a)).toBe(true);
  });

  it("caps history at MAX_HISTORY entries", () => {
    for (let i = 1; i <= MAX_HISTORY + 5; i++) rename(a, `A${i}`);
    for (let i = 0; i < MAX_HISTORY; i++) undo(a);
    expect(canUndo(a)).toBe(false);
    // The oldest five snapshots were dropped
    expect(nameOf(a)).toBe("A5");
  });

  it("clears only the given feature's history", () => {
    rename(a, "A1");
    rename(b, "B1");
    clearHistory(a);
    expect(canUndo(a)).toBe(false);
    expect(canUndo(b)).toBe(true);
  });
});
