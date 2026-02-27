import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Circle,
  CircleDot,
  Loader2,
  CheckCircle2,
  FileText,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  ChevronsUpDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import type { Feature, Scenario, TriageStatus } from "@/types";
import { Button, Badge, EmptyState } from "@/components/ui";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageTransition } from "@/components/animation";
import { collapseTransition } from "@/lib/motion";

const STATUS_CONFIG: {
  status: TriageStatus;
  label: string;
  icon: typeof Circle;
  color: string;
  bg: string;
  badgeBg: string;
}[] = [
  {
    status: "backlog",
    label: "Backlog",
    icon: Circle,
    color: "text-muted-foreground",
    bg: "bg-muted",
    badgeBg: "#6b7280",
  },
  {
    status: "todo",
    label: "To Do",
    icon: CircleDot,
    color: "text-blue-500",
    bg: "bg-blue-500",
    badgeBg: "#3b82f6",
  },
  {
    status: "wip",
    label: "In Progress",
    icon: Loader2,
    color: "text-amber-500",
    bg: "bg-amber-500",
    badgeBg: "#f59e0b",
  },
  {
    status: "done",
    label: "Done",
    icon: CheckCircle2,
    color: "text-green-500",
    bg: "bg-green-500",
    badgeBg: "#22c55e",
  },
];

