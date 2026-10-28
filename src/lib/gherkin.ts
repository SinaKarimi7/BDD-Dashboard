import type {
  Background,
  Examples,
  Feature,
  Rule,
  Scenario,
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

function parseRow(trimmed: string): string[] {
  const cells: string[] = [];
  let cell = "";
  for (let i = 1; i < trimmed.length; i++) {
    const c = trimmed[i];
    const next = trimmed[i + 1];
    if (c === "\\" && (next === "|" || next === "\\")) {
      cell += next;
      i++;
    } else if (c === "\\" && next === "n") {
      cell += "\n";
      i++;
    } else if (c === "|") {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += c;
    }
  }
  return cells;
}

function textLines(text: string, indent: string): string[] {
  return text.split("\n").map((l) => (l ? `${indent}${l}` : ""));
}

function stepLines(step: Step, indent: string): string[] {
  const lines: string[] = [];
  step.comments?.forEach((c) => lines.push(`${indent}${c}`));
  lines.push(`${indent}${step.keyword} ${step.text}`);
  const inner = `${indent}  `;
  if (step.dataTable) {
    lines.push(...alignTable(step.dataTable, inner));
  }
  if (step.docString != null) {
    const delim = step.docString
      .split("\n")
      .some((l) => l.trim().startsWith('"""'))
      ? "```"
      : '"""';
    lines.push(`${inner}${delim}${step.docStringMediaType ?? ""}`);
    lines.push(...textLines(step.docString, inner));
    lines.push(`${inner}${delim}`);
  }
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

  // Header comments (e.g. copyright, author)
  if (feature.headerComments?.length) {
    feature.headerComments.forEach((c) => lines.push(c));
  }

  // Feature-level tags
  lines.push(...tagLine(feature.tags.map((t) => t.name), ""));

  lines.push(`Feature: ${feature.name}`);

  if (feature.description) {
    lines.push(...textLines(feature.description, "  "));
    lines.push("");
  }

  // Background
  if (feature.background && feature.background.steps.length > 0) {
    const bg = feature.background;
    bg.headerComments?.forEach((c) => lines.push(`  ${c}`));
    lines.push(`  Background:${bg.name ? ` ${bg.name}` : ""}`);
    byPosition(bg.steps).forEach((step) => {
      lines.push(...stepLines(step, "    "));
    });
    lines.push("");
  }

  // Scenarios
  let ruleName: string | undefined;
  byPosition(feature.scenarios).forEach((scenario) => {
    if (scenario.rule?.name !== ruleName) {
      ruleName = scenario.rule?.name;
      if (scenario.rule) {
        lines.push(...tagLine(scenario.rule.tags ?? [], "  "));
        lines.push(`  Rule: ${scenario.rule.name}`);
        if (scenario.rule.description) {
          lines.push(...textLines(scenario.rule.description, "    "));
        }
        lines.push("");
      }
    }
    const indent = scenario.rule ? "    " : "  ";
    const inner = `${indent}  `;

    // Scenario comments
    scenario.headerComments?.forEach((c) => lines.push(`${indent}${c}`));

    // Scenario tags
    lines.push(...tagLine(scenario.tags.map((t) => t.name), indent));

    const keyword =
      scenario.type === "scenario_outline" ? "Scenario Outline" : "Scenario";
    lines.push(`${indent}${keyword}: ${scenario.name}`);

    if (scenario.description) {
      lines.push(...textLines(scenario.description, inner));
    }

    // Steps
    byPosition(scenario.steps).forEach((step) => {
      lines.push(...stepLines(step, inner));
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
        lines.push(`${inner}Examples:${ex.name ? ` ${ex.name}` : ""}`);
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

const SCENARIO_RE = /^(Scenario Outline|Scenario Template|Scenario|Example):(.*)$/;
const STEP_RE = /^(Given|When|Then|And|But|\*)\s+(.+)$/;
const DOC_STRING_OPEN_RE = /^("""|```)\s*(\S*)$/;

// Free text after a Feature:, Rule: or Scenario: line, up to the next keyword.
interface Description {
  kind: "feature" | "rule" | "scenario" | "ignore";
  lines: string[];
  save: (text: string) => void;
}

function leadingSpaces(line: string): number {
  return line.length - line.trimStart().length;
}

export function parseGherkin(text: string, projectId: string): Feature | null {
  try {
    const lines = text.split(/\r?\n/);
    const feature: Feature = {
      id: generateId(),
      projectId,
      name: "",
      description: "",
      folderPath: "",
      position: 0,
      tags: [],
      scenarios: [],
      background: null,
      headerComments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let currentScenario: Scenario | null = null;
    let currentRule: Rule | null = null;
    let inBackground = false;
    let inExamples = false;
    let docString: {
      delim: string;
      indent: number;
      mediaType: string;
      lines: string[];
    } | null = null;
    let pendingTags: string[] = [];
    let pendingComments: string[] = [];
    let description: Description | null = null;

    const toTags = (names: string[]) =>
      names.map((name, i) => ({
        id: generateId(),
        projectId,
        name,
        color: TAG_COLORS[i % TAG_COLORS.length],
      }));

    const startDescription = (
      kind: Description["kind"],
      save: (text: string) => void,
    ) => {
      description = { kind, lines: [], save };
    };

    const finishDescription = () => {
      if (!description) return;
      const text = description.lines
        .join("\n")
        .replace(/\n+$/, "")
        .replace(/^\n+/, "");
      if (text) description.save(text);
      description = null;
    };

    const takeComments = () => {
      const comments = pendingComments;
      pendingComments = [];
      return comments;
    };

    const lastStep = (): Step | null => {
      const steps =
        inBackground && feature.background
          ? feature.background.steps
          : currentScenario?.steps;
      return steps && steps.length > 0 ? steps[steps.length - 1] : null;
    };

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      const trimmed = line.trim();

      // ── Doc string content and closing delimiter ──
      if (docString) {
        if (trimmed === docString.delim) {
          const target = lastStep();
          if (target) {
            target.docString = docString.lines.join("\n");
            if (docString.mediaType) {
              target.docStringMediaType = docString.mediaType;
            }
          }
          docString = null;
        } else {
          // Keep indentation relative to the opening delimiter
          const strip = Math.min(docString.indent, leadingSpaces(line));
          docString.lines.push(line.slice(strip));
        }
        continue;
      }

      // ── Doc string opening delimiter (optionally with a media type) ──
      const docOpen = trimmed.match(DOC_STRING_OPEN_RE);
      if (docOpen) {
        finishDescription();
        docString = {
          delim: docOpen[1],
          indent: leadingSpaces(line),
          mediaType: docOpen[2],
          lines: [],
        };
        continue;
      }

      // ── Comments ──
      if (trimmed.startsWith("#")) {
        pendingComments.push(trimmed);
        continue;
      }

      // ── Empty lines ──
      if (!trimmed) {
        // Empty lines within a description are preserved
        if (description) (description as Description).lines.push("");
        continue;
      }

      // ── Tags ──
      if (trimmed.startsWith("@")) {
        finishDescription();
        pendingTags.push(
          ...trimmed
            .split(/\s+/)
            .filter((t) => t.startsWith("@"))
            .map((t) => t.slice(1)),
        );
        continue;
      }

      // ── Feature ──
      if (trimmed.startsWith("Feature:")) {
        feature.name = trimmed.replace("Feature:", "").trim();
        feature.tags = toTags(pendingTags);
        feature.headerComments = takeComments();
        pendingTags = [];
        startDescription("feature", (d) => (feature.description = d));
        continue;
      }

      // ── Rule ──
      if (trimmed.startsWith("Rule:")) {
        finishDescription();
        const rule: Rule = { name: trimmed.replace("Rule:", "").trim() };
        if (pendingTags.length > 0) rule.tags = pendingTags;
        pendingTags = [];
        currentRule = rule;
        currentScenario = null;
        inBackground = false;
        inExamples = false;
        startDescription("rule", (d) => (rule.description = d));
        continue;
      }

      // ── Background ──
      if (trimmed.startsWith("Background:")) {
        finishDescription();
        inBackground = true;
        inExamples = false;
        currentScenario = null;
        const background: Background = {
          id: generateId(),
          featureId: feature.id,
          steps: [],
        };
        const name = trimmed.replace("Background:", "").trim();
        if (name) background.name = name;
        const comments = takeComments();
        if (comments.length > 0) background.headerComments = comments;
        feature.background = background;
        pendingTags = [];
        startDescription("ignore", () => {});
        continue;
      }

      // ── Scenario / Scenario Outline / Example ──
      const scenarioMatch = trimmed.match(SCENARIO_RE);
      if (scenarioMatch) {
        finishDescription();
        inBackground = false;
        inExamples = false;
        const isOutline =
          scenarioMatch[1] === "Scenario Outline" ||
          scenarioMatch[1] === "Scenario Template";
        const scenario: Scenario = {
          id: generateId(),
          featureId: feature.id,
          name: scenarioMatch[2].trim(),
          type: isOutline ? "scenario_outline" : "scenario",
          status: "backlog",
          position: feature.scenarios.length,
          tags: toTags(pendingTags),
          steps: [],
          examples: [],
          headerComments: takeComments(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        if (currentRule) scenario.rule = currentRule;
        currentScenario = scenario;
        feature.scenarios.push(scenario);
        pendingTags = [];
        startDescription("scenario", (d) => (scenario.description = d));
        continue;
      }

      // ── Examples ──
      if (
        (trimmed.startsWith("Examples:") || trimmed.startsWith("Scenarios:")) &&
        currentScenario
      ) {
        finishDescription();
        inExamples = true;
        const examples: Examples = {
          id: generateId(),
          scenarioId: currentScenario.id,
          name: trimmed.replace(/^(Examples|Scenarios):/, "").trim(),
          headers: [],
          rows: [],
          position: currentScenario.examples.length,
        };
        if (pendingTags.length > 0) examples.tags = pendingTags;
        const comments = takeComments();
        if (comments.length > 0) examples.headerComments = comments;
        pendingTags = [];
        currentScenario.examples.push(examples);
        continue;
      }

      // Inside a Feature or Rule description, steps and tables are just text
      const d = description as Description | null;
      if (d && (d.kind === "feature" || d.kind === "rule")) {
        d.lines.push(trimmed);
        continue;
      }

      // ── Data table rows (| ... |) ──
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        finishDescription();
        const cells = parseRow(trimmed);

        // Check if we're in examples
        if (
          inExamples &&
          currentScenario &&
          currentScenario.examples.length > 0
        ) {
          const lastEx =
            currentScenario.examples[currentScenario.examples.length - 1];
          if (lastEx.headers.length === 0) {
            lastEx.headers = cells;
          } else {
            lastEx.rows.push(cells);
          }
          continue;
        }

        // Otherwise it's a data table for the last step
        const target = lastStep();
        if (target) {
          if (!target.dataTable) target.dataTable = [];
          target.dataTable.push(cells);
        }
        continue;
      }

      // ── Steps (Given/When/Then/And/But/*) ──
      const stepMatch = trimmed.match(STEP_RE);
      if (stepMatch) {
        finishDescription();
        inExamples = false;
        const keyword =
          stepMatch[1] === "*" ? "And" : (stepMatch[1] as StepKeyword);
        const step: Step = {
          id: generateId(),
          scenarioId: currentScenario?.id || "",
          keyword,
          text: stepMatch[2],
          dataTable: null,
          docString: null,
          position: 0,
        };
        const comments = takeComments();
        if (comments.length > 0) step.comments = comments;

        if (inBackground && feature.background) {
          step.position = feature.background.steps.length;
          feature.background.steps.push(step);
        } else if (currentScenario) {
          step.position = currentScenario.steps.length;
          currentScenario.steps.push(step);
        }
        continue;
      }

      // ── Free text (description lines) ──
      if (d) d.lines.push(trimmed);
    }

    finishDescription();
    if (pendingComments.length > 0) feature.footerComments = pendingComments;

    return feature;
  } catch {
    return null;
  }
}

// ─── Parse multiple feature files ─────────────────────────────

export function parseFeatureFiles(
  files: { name: string; content: string; path?: string }[],
  projectId: string,
): Feature[] {
  return files
    .map((file) => {
      const feature = parseGherkin(file.content, projectId);
      if (feature) {
        feature.folderPath = file.path || "";
        if (!feature.name && file.name) {
          feature.name = file.name.replace(".feature", "");
        }
      }
      return feature;
    })
    .filter(Boolean) as Feature[];
}
