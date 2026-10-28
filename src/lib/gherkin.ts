import {
  AstBuilder,
  GherkinClassicTokenMatcher,
  Parser,
  dialects,
  type Dialect,
} from "@cucumber/gherkin";
import {
  IdGenerator,
  StepKeywordType,
  type Background as AstBackground,
  type Comment as AstComment,
  type Examples as AstExamples,
  type GherkinDocument,
  type Rule as AstRule,
  type Scenario as AstScenario,
  type Step as AstStep,
  type Tag as AstTag,
} from "@cucumber/messages";
import type {
  Background,
  Examples,
  Feature,
  Rule,
  Scenario,
  ScenarioType,
  Step,
  StepKeyword,
} from "@/types";
import { generateId } from "@/lib/utils";

const TAG_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#14b8a6",
  "#6366f1",
];

// ─── Keywords ─────────────────────────────────────────────────

type HeaderKeyword =
  | "feature"
  | "background"
  | "rule"
  | "scenario"
  | "scenarioOutline"
  | "examples";

// English keywords the app writes by default. The dialect lists start with
// "Example" and "* ", so they can't be used for English as is.
const ENGLISH: Record<HeaderKeyword, string> = {
  feature: "Feature",
  background: "Background",
  rule: "Rule",
  scenario: "Scenario",
  scenarioOutline: "Scenario Outline",
  examples: "Examples",
};

const STEP_DIALECT_KEY = {
  Given: "given",
  When: "when",
  Then: "then",
  And: "and",
  But: "but",
} as const;

function dialectFor(language?: string): Dialect {
  return (language && dialects[language]) || dialects.en;
}

function headerKeyword(language: string | undefined, kind: HeaderKeyword) {
  if (!language || language === "en") return ENGLISH[kind];
  return dialectFor(language)[kind][0];
}

// Default step keyword with its trailing space, e.g. "Given " or "Soit ".
// Prefers a single word ("Et " over "Et que ") when the language has one.
function stepKeyword(language: string | undefined, keyword: StepKeyword) {
  if (!language || language === "en") return `${keyword} `;
  const options = dialectFor(language)[STEP_DIALECT_KEY[keyword]].filter(
    (k) => k !== "* ",
  );
  return options.find((k) => /^\S+ $/.test(k)) ?? options[0] ?? `${keyword} `;
}

function scenarioKeyword(language: string | undefined, scenario: Scenario) {
  if (scenario.sourceKeyword?.type === scenario.type) {
    return scenario.sourceKeyword.text;
  }
  return headerKeyword(
    language,
    scenario.type === "scenario_outline" ? "scenarioOutline" : "scenario",
  );
}

export const STEP_KEYWORDS: StepKeyword[] = ["Given", "When", "Then", "And", "But"];

// How a step keyword reads in the feature's language, e.g. "Soit" for Given.
// A step keeps the spelling from its file (like "*") for its own keyword.
export function stepKeywordLabel(
  keyword: StepKeyword,
  language?: string,
  step?: Step,
): string {
  const text =
    step?.sourceKeyword?.keyword === keyword
      ? step.sourceKeyword.text
      : stepKeyword(language, keyword);
  return text.trim();
}