export function ProjectBoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const project = useAppStore((s) => s.getProject(projectId!));
  const features = useAppStore(
    useShallow((s) => s.getProjectFeatures(projectId!)),
  );
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(
    () => new Set(features.map((f) => f.id)),
  );
  const [filterStatus, setFilterStatus] = useState<TriageStatus | "all">("all");

  if (!project) {
    return (
      <div className="p-6 lg:p-8">
        <EmptyState title="Project not found" />
      </div>
    );
  }

  const toggleFeature = (id: string) => {
    setExpandedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Compute stats
  const allScenarios = features.flatMap((f) => f.scenarios);
  const statusCounts = STATUS_CONFIG.map((s) => ({
    ...s,
    count: allScenarios.filter((sc) => (sc.status || "backlog") === s.status)
      .length,
  }));
  const total = allScenarios.length;
  const backlogCount =
    statusCounts.find((s) => s.status === "backlog")?.count ?? 0;
  const activeCount = total - backlogCount;
  const progress = total > 0 ? Math.round((activeCount / total) * 100) : 0;
  const progressSegments = statusCounts.filter((s) => s.status !== "backlog");

  const filteredFeatures =
    filterStatus === "all"
      ? features
      : features.filter((f) =>
          f.scenarios.some((s) => (s.status || "backlog") === filterStatus),
        );

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <Breadcrumbs
          items={[
            { label: "Dashboard", path: "/dashboard" },
            { label: project.name, path: `/projects/${projectId}` },
            { label: "Board" },
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Project Board</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Overview of all scenarios across all features.
            </p>
          </div>
          {features.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setExpandedFeatures(new Set(features.map((f) => f.id)))
                }
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md border border-input bg-background hover:bg-accent transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <ChevronsUpDown className="w-3.5 h-3.5" />
                Expand All
              </button>
              <button
                onClick={() => setExpandedFeatures(new Set())}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md border border-input bg-background hover:bg-accent transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <ChevronsUpDown className="w-3.5 h-3.5 rotate-90" />
                Collapse All
              </button>
            </div>
          )}
        </div>

        {/* Stats bar */}
        {total > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-lg border border-border bg-muted/20 px-4 py-3 mb-6">
            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <div className="w-32 h-2.5 rounded-full bg-muted overflow-hidden flex">
                {progressSegments.map(
                  (s) =>
                    s.count > 0 && (
                      <div
                        key={s.status}
                        className={`h-full ${s.bg} transition-all duration-300`}
                        style={{ width: `${(s.count / total) * 100}%` }}
                      />
                    ),
                )}
              </div>
              <span className="text-sm font-medium">{progress}%</span>
            </div>

            {/* Status filters */}
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => setFilterStatus("all")}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                  filterStatus === "all"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                All ({total})
              </button>
              {statusCounts.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.status}
                    onClick={() => setFilterStatus(s.status)}
                    className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                      filterStatus === s.status
                        ? "bg-primary text-primary-foreground"
                        : `${s.color} hover:bg-accent`
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {s.label} ({s.count})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {features.length === 0 ? (
          <EmptyState
            title="No features yet"
            description="Create features to see them on the board."
          />
        ) : (
          <div className="space-y-3">
            {filteredFeatures.map((feature) => (
              <FeatureRow
                key={feature.id}
                feature={feature}
                expanded={expandedFeatures.has(feature.id)}
                onToggle={() => toggleFeature(feature.id)}
                filterStatus={filterStatus}
                onNavigate={() =>
                  navigate(`/projects/${projectId}/features/${feature.id}`)
                }
                onKanban={() =>
                  navigate(
                    `/projects/${projectId}/features/${feature.id}/board`,
                  )
                }
              />
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}

// ─── Feature Row ────────────────────────────────────────────

function FeatureRow({
  feature,
  expanded,
  onToggle,
  filterStatus,
  onNavigate,
  onKanban,
}: {
  feature: Feature;
  expanded: boolean;
  onToggle: () => void;
  filterStatus: TriageStatus | "all";
  onNavigate: () => void;
  onKanban: () => void;
}) {
  const scenarios =
    filterStatus === "all"
      ? feature.scenarios
      : feature.scenarios.filter(
          (s) => (s.status || "backlog") === filterStatus,
        );

  const total = feature.scenarios.length;
  const done = feature.scenarios.filter(
    (s) => (s.status || "backlog") === "done",
  ).length;

  // Build mini status counts
  const statusCounts = STATUS_CONFIG.map((c) => ({
    ...c,
    count: feature.scenarios.filter((s) => (s.status || "backlog") === c.status)
      .length,
  }));
  const featureBacklog =
    statusCounts.find((c) => c.status === "backlog")?.count ?? 0;
  const featureActive = total - featureBacklog;
  const featureProgressSegments = statusCounts.filter(
    (c) => c.status !== "backlog",
  );

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Feature header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        <FileText className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm truncate">{feature.name}</h3>
            {feature.tags.length > 0 && (
              <div className="flex gap-1">
                {feature.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag.id} color={tag.color} className="text-[9px]">
                    @{tag.name}
                  </Badge>
                ))}
                {feature.tags.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{feature.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
          {/* Mini status bar */}
          <div className="flex items-center gap-2 mt-1">
            <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden flex">
              {featureProgressSegments.map(
                (c) =>
                  c.count > 0 && (
                    <div
                      key={c.status}
                      className={`h-full ${c.bg}`}
                      style={{
                        width: `${(c.count / total) * 100}%`,
                      }}
                    />
                  ),
              )}
            </div>
            <span className="text-[11px] text-muted-foreground">
              {featureActive}/{total} active
            </span>
            <div className="flex items-center gap-1.5 ml-1">
              {statusCounts
                .filter((c) => c.count > 0)
                .map((c) => {
                  const Icon = c.icon;
                  return (
                    <span
                      key={c.status}
                      className={`flex items-center gap-0.5 text-[10px] ${c.color}`}
                    >
                      <Icon className="w-3 h-3" />
                      {c.count}
                    </span>
                  );
                })}
            </div>
          </div>
        </div>

        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onKanban}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-md hover:bg-accent transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
            title="Open Kanban View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kanban</span>
          </button>
          <button
            onClick={onNavigate}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-md hover:bg-accent transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
            title="Edit Feature"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Edit</span>
          </button>
        </div>
      </div>

      {/* Scenario list */}
      <AnimatePresence>
        {expanded && scenarios.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={collapseTransition}
            className="overflow-hidden"
          >
            <div className="border-t border-border">
              {scenarios
                .sort((a, b) => a.position - b.position)
                .map((scenario) => (
                  <ScenarioRow key={scenario.id} scenario={scenario} />
                ))}
            </div>
          </motion.div>
        )}
        {expanded && scenarios.length === 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={collapseTransition}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
              No scenarios
              {filterStatus !== "all" ? ` with status "${filterStatus}"` : ""}.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Scenario Row ───────────────────────────────────────────

function ScenarioRow({ scenario }: { scenario: Scenario }) {
  const status = scenario.status || "backlog";
  const config = STATUS_CONFIG.find((c) => c.status === status)!;
  const Icon = config.icon;
  const keyword = scenario.type === "scenario_outline" ? "Outline" : "Scenario";

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors">
      <div className="w-6 shrink-0" />
      <Icon className={`w-4 h-4 shrink-0 ${config.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-wider font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
            {keyword}
          </span>
          <span className="text-sm truncate">{scenario.name}</span>
        </div>
        {scenario.tags.length > 0 && (
          <div className="flex gap-1 mt-0.5">
            {scenario.tags.map((tag) => (
              <Badge key={tag.id} color={tag.color} className="text-[9px]">
                @{tag.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground">
          {scenario.steps.length} steps
        </span>
        <Badge color={config.badgeBg} className="text-[10px]">
          {config.label}
        </Badge>
      </div>
    </div>
  );
}
