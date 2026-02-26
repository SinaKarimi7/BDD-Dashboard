import type { Feature, Step, StepKeyword } from "@/types";
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

export function featureToGherkin(feature: Feature): string {
  const lines: string[] = [];

  // Feature-level tags
  if (feature.tags.length > 0) {
    lines.push(feature.tags.map((t) => `@${t.name}`).join(" "));
  }

  lines.push(`Feature: ${feature.name}`);

  if (feature.description) {
    feature.description.split("\n").forEach((line) => {
      lines.push(`  ${line}`);
    });
    lines.push("");
  }

  // Background
  if (feature.background && feature.background.steps.length > 0) {
    lines.push("  Background:");
    feature.background.steps.forEach((step) => {
      lines.push(`    ${step.keyword} ${step.text}`);
      if (step.dataTable) {
        step.dataTable.forEach((row) => {
          lines.push(`      | ${row.join(" | ")} |`);
        });
      }
      if (step.docString) {
        lines.push('      """');
        step.docString.split("\n").forEach((l) => lines.push(`      ${l}`));
        lines.push('      """');
      }
    });
    lines.push("");
  }

  // Scenarios
  feature.scenarios
    .sort((a, b) => a.position - b.position)
    .forEach((scenario) => {
      // Scenario tags
      if (scenario.tags.length > 0) {
        lines.push(`  ${scenario.tags.map((t) => `@${t.name}`).join(" ")}`);
      }

      const keyword =
        scenario.type === "scenario_outline" ? "Scenario Outline" : "Scenario";
      lines.push(`  ${keyword}: ${scenario.name}`);

      // Steps
      scenario.steps
        .sort((a, b) => a.position - b.position)
        .forEach((step) => {
          lines.push(`    ${step.keyword} ${step.text}`);
          if (step.dataTable) {
            step.dataTable.forEach((row) => {
              lines.push(`      | ${row.join(" | ")} |`);
            });
          }
          if (step.docString) {
            lines.push('      """');
            step.docString.split("\n").forEach((l) => lines.push(`      ${l}`));
            lines.push('      """');
          }
        });

      // Examples
      if (
        scenario.type === "scenario_outline" &&
        scenario.examples.length > 0
      ) {
        scenario.examples.forEach((ex) => {
          lines.push("");
          lines.push(`    Examples:${ex.name ? ` ${ex.name}` : ""}`);
          if (ex.headers.length > 0) {
            lines.push(`      | ${ex.headers.join(" | ")} |`);
            ex.rows.forEach((row) => {
              lines.push(`      | ${row.join(" | ")} |`);
            });
          }
        });
      }

      lines.push("");
    });

  return lines.join("\n");
}

// ─── Parse Gherkin text into a Feature ────────────────────────

export function parseGherkin(text: string, projectId: string): Feature | null {
  try {
    const lines = text.split("\n");
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let currentScenario: (typeof feature.scenarios)[0] | null = null;
    let inBackground = false;
    let inDocString = false;
    let docStringBuffer: string[] = [];
    let pendingTags: string[] = [];
    let descriptionLines: string[] = [];
    let inDescription = false;

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      const trimmed = line.trim();

      // Doc string boundaries
      if (trimmed === '"""') {
        if (inDocString) {
          // Close doc string
          const target = currentScenario
            ? currentScenario.steps[currentScenario.steps.length - 1]
            : null;
          if (target) {
            target.docString = docStringBuffer.join("\n");
          }
          docStringBuffer = [];
          inDocString = false;
        } else {
          inDocString = true;
        }
        continue;
      }

      if (inDocString) {
        docStringBuffer.push(trimmed);
        continue;
      }

      // Empty lines
      if (!trimmed) {
        if (inDescription) inDescription = false;
        continue;
      }

      // Tags
      if (trimmed.startsWith("@")) {
        pendingTags.push(
          ...trimmed
            .split(/\s+/)
            .filter((t) => t.startsWith("@"))
            .map((t) => t.slice(1)),
        );
        continue;
      }

      // Feature
      if (trimmed.startsWith("Feature:")) {
        feature.name = trimmed.replace("Feature:", "").trim();
        feature.tags = pendingTags.map((name, i) => ({
          id: generateId(),
          projectId,
          name,
          color: TAG_COLORS[i % TAG_COLORS.length],
        }));
        pendingTags = [];
        inDescription = true;
        continue;
      }

      // Collect description lines after Feature:
      if (
        inDescription &&
        !trimmed.startsWith("Scenario") &&
        !trimmed.startsWith("Background")
      ) {
        descriptionLines.push(trimmed);
        continue;
      }

      // Background
      if (trimmed.startsWith("Background:")) {
        feature.description = descriptionLines.join("\n");
        inDescription = false;
        inBackground = true;
        currentScenario = null;
        feature.background = {
          id: generateId(),
          featureId: feature.id,
          steps: [],
        };
        pendingTags = [];
        continue;
      }

      // Scenario / Scenario Outline
      if (
        trimmed.startsWith("Scenario Outline:") ||
        trimmed.startsWith("Scenario:")
      ) {
        if (inDescription) {
          feature.description = descriptionLines.join("\n");
          inDescription = false;
        }
        inBackground = false;
        const isOutline = trimmed.startsWith("Scenario Outline:");
        const name = trimmed
          .replace(isOutline ? "Scenario Outline:" : "Scenario:", "")
          .trim();
        currentScenario = {
          id: generateId(),
          featureId: feature.id,
          name,
          type: isOutline ? "scenario_outline" : "scenario",
          position: feature.scenarios.length,
          tags: pendingTags.map((tagName, i) => ({
            id: generateId(),
            projectId,
            name: tagName,
            color: TAG_COLORS[i % TAG_COLORS.length],
          })),
          steps: [],
          examples: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        feature.scenarios.push(currentScenario);
        pendingTags = [];
        continue;
      }

      // Examples
      if (trimmed.startsWith("Examples:") && currentScenario) {
        const name = trimmed.replace("Examples:", "").trim();
        currentScenario.examples.push({
          id: generateId(),
          scenarioId: currentScenario.id,
          name,
          headers: [],
          rows: [],
          position: currentScenario.examples.length,
        });
        continue;
      }

      // Data table rows (| ... |)
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        const cells = trimmed
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim());

        // Check if we're in examples
        if (currentScenario && currentScenario.examples.length > 0) {
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
        const stepsTarget =
          inBackground && feature.background
            ? feature.background.steps
            : currentScenario?.steps;
        if (stepsTarget && stepsTarget.length > 0) {
          const lastStep = stepsTarget[stepsTarget.length - 1];
          if (!lastStep.dataTable) lastStep.dataTable = [];
          lastStep.dataTable.push(cells);
        }
        continue;
      }

      // Steps
      const stepMatch = trimmed.match(/^(Given|When|Then|And|But)\s+(.+)$/);
      if (stepMatch) {
        const step: Step = {
          id: generateId(),
          scenarioId: currentScenario?.id || "",
          keyword: stepMatch[1] as StepKeyword,
          text: stepMatch[2],
          dataTable: null,
          docString: null,
          position: 0,
        };

        if (inBackground && feature.background) {
          step.position = feature.background.steps.length;
          feature.background.steps.push(step);
        } else if (currentScenario) {
          step.position = currentScenario.steps.length;
          currentScenario.steps.push(step);
        }
        continue;
      }
    }

    if (inDescription) {
      feature.description = descriptionLines.join("\n");
    }

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
