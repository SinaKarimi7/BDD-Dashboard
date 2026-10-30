import { describe, expect, it } from "vitest";
import { cycleIndex, trapFocusIndex } from "@/lib/focus";

describe("trapFocusIndex", () => {
  it("leaves Tab alone in the middle of the list", () => {
    expect(trapFocusIndex(1, 3, false)).toBeNull();
    expect(trapFocusIndex(1, 3, true)).toBeNull();
  });

  it("wraps from the last item to the first", () => {
    expect(trapFocusIndex(2, 3, false)).toBe(0);
  });

  it("wraps from the first item to the last on Shift+Tab", () => {
    expect(trapFocusIndex(0, 3, true)).toBe(2);
  });

  it("pulls focus back in when it is outside", () => {
    expect(trapFocusIndex(-1, 3, false)).toBe(0);
    expect(trapFocusIndex(-1, 3, true)).toBe(2);
  });

  it("does nothing with no focusable items", () => {
    expect(trapFocusIndex(-1, 0, false)).toBeNull();
  });

  it("wraps a single item onto itself", () => {
    expect(trapFocusIndex(0, 1, false)).toBe(0);
    expect(trapFocusIndex(0, 1, true)).toBe(0);
  });
});

describe("cycleIndex", () => {
  it("moves forward and backward", () => {
    expect(cycleIndex(0, 3, false)).toBe(1);
    expect(cycleIndex(2, 3, true)).toBe(1);
  });

  it("wraps at both ends", () => {
    expect(cycleIndex(2, 3, false)).toBe(0);
    expect(cycleIndex(0, 3, true)).toBe(2);
  });

  it("starts at the first or last item when nothing has focus", () => {
    expect(cycleIndex(-1, 3, false)).toBe(0);
    expect(cycleIndex(-1, 3, true)).toBe(2);
  });

  it("returns -1 for an empty list", () => {
    expect(cycleIndex(-1, 0, false)).toBe(-1);
  });
});
