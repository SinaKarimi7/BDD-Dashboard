import type { SelectOption } from "@/components/ui/Select";
import { STEP_KEYWORDS, stepKeywordLabel } from "@/lib/gherkin";
import type { Step, StepKeyword } from "@/types";

const KEYWORD_COLORS: Record<StepKeyword, string> = {
  Given: "text-blue-600",
  When: "text-amber-600",
  Then: "text-green-600",
  And: "text-gray-500",
  But: "text-red-500",
};

// Step keyword choices labelled in the feature's language, e.g. "Soit".
// With a step, its own spelling (like "*") is used for its keyword.
export function keywordOptions(
  language?: string,
  step?: Step,
): SelectOption<StepKeyword>[] {
  return STEP_KEYWORDS.map((keyword) => ({
    value: keyword,
    label: stepKeywordLabel(keyword, language, step),
    className: KEYWORD_COLORS[keyword],
  }));
}
