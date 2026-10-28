import { describe, expect, it } from "vitest";
import {
  featureToGherkin,
  parseGherkin,
  parseGherkinWithErrors,
} from "@/lib/gherkin";
import type { Feature } from "@/types";

function parse(text: string): Feature {
  const feature = parseGherkin(text, "p1");
  if (!feature) throw new Error("parse failed");
  return feature;
}

const roundTrip = (text: string) => featureToGherkin(parse(text));

// Serializing a parsed file must give the same text when done again
function expectStable(text: string): string {
  const once = roundTrip(text);
  expect(roundTrip(once)).toBe(once);
  return once;
}

const steps = (f: Feature, i = 0) =>
  f.scenarios[i].steps.map((s) => `${s.keyword} ${s.text}`);

describe("parseGherkin / featureToGherkin", () => {
  it("writes a plain feature file back byte for byte", () => {
    const plain = [
      "@smoke",
      "Feature: Login",
      "  Users log in",
      "",
      "  Background:",
      "    Given the app is open",
      "",
      "  @fast",
      "  Scenario: Works",
      "    Given a user",
      "      | name | role |",
      "      | ann  | dev  |",
      "    When they log in",
      "    Then they see the dashboard",
      "",
      "  Scenario Outline: Many",
      "    Given <n>",
      "",
      "    Examples:",
      "      | n |",
      "      | 1 |",
      "",
    ].join("\n");
    expect(roundTrip(plain)).toBe(plain);
  });

  it("reads the Example keyword as a scenario", () => {
    const f = parse("Feature: F\n  Example: E\n    Given a\n    Then b\n");
    expect(f.description).toBe("");
    expect(f.scenarios).toHaveLength(1);
    expect(steps(f)).toEqual(["Given a", "Then b"]);
  });

  it("keeps doc strings with a media type and their indentation", () => {
    const text = [
      "Feature: F",
      "  Scenario: S",
      "    Given a",
      '      """json',
      "      {",
      '        "x": 1',
      "      }",
      '      """',
      "    Then b",
      "  Scenario: T",
      "    Given c",
      "",
    ].join("\n");
    const f = parse(text);
    expect(f.scenarios).toHaveLength(2);
    expect(f.scenarios[0].steps).toHaveLength(2);
    expect(f.scenarios[0].steps[0].docString).toBe('{\n  "x": 1\n}');
    expect(f.scenarios[0].steps[0].docStringMediaType).toBe("json");
    expect(expectStable(text)).toContain('"""json');
  });

  it("keeps Rule blocks", () => {
    const text =
      "Feature: F\n  Rule: R1\n    Some rule text\n\n    Scenario: S\n      Given a\n\n  Rule: R2\n    Scenario: T\n      Given b\n";
    const f = parse(text);
    expect(f.scenarios.map((s) => s.rule?.name)).toEqual(["R1", "R2"]);
    const out = expectStable(text);
    expect(out).toContain("Rule: R1");
    expect(out).toContain("Rule: R2");
    expect(out).toContain("Some rule text");
  });

  it("handles escapes in table cells", () => {
    const text =
      "Feature: F\n  Scenario: S\n    Given t\n" +
      String.raw`      | a\|b | c\\d | e\nf | \x |` +
      "\n";
    const want = [["a|b", String.raw`c\d`, "e\nf", String.raw`\x`]];
    expect(parse(text).scenarios[0].steps[0].dataTable).toEqual(want);
    expect(parse(roundTrip(text)).scenarios[0].steps[0].dataTable).toEqual(
      want,
    );
  });

  it("does not reorder the feature it serializes", () => {
    const f = parse(
      "Feature: F\n  Scenario: A\n    Given a\n  Scenario: B\n    Given b\n",
    );
    f.scenarios[0].position = 5;
    featureToGherkin(f);
    expect(f.scenarios.map((s) => s.name)).toEqual(["A", "B"]);
  });

  it("keeps tags on Examples", () => {
    const text =
      "Feature: F\n  Scenario Outline: O\n    Given <x>\n\n    @extag\n    Examples: first\n      | x |\n      | 1 |\n\n  Scenario: Next\n    Given n\n";
    const f = parse(text);
    expect(f.scenarios[0].examples[0].tags).toEqual(["extag"]);
    expect(f.scenarios[1].tags).toEqual([]);
    expect(expectStable(text)).toContain("@extag");
  });

  it("keeps comments where they were", () => {
    const text =
      "# header\nFeature: F\n  # before bg\n  Background:\n    Given x\n\n  Scenario: A\n    Given a\n    # mid comment\n    Then b\n  Scenario: B\n    Given c\n# eof\n";
    const f = parse(text);
    expect(f.headerComments).toEqual(["# header"]);
    expect(f.background?.headerComments).toEqual(["# before bg"]);
    expect(f.scenarios[0].headerComments ?? []).toEqual([]);
    expect(f.scenarios[0].steps[1].comments).toEqual(["# mid comment"]);
    expect(f.scenarios[1].headerComments ?? []).toEqual([]);
    expect(f.footerComments).toEqual(["# eof"]);
    const out = expectStable(text);
    expect(out).toMatch(/Given a\n {4}# mid comment\n {4}Then b/);
    expect(out.trimEnd().endsWith("# eof")).toBe(true);
  });

  it("keeps feature and scenario descriptions", () => {
    const text =
      "Feature: F\n  Feature description\n  Given that this is prose\n\n  Scenario: S\n    Scenario description here\n    Given a\n";
    const f = parse(text);
    expect(f.description).toBe(
      "Feature description\nGiven that this is prose",
    );
    expect(f.scenarios[0].description).toBe("Scenario description here");
    expect(f.scenarios[0].steps).toHaveLength(1);
    expectStable(text);
  });

  it("reads CRLF line endings", () => {
    const f = parse(
      'Feature: F\r\n  Scenario: S\r\n    Given a\r\n      """\r\n      line\r\n      """\r\n',
    );
    expect(f.scenarios[0].steps[0].docString).toBe("line");
  });

  it("keeps the Background name", () => {
    const text = "Feature: F\n  Background: Setup\n    Given x\n";
    expect(parse(text).background?.name).toBe("Setup");
    expect(roundTrip(text)).toContain("Background: Setup");
  });

  it("reads other languages and writes them back unchanged", () => {
    const text = [
      "# language: fr",
      "Fonctionnalité: Panier",
      "  Scénario: Payer",
      "    Soit un panier",
      "    Quand je paie",
      "    Alors la commande est validée",
      "    Et je reçois un mail",
      "    Mais pas de SMS",
      "",
    ].join("\n");
    const f = parse(text);
    expect(f.language).toBe("fr");
    expect(steps(f)).toEqual([
      "Given un panier",
      "When je paie",
      "Then la commande est validée",
      "And je reçois un mail",
      "But pas de SMS",
    ]);
    expect(roundTrip(text)).toBe(text);
  });

  it("writes new steps in the file's language", () => {
    const f = parse("# language: fr\nFonctionnalité: F\n  Scénario: S\n    Soit a\n");
    f.scenarios[0].steps.push({
      ...f.scenarios[0].steps[0],
      id: "new",
      keyword: "Then",
      text: "b",
      sourceKeyword: undefined,
      position: 1,
    });
    expect(featureToGherkin(f)).toContain("    Alors b");
  });

  it("keeps * steps and custom keywords", () => {
    const text = [
      "Ability: Search",
      "  Example: Find",
      "    * a query",
      "    * results",
      "",
    ].join("\n");
    expect(roundTrip(text)).toBe(text);
  });

  it("uses the default keyword once the user changes a step's keyword", () => {
    const f = parse("Feature: F\n  Scenario: S\n    * a\n");
    f.scenarios[0].steps[0].keyword = "Given";
    expect(featureToGherkin(f)).toContain("    Given a");
  });

  it("keeps a Background inside a Rule", () => {
    const text = [
      "Feature: F",
      "  Background:",
      "    Given the app",
      "",
      "  Rule: R",
      "",
      "    Background:",
      "      Given the rule setup",
      "",
      "    Scenario: S",
      "      Given a",
      "",
    ].join("\n");
    const f = parse(text);
    expect(f.background?.steps[0].text).toBe("the app");
    expect(f.scenarios[0].rule?.background?.steps[0].text).toBe(
      "the rule setup",
    );
    expect(roundTrip(text)).toBe(text);
  });

  it("keeps ``` doc strings", () => {
    const text =
      "Feature: F\n  Scenario: S\n    Given a\n      ```\n      x\n      ```\n";
    expect(roundTrip(text)).toBe(text);
  });

  it("returns parse errors with their position", () => {
    const result = parseGherkinWithErrors(
      "Feature: F\n  Scenario: S\n    Given a\n  oops | broken\n",
      "p1",
    );
    expect(result.feature).toBeNull();
    expect(result.errors[0]).toMatch(/^\(4:3\)/);
  });

  it("rejects text that isn't Gherkin", () => {
    expect(parseGherkin("hello world\nrandom", "p1")).toBeNull();
    expect(parseGherkinWithErrors("# only a comment\n", "p1").errors).toEqual([
      "No Feature: line found",
    ]);
  });
});
