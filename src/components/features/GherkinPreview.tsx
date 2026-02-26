import { useMemo } from "react";
import type { Feature } from "@/types";
import { featureToGherkin } from "@/lib/gherkin";

interface GherkinPreviewProps {
  feature: Feature;
}

export function GherkinPreview({ feature }: GherkinPreviewProps) {
  const gherkin = useMemo(() => featureToGherkin(feature), [feature]);

  const highlighted = useMemo(() => {
    return gherkin.split("\n").map((line, i) => {
      const trimmed = line.trim();

      if (trimmed.startsWith("@")) {
        return (
          <div key={i} className="gherkin-tag">
            {line}
          </div>
        );
      }

      if (trimmed.startsWith("#")) {
        return (
          <div key={i} className="gherkin-comment">
            {line}
          </div>
        );
      }

      const keywordMatch = trimmed.match(
        /^(Feature:|Scenario Outline:|Scenario:|Background:|Examples:|Given |When |Then |And |But )/,
      );
      if (keywordMatch) {
        const kw = keywordMatch[1];
        const rest = line.slice(line.indexOf(kw) + kw.length);
        const indent = line.slice(0, line.indexOf(kw));
        return (
          <div key={i}>
            <span>{indent}</span>
            <span className="gherkin-keyword">{kw}</span>
            <span>{rest}</span>
          </div>
        );
      }

      if (trimmed.startsWith("|")) {
        return (
          <div key={i} className="text-muted-foreground">
            {line}
          </div>
        );
      }

      if (trimmed === '"""') {
        return (
          <div key={i} className="text-amber-500">
            {line}
          </div>
        );
      }

      return <div key={i}>{line || "\u00A0"}</div>;
    });
  }, [gherkin]);

  return (
    <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Gherkin Preview
        </span>
        <button
          onClick={() => navigator.clipboard.writeText(gherkin)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          Copy
        </button>
      </div>
      <pre className="p-4 text-sm font-mono overflow-x-auto leading-relaxed">
        {highlighted}
      </pre>
    </div>
  );
}