export function scenarioKeywordLabel(
  scenario: Scenario,
  language?: string,
): string {
  return scenarioKeyword(language, scenario);
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Matches a line's leading keyword in the language, e.g. "Scénario:" or "Soit ".
export function keywordPattern(language?: string): RegExp {
  const d = dialectFor(language);
  const headers = [
    ...d.feature,
    ...d.background,
    ...d.rule,
    ...d.scenario,
    ...d.scenarioOutline,
    ...d.examples,
  ].map((k) => `${k}:`);
  const steps = [...d.given, ...d.when, ...d.then, ...d.and, ...d.but];
  const all = [...new Set([...headers, ...steps])].sort(
    (a, b) => b.length - a.length,
  );
  return new RegExp(`^(${all.map(escapeRegExp).join("|")})`);
}

// ─── Export a single Feature to Gherkin text ──────────────────

/**
 * Pad data-table rows so every column aligns.
 * Input:  [["Field",""],["Logo",""],["Name",""]]
 * Output: [["Field ",""],["Logo  ",""],["Name  ",""]]
 */
function alignTable(rows: string[][], indent: string): string[] {
  if (rows.length === 0) return [];
  const escaped = rows.map((row) => row.map(escapeCell));
  const colCount = Math.max(...escaped.map((r) => r.length));
  const widths: number[] = Array.from({ length: colCount }, () => 0);
  for (const row of escaped) {
    for (let i = 0; i < row.length; i++) {
      widths[i] = Math.max(widths[i], (row[i] ?? "").length);
    }
  }
  return escaped.map((row) => {
    const padded = Array.from({ length: colCount }, (_, i) =>
      (row[i] ?? "").padEnd(widths[i]),
    );
    return `${indent}| ${padded.join(" | ")} |`;
  });
}

// Gherkin table escapes: \| for a pipe, \n for a newline, \\ for a backslash.
// A backslash is only escaped where it would otherwise start one of those.
function escapeCell(cell: string): string {
  return cell
    .replace(/\\(?=[\\|n\n])/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, "\\n");
}

function textLines(text: string, indent: string): string[] {
  return text.split("\n").map((l) => (l ? `${indent}${l}` : ""));
}

function stepLines(
  step: Step,
  indent: string,
  language: string | undefined,
): string[] {
  const lines: string[] = [];
  step.comments?.forEach((c) => lines.push(`${indent}${c}`));
  const keyword =
    step.sourceKeyword?.keyword === step.keyword
      ? step.sourceKeyword.text
      : stepKeyword(language, step.keyword);
  lines.push(`${indent}${keyword}${step.text}`);
  const inner = `${indent}  `;
  if (step.dataTable) {
    lines.push(...alignTable(step.dataTable, inner));
  }
  if (step.docString != null) {
    let delim = step.docStringDelimiter ?? '"""';
    if (step.docString.split("\n").some((l) => l.trim().startsWith(delim))) {
      delim = delim === '"""' ? "```" : '"""';
    }
    lines.push(`${inner}${delim}${step.docStringMediaType ?? ""}`);
    lines.push(...textLines(step.docString, inner));
    lines.push(`${inner}${delim}`);
  }
  return lines;
}

function backgroundLines(
  bg: Background,
  indent: string,
  language: string | undefined,
): string[] {
  const lines: string[] = [];
  bg.headerComments?.forEach((c) => lines.push(`${indent}${c}`));
  const keyword = bg.keyword ?? headerKeyword(language, "background");
  lines.push(`${indent}${keyword}:${bg.name ? ` ${bg.name}` : ""}`);
  byPosition(bg.steps).forEach((step) => {
    lines.push(...stepLines(step, `${indent}  `, language));
  });
  lines.push("");
  return lines;
}

function tagLine(names: string[], indent: string): string[] {
  return names.length > 0
    ? [`${indent}${names.map((n) => `@${n}`).join(" ")}`]
    : [];
}

function byPosition<T extends { position: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.position - b.position);
}

