import { useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  BarChart3,
  FileText,
  FlaskConical,
  Footprints,
  Tags,
  Circle,
  CircleDot,
  Loader2,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import type { TriageStatus } from "@/types";
import { Card, CardContent, EmptyState } from "@/components/ui";
import { Badge } from "@/components/ui";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "@/components/animation";
import { easing, duration } from "@/lib/motion";

const STATUS_CONFIG: Record<
  TriageStatus,
  { label: string; color: string; bg: string; icon: typeof Circle }
> = {
  backlog: {
    label: "Backlog",
    color: "text-gray-500",
    bg: "bg-gray-500",
    icon: Circle,
  },
  todo: {
    label: "To Do",
    color: "text-blue-500",
    bg: "bg-blue-500",
    icon: CircleDot,
  },
  wip: {
    label: "In Progress",
    color: "text-amber-500",
    bg: "bg-amber-500",
    icon: Loader2,
  },
  done: {
    label: "Done",
    color: "text-green-500",
    bg: "bg-green-500",
    icon: CheckCircle2,
  },
};

const STEP_KEYWORD_COLORS: Record<string, string> = {
  Given: "bg-blue-500",
  When: "bg-amber-500",
  Then: "bg-green-500",
  And: "bg-purple-500",
  But: "bg-red-500",
};

export function AnalyticsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useAppStore((s) => s.getProject(projectId!));
  const features = useAppStore(
    useShallow((s) => s.getProjectFeatures(projectId!)),
  );
  const tags = useAppStore(useShallow((s) => s.getProjectTags(projectId!)));

  const stats = useMemo(() => {
    const allScenarios = features.flatMap((f) => f.scenarios);
    const allSteps = allScenarios.flatMap((s) => s.steps);

    // Step keyword distribution
    const stepKeywords: Record<string, number> = {};
    allSteps.forEach((step) => {
      stepKeywords[step.keyword] = (stepKeywords[step.keyword] || 0) + 1;
    });

    // Scenario type distribution
    const scenarioTypes = {
      scenario: allScenarios.filter((s) => s.type === "scenario").length,
      scenario_outline: allScenarios.filter(
        (s) => s.type === "scenario_outline",
      ).length,
    };

    // Triage status distribution
    const triageStatus: Record<TriageStatus, number> = {
      backlog: 0,
      todo: 0,
      wip: 0,
      done: 0,
    };
    allScenarios.forEach((s) => {
      const status = (s.status || "backlog") as TriageStatus;
      triageStatus[status]++;
    });

    // Tag usage
    const tagUsage: {
      id: string;
      name: string;
      color: string;
      count: number;
    }[] = tags.map((tag) => {
      let count = 0;
      features.forEach((f) => {
        if (f.tags.some((t) => t.id === tag.id)) count++;
        f.scenarios.forEach((s) => {
          if (s.tags.some((t) => t.id === tag.id)) count++;
        });
      });
      return { id: tag.id, name: tag.name, color: tag.color, count };
    });
    tagUsage.sort((a, b) => b.count - a.count);

    // Features by scenario count
    const featuresBySize = features
      .map((f) => ({
        id: f.id,
        name: f.name,
        scenarios: f.scenarios.length,
        steps: f.scenarios.reduce((acc, s) => acc + s.steps.length, 0),
      }))
      .sort((a, b) => b.scenarios - a.scenarios);

    // Average steps per scenario
    const avgSteps =
      allScenarios.length > 0
        ? Math.round((allSteps.length / allScenarios.length) * 10) / 10
        : 0;

    // Scenarios with examples
    const withExamples = allScenarios.filter(
      (s) => s.examples.length > 0,
    ).length;

    // Data tables count
    const withDataTables = allSteps.filter(
      (s) => s.dataTable && s.dataTable.length > 0,
    ).length;

    // Doc strings count
    const withDocStrings = allSteps.filter(
      (s) => s.docString && s.docString.length > 0,
    ).length;

    // Completion rate
    const completionRate =
      allScenarios.length > 0
        ? Math.round((triageStatus.done / allScenarios.length) * 100)
        : 0;

    return {
      featureCount: features.length,
      scenarioCount: allScenarios.length,
      stepCount: allSteps.length,
      tagCount: tags.length,
      stepKeywords,
      scenarioTypes,
      triageStatus,
      tagUsage,
      featuresBySize,
      avgSteps,
      withExamples,
      withDataTables,
      withDocStrings,
      completionRate,
    };
  }, [features, tags]);

  if (!project) return null;

  const maxTagCount = Math.max(...stats.tagUsage.map((t) => t.count), 1);
  const maxFeatureScenarios = Math.max(
    ...stats.featuresBySize.map((f) => f.scenarios),
    1,
  );
  const totalSteps = stats.stepCount || 1;

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <Breadcrumbs
          items={[
            { label: "Dashboard", path: "/dashboard" },
            { label: project.name, path: `/projects/${projectId}` },
            { label: "Analytics" },
          ]}
        />

        <div className="mt-4 mb-8">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Analytics
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Statistics and insights for {project.name}
          </p>
        </div>

        {stats.featureCount === 0 ? (
          <EmptyState
            icon={<BarChart3 className="w-12 h-12" />}
            title="No data to analyze yet"
            description="Create some features and scenarios to see analytics and statistics."
          />
        ) : (
          <div className="space-y-8">
            {/* Overview Cards */}
            <StaggerContainer className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
              {[
                {
                  icon: FileText,
                  label: "Features",
                  value: stats.featureCount,
                  color: "text-blue-500",
                },
                {
                  icon: FlaskConical,
                  label: "Scenarios",
                  value: stats.scenarioCount,
                  color: "text-purple-500",
                },
                {
                  icon: Footprints,
                  label: "Steps",
                  value: stats.stepCount,
                  color: "text-amber-500",
                },
                {
                  icon: Tags,
                  label: "Tags",
                  value: stats.tagCount,
                  color: "text-green-500",
                },
                {
                  icon: TrendingUp,
                  label: "Avg Steps/Scenario",
                  value: stats.avgSteps,
                  color: "text-cyan-500",
                },
              ].map((stat) => (
                <StaggerItem key={stat.label}>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <stat.icon className={`w-4 h-4 ${stat.color}`} />
                        <span className="text-xs text-muted-foreground">
                          {stat.label}
                        </span>
                      </div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Triage Status */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Triage Status
                  </h3>
                  {stats.scenarioCount === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No scenarios yet
                    </p>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-full h-3 rounded-full bg-muted overflow-hidden flex">
                          {(
                            ["backlog", "todo", "wip", "done"] as TriageStatus[]
                          ).map((status) => {
                            const count = stats.triageStatus[status];
                            const pct = (count / stats.scenarioCount) * 100;
                            if (pct === 0) return null;
                            return (
                              <motion.div
                                key={status}
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{
                                  duration: duration.slower,
                                  ease: easing.apple,
                                  delay: 0.2,
                                }}
                                className={`h-full ${STATUS_CONFIG[status].bg}`}
                              />
                            );
                          })}
                        </div>
                        <span className="text-sm font-semibold text-green-500 shrink-0">
                          {stats.completionRate}%
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {(
                          ["backlog", "todo", "wip", "done"] as TriageStatus[]
                        ).map((status) => {
                          const config = STATUS_CONFIG[status];
                          const Icon = config.icon;
                          return (
                            <div
                              key={status}
                              className="flex items-center gap-2"
                            >
                              <Icon className={`w-4 h-4 ${config.color}`} />
                              <span className="text-sm text-muted-foreground">
                                {config.label}
                              </span>
                              <span className="ml-auto text-sm font-semibold">
                                {stats.triageStatus[status]}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Step Keyword Distribution */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <Footprints className="w-4 h-4 text-amber-500" />
                    Step Keywords
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(stats.stepKeywords)
                      .sort(([, a], [, b]) => b - a)
                      .map(([keyword, count]) => {
                        const pct = (count / totalSteps) * 100;
                        return (
                          <div key={keyword}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="font-medium">{keyword}</span>
                              <span className="text-muted-foreground">
                                {count}{" "}
                                <span className="text-xs">
                                  ({Math.round(pct)}%)
                                </span>
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{
                                  duration: duration.slower,
                                  ease: easing.apple,
                                  delay: 0.3,
                                }}
                                className={`h-full rounded-full ${STEP_KEYWORD_COLORS[keyword] || "bg-primary"}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>

              {/* Tag Usage */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <Tags className="w-4 h-4 text-green-500" />
                    Tag Usage
                  </h3>
                  {stats.tagUsage.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No tags created yet
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {stats.tagUsage.slice(0, 10).map((tag) => (
                        <div key={tag.id}>
                          <div className="flex items-center justify-between mb-1">
                            <Badge color={tag.color} className="text-xs">
                              @{tag.name}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {tag.count} usage{tag.count !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${(tag.count / maxTagCount) * 100}%`,
                              }}
                              transition={{
                                duration: duration.slower,
                                ease: easing.apple,
                                delay: 0.4,
                              }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Features by Size */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    Features by Scenario Count
                  </h3>
                  <div className="space-y-2.5">
                    {stats.featuresBySize.slice(0, 8).map((feature) => (
                      <div key={feature.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate max-w-[200px]">
                            {feature.name}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0 ml-2">
                            {feature.scenarios} scenarios, {feature.steps} steps
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(feature.scenarios / maxFeatureScenarios) * 100}%`,
                            }}
                            transition={{
                              duration: duration.slower,
                              ease: easing.apple,
                              delay: 0.4,
                            }}
                            className="h-full rounded-full bg-blue-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bottom stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">
                    {stats.scenarioTypes.scenario}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Scenarios
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">
                    {stats.scenarioTypes.scenario_outline}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Scenario Outlines
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{stats.withExamples}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    With Examples
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">
                    {stats.withDataTables + stats.withDocStrings}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Data Tables & Docs
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