export function featureToGherkin(feature: Feature): string {
  const lines: string[] = [];
  const language = feature.language;

  if (language) lines.push(`# language: ${language}`);

  // Header comments (e.g. copyright, author)
  if (feature.headerComments?.length) {
    feature.headerComments.forEach((c) => lines.push(c));
  }

  // Feature-level tags
  lines.push(...tagLine(feature.tags.map((t) => t.name), ""));

  const featureKeyword = feature.keyword ?? headerKeyword(language, "feature");
  lines.push(`${featureKeyword}: ${feature.name}`);

  if (feature.description) {
    lines.push(...textLines(feature.description, "  "));
    lines.push("");
  }

  // Background
  if (feature.background && feature.background.steps.length > 0) {
    lines.push(...backgroundLines(feature.background, "  ", language));
  }

  // Scenarios
  let ruleName: string | undefined;
  byPosition(feature.scenarios).forEach((scenario) => {
    const rule = scenario.rule;
    if (rule?.name !== ruleName) {
      ruleName = rule?.name;
      if (rule) {
        rule.headerComments?.forEach((c) => lines.push(`  ${c}`));
        lines.push(...tagLine(rule.tags ?? [], "  "));
        const keyword = rule.keyword ?? headerKeyword(language, "rule");
        lines.push(`  ${keyword}: ${rule.name}`);
        if (rule.description) {
          lines.push(...textLines(rule.description, "    "));
        }
        lines.push("");
        if (rule.background && rule.background.steps.length > 0) {
          lines.push(...backgroundLines(rule.background, "    ", language));
        }
      }
    }
    const indent = rule ? "    " : "  ";
    const inner = `${indent}  `;

    // Scenario comments
    scenario.headerComments?.forEach((c) => lines.push(`${indent}${c}`));

    // Scenario tags
    lines.push(...tagLine(scenario.tags.map((t) => t.name), indent));

    lines.push(
      `${indent}${scenarioKeyword(language, scenario)}: ${scenario.name}`,
    );

    if (scenario.description) {
      lines.push(...textLines(scenario.description, inner));
    }

    // Steps
    byPosition(scenario.steps).forEach((step) => {
      lines.push(...stepLines(step, inner, language));
    });

    // Examples
    if (
      scenario.type === "scenario_outline" &&
      scenario.examples.length > 0
    ) {
      scenario.examples.forEach((ex) => {
        lines.push("");
        ex.headerComments?.forEach((c) => lines.push(`${inner}${c}`));
        lines.push(...tagLine(ex.tags ?? [], inner));
        const keyword = ex.keyword ?? headerKeyword(language, "examples");
        lines.push(`${inner}${keyword}:${ex.name ? ` ${ex.name}` : ""}`);
        if (ex.headers.length > 0) {
          const allRows = [ex.headers, ...ex.rows];
          lines.push(...alignTable(allRows, `${inner}  `));
        }
      });
    }

    lines.push("");
  });

  feature.footerComments?.forEach((c) => lines.push(c));

  return lines.join("\n");
}

// ─── Parse Gherkin text into a Feature ────────────────────────

export interface GherkinParseResult {
  feature: Feature | null;
  // Parser messages with their position, e.g. "(4:3): expected: ..."
  errors: string[];
}

const LANGUAGE_LINE = /^\s*#\s*language\s*:\s*(\S+)\s*$/;

// The AST keeps the file's indentation in descriptions; store them flush left.
function dedent(text: string): string {
  const lines = text.split("\n").map((l) => l.trimEnd());
  const indents = lines
    .filter((l) => l)
    .map((l) => l.length - l.trimStart().length);
  const strip = indents.length > 0 ? Math.min(...indents) : 0;
  return lines
    .map((l) => l.slice(strip))
    .join("\n")
    .replace(/^\n+|\n+$/g, "");
}

// Tags or keyword, whichever comes first.
function startLine(node: { location: { line: number }; tags?: readonly AstTag[] }) {
  return Math.min(node.location.line, ...(node.tags ?? []).map((t) => t.location.line));
}

// Hands out comments in file order; each element takes the ones above it.
function commentQueue(comments: readonly AstComment[]) {
  const queue = [...comments].sort((a, b) => a.location.line - b.location.line);
  return (beforeLine: number): string[] => {
    const taken: string[] = [];
    while (queue.length > 0 && queue[0].location.line < beforeLine) {
      taken.push(queue.shift()!.text.trim());
    }
    return taken;
  };
}

function toStepKeyword(step: AstStep, dialect: Dialect): StepKeyword {
  switch (step.keywordType) {
    case StepKeywordType.CONTEXT:
      return "Given";
    case StepKeywordType.ACTION:
      return "When";
    case StepKeywordType.OUTCOME:
      return "Then";
    case StepKeywordType.CONJUNCTION:
      return dialect.but.includes(step.keyword) &&
        !dialect.and.includes(step.keyword)
        ? "But"
        : "And";
    default:
      // "*" steps
      return "And";
  }
}

function parseErrors(error: unknown): string[] {
  const errors = (error as { errors?: { message: string }[] }).errors;
  if (errors?.length) return errors.map((e) => e.message);
  return [error instanceof Error ? error.message : String(error)];
}

function toFeature(
  doc: GherkinDocument,
  text: string,
  projectId: string,
): Feature {
  const ast = doc.feature!;
  const featureId = generateId();
  const takeComments = commentQueue(doc.comments);

  // Only a "# language:" line makes the file non-English (or explicitly English)
  const languageLine = text
    .split(/\r?\n/)
    .slice(0, ast.location.line - 1)
    .map((l) => l.match(LANGUAGE_LINE)?.[1])
    .find(Boolean);
  const language = languageLine ? ast.language : undefined;
  const dialect = dialectFor(ast.language);

  const keywordIfCustom = (keyword: string, kind: HeaderKeyword) =>
    keyword !== headerKeyword(language, kind) ? keyword : undefined;

  const toTags = (tags: readonly AstTag[]) =>
    tags.map((t, i) => ({
      id: generateId(),
      projectId,
      name: t.name.replace(/^@/, ""),
      color: TAG_COLORS[i % TAG_COLORS.length],
    }));

  const toSteps = (steps: readonly AstStep[], scenarioId: string): Step[] =>
    steps.map((s, position) => {
      const keyword = toStepKeyword(s, dialect);
      const step: Step = {
        id: generateId(),
        scenarioId,
        keyword,
        text: s.text,
        dataTable: s.dataTable
          ? s.dataTable.rows.map((r) => r.cells.map((c) => c.value))
          : null,
        docString: s.docString ? s.docString.content : null,
        position,
      };
      const comments = takeComments(s.location.line);
      if (comments.length > 0) step.comments = comments;
      if (s.docString?.mediaType) {
        step.docStringMediaType = s.docString.mediaType;
      }
      if (s.docString && s.docString.delimiter !== '"""') {
        step.docStringDelimiter = s.docString.delimiter;
      }
      if (s.keyword !== stepKeyword(language, keyword)) {
        step.sourceKeyword = { keyword, text: s.keyword };
      }
      return step;
    });

  const toBackground = (bg: AstBackground): Background => {
    const background: Background = {
      id: generateId(),
      featureId,
      steps: [],
    };
    const comments = takeComments(bg.location.line);
    if (comments.length > 0) background.headerComments = comments;
    if (bg.name) background.name = bg.name;
    const keyword = keywordIfCustom(bg.keyword, "background");
    if (keyword) background.keyword = keyword;
    background.steps = toSteps(bg.steps, "");
    return background;
  };

  const toExamples = (ex: AstExamples, scenarioId: string, position: number) => {
    const examples: Examples = {
      id: generateId(),
      scenarioId,
      name: ex.name,
      headers: ex.tableHeader?.cells.map((c) => c.value) ?? [],
      rows: ex.tableBody.map((r) => r.cells.map((c) => c.value)),
      position,
    };
    const comments = takeComments(startLine(ex));
    if (comments.length > 0) examples.headerComments = comments;
    if (ex.tags.length > 0) {
      examples.tags = ex.tags.map((t) => t.name.replace(/^@/, ""));
    }
    const keyword = keywordIfCustom(ex.keyword, "examples");
    if (keyword) examples.keyword = keyword;
    return examples;
  };

  const scenarios: Scenario[] = [];
  const addScenario = (sc: AstScenario, rule?: Rule) => {
    const id = generateId();
    const now = new Date().toISOString();
    const isOutline =
      sc.examples.length > 0 || dialect.scenarioOutline.includes(sc.keyword);
    const type: ScenarioType = isOutline ? "scenario_outline" : "scenario";
    const scenario: Scenario = {
      id,
      featureId,
      name: sc.name,
      type,
      status: "backlog",
      position: scenarios.length,
      tags: toTags(sc.tags),
      steps: [],
      examples: [],
      headerComments: takeComments(startLine(sc)),
      createdAt: now,
      updatedAt: now,
    };
    const description = dedent(sc.description);
    if (description) scenario.description = description;
    if (rule) scenario.rule = rule;
    if (
      sc.keyword !==
      headerKeyword(language, isOutline ? "scenarioOutline" : "scenario")
    ) {
      scenario.sourceKeyword = { type, text: sc.keyword };
    }
    scenario.steps = toSteps(sc.steps, id);
    scenario.examples = sc.examples.map((ex, i) => toExamples(ex, id, i));
    scenarios.push(scenario);
  };

  const addRule = (ast: AstRule) => {
    const rule: Rule = { name: ast.name };
    const comments = takeComments(startLine(ast));
    if (comments.length > 0) rule.headerComments = comments;
    if (ast.tags.length > 0) {
      rule.tags = ast.tags.map((t) => t.name.replace(/^@/, ""));
    }
    const description = dedent(ast.description);
    if (description) rule.description = description;
    const keyword = keywordIfCustom(ast.keyword, "rule");
    if (keyword) rule.keyword = keyword;
    for (const child of ast.children) {
      if (child.background) rule.background = toBackground(child.background);
      if (child.scenario) addScenario(child.scenario, rule);
    }
  };

  const now = new Date().toISOString();
  const feature: Feature = {
    id: featureId,
    projectId,
    name: ast.name,
    description: dedent(ast.description),
    folderPath: "",
    position: 0,
    tags: toTags(ast.tags),
    scenarios,
    background: null,
    headerComments: takeComments(startLine(ast)),
    createdAt: now,
    updatedAt: now,
  };
  if (language) feature.language = language;
  const featureKeyword = keywordIfCustom(ast.keyword, "feature");
  if (featureKeyword) feature.keyword = featureKeyword;

  for (const child of ast.children) {
    if (child.background) feature.background = toBackground(child.background);
    if (child.scenario) addScenario(child.scenario);
    if (child.rule) addRule(child.rule);
  }

  const footer = takeComments(Infinity);
  if (footer.length > 0) feature.footerComments = footer;

  return feature;
}

export function parseGherkinWithErrors(
  text: string,
  projectId: string,
): GherkinParseResult {
  let doc: GherkinDocument;
  try {
    const parser = new Parser(
      new AstBuilder(IdGenerator.incrementing()),
      new GherkinClassicTokenMatcher(),
    );
    doc = parser.parse(text);
  } catch (error) {
    return { feature: null, errors: parseErrors(error) };
  }
  if (!doc.feature) {
    return { feature: null, errors: ["No Feature: line found"] };
  }
  return { feature: toFeature(doc, text, projectId), errors: [] };
}

export function parseGherkin(text: string, projectId: string): Feature | null {
  return parseGherkinWithErrors(text, projectId).feature;
}

// ─── Parse multiple feature files ─────────────────────────────

export function parseFeatureFiles(
  files: { name: string; content: string; path?: string }[],
  projectId: string,
): { features: Feature[]; errors: string[] } {
  const features: Feature[] = [];
  const errors: string[] = [];
  for (const file of files) {
    const result = parseGherkinWithErrors(file.content, projectId);
    if (!result.feature) {
      errors.push(...result.errors.map((e) => `${file.name} ${e}`));
      continue;
    }
    const feature = result.feature;
    feature.folderPath = file.path || "";
    if (!feature.name && file.name) {
      feature.name = file.name.replace(".feature", "");
    }
    features.push(feature);
  }
  return { features, errors };
}
