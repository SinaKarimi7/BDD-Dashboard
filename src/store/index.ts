import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Project,
  Feature,
  Scenario,
  Step,
  Tag,
  Background,
  Examples,
  CreateProjectInput,
  CreateFeatureInput,
  CreateScenarioInput,
  CreateStepInput,
  CreateTagInput,
  StepKeyword,
  TriageStatus,
  GitHubConnection,
  GitHubFileMapping,
} from "@/types";
import { generateId } from "@/lib/utils";

export interface SystemSettings {
  defaultScenarioStatus: TriageStatus;
  autoSaveDrafts: boolean;
  gherkinLanguage: string;
  exportFormat: "feature" | "json";
  showStepSuggestions: boolean;
}

const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  defaultScenarioStatus: "backlog",
  autoSaveDrafts: true,
  gherkinLanguage: "en",
  exportFormat: "feature",
  showStepSuggestions: true,
};

interface AppState {
  // Data
  projects: Project[];
  features: Feature[];
  tags: Tag[];

  // Project CRUD
  addProject: (input: CreateProjectInput) => Project;
  updateProject: (id: string, input: Partial<CreateProjectInput>) => void;
  deleteProject: (id: string) => void;

  // Feature CRUD
  addFeature: (projectId: string, input: CreateFeatureInput) => Feature;
  updateFeature: (id: string, updates: Partial<Feature>) => void;
  deleteFeature: (id: string) => void;
  reorderFeatures: (projectId: string, featureIds: string[]) => void;
  importFeatures: (projectId: string, features: Feature[]) => void;

  // Scenario CRUD
  addScenario: (featureId: string, input: CreateScenarioInput) => Scenario;
  updateScenario: (
    featureId: string,
    scenarioId: string,
    updates: Partial<Scenario>,
  ) => void;
  deleteScenario: (featureId: string, scenarioId: string) => void;
  cloneScenario: (featureId: string, scenarioId: string) => Scenario | null;
  reorderScenarios: (featureId: string, scenarioIds: string[]) => void;

  // Step CRUD
  addStep: (
    featureId: string,
    scenarioId: string,
    input: CreateStepInput,
  ) => Step;
  updateStep: (
    featureId: string,
    scenarioId: string,
    stepId: string,
    updates: Partial<Step>,
  ) => void;
  deleteStep: (featureId: string, scenarioId: string, stepId: string) => void;
  reorderSteps: (
    featureId: string,
    scenarioId: string,
    stepIds: string[],
  ) => void;

  // Background
  setBackground: (featureId: string, steps: CreateStepInput[]) => void;
  removeBackground: (featureId: string) => void;

  // Examples (Scenario Outline)
  addExamples: (
    featureId: string,
    scenarioId: string,
    examples: Omit<Examples, "id" | "scenarioId" | "position">,
  ) => void;
  updateExamples: (
    featureId: string,
    scenarioId: string,
    examplesId: string,
    updates: Partial<Examples>,
  ) => void;
  deleteExamples: (
    featureId: string,
    scenarioId: string,
    examplesId: string,
  ) => void;

  // Tags
  addTag: (projectId: string, input: CreateTagInput) => Tag;
  updateTag: (id: string, updates: Partial<CreateTagInput>) => void;
  deleteTag: (id: string) => void;
  assignTag: (
    featureId: string,
    tagId: string,
    targetType: "feature" | "scenario",
    targetId: string,
  ) => void;
  unassignTag: (
    featureId: string,
    tagId: string,
    targetType: "feature" | "scenario",
    targetId: string,
  ) => void;

  // GitHub integration
  githubConnection: GitHubConnection | null;
  githubFileMappings: GitHubFileMapping[];
  setGitHubConnection: (connection: GitHubConnection | null) => void;
  setGitHubFileMappings: (mappings: GitHubFileMapping[]) => void;
  addGitHubFileMapping: (mapping: GitHubFileMapping) => void;
  updateGitHubFileMapping: (
    featureId: string,
    updates: Partial<GitHubFileMapping>,
  ) => void;
  removeGitHubFileMapping: (featureId: string) => void;

  // Helpers
  getProject: (id: string) => Project | undefined;
  getFeature: (id: string) => Feature | undefined;
  getProjectFeatures: (projectId: string) => Feature[];
  getProjectTags: (projectId: string) => Tag[];

  // System settings
  systemSettings: SystemSettings;
  updateSystemSettings: (updates: Partial<SystemSettings>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      projects: [],
      features: [],
      tags: [],

      // ── Projects ──────────────────────────────────────────
      addProject: (input) => {
        const project: Project = {
          id: generateId(),
          name: input.name,
          description: input.description,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ projects: [...s.projects, project] }));
        return project;
      },

      updateProject: (id, input) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id
              ? { ...p, ...input, updatedAt: new Date().toISOString() }
              : p,
          ),
        }));
      },

      deleteProject: (id) => {
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          features: s.features.filter((f) => f.projectId !== id),
          tags: s.tags.filter((t) => t.projectId !== id),
        }));
      },

      // ── Features ──────────────────────────────────────────
      addFeature: (projectId, input) => {
        const state = get();
        const projectFeatures = state.features.filter(
          (f) => f.projectId === projectId,
        );
        const feature: Feature = {
          id: generateId(),
          projectId,
          name: input.name,
          description: input.description,
          folderPath: input.folderPath || "",
          position: projectFeatures.length,
          tags: [],
          scenarios: [],
          background: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ features: [...s.features, feature] }));
        return feature;
      },

      updateFeature: (id, updates) => {
        set((s) => ({
          features: s.features.map((f) =>
            f.id === id
              ? { ...f, ...updates, updatedAt: new Date().toISOString() }
              : f,
          ),
        }));
      },

      deleteFeature: (id) => {
        set((s) => ({ features: s.features.filter((f) => f.id !== id) }));
      },

      reorderFeatures: (projectId, featureIds) => {
        set((s) => ({
          features: s.features.map((f) => {
            if (f.projectId !== projectId) return f;
            const idx = featureIds.indexOf(f.id);
            return idx !== -1 ? { ...f, position: idx } : f;
          }),
        }));
      },

      importFeatures: (projectId, importedFeatures) => {
        const state = get();
        const existing = state.features.filter(
          (f) => f.projectId === projectId,
        ).length;

        // Build lookup of tags already in this project (by name)
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
        const existingTagMap = new Map(
          state.tags
            .filter((t) => t.projectId === projectId)
            .map((t) => [t.name.toLowerCase(), t]),
        );
        const newTagEntries: Tag[] = [];

        const resolveTag = (tagName: string): Tag => {
          const key = tagName.toLowerCase();
          if (existingTagMap.has(key)) return existingTagMap.get(key)!;
          const tag: Tag = {
            id: generateId(),
            projectId,
            name: tagName,
            color:
              TAG_COLORS[
                (existingTagMap.size + newTagEntries.length) % TAG_COLORS.length
              ],
          };
          existingTagMap.set(key, tag);
          newTagEntries.push(tag);
          return tag;
        };

        const withProject = importedFeatures.map((f, i) => {
          const newFeatureId = generateId();
          return {
            ...f,
            id: newFeatureId,
            projectId,
            position: existing + i,
            tags: f.tags.map((t) => resolveTag(t.name)),
            scenarios: f.scenarios.map((s) => ({
              ...s,
              id: generateId(),
              featureId: newFeatureId,
              tags: s.tags.map((t) => resolveTag(t.name)),
              steps: s.steps.map((st) => ({ ...st, id: generateId() })),
            })),
          };
        });

        set((s) => ({
          features: [...s.features, ...withProject],
          tags:
            newTagEntries.length > 0 ? [...s.tags, ...newTagEntries] : s.tags,
        }));
      },

      // ── Scenarios ─────────────────────────────────────────
      addScenario: (featureId, input) => {
        const state = get();
        const feature = state.features.find((f) => f.id === featureId);
        const scenario: Scenario = {
          id: generateId(),
          featureId,
          name: input.name,
          type: input.type,
          status: state.systemSettings?.defaultScenarioStatus || "backlog",
          position: feature?.scenarios.length ?? 0,
          tags: [],
          steps: [],
          examples: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({
          features: s.features.map((f) =>
            f.id === featureId
              ? {
                  ...f,
                  scenarios: [...f.scenarios, scenario],
                  updatedAt: new Date().toISOString(),
                }
              : f,
          ),
        }));
        return scenario;
      },

      updateScenario: (featureId, scenarioId, updates) => {
        set((s) => ({
          features: s.features.map((f) =>
            f.id === featureId
              ? {
                  ...f,
                  scenarios: f.scenarios.map((sc) =>
                    sc.id === scenarioId
                      ? {
                          ...sc,
                          ...updates,
                          updatedAt: new Date().toISOString(),
                        }
                      : sc,
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : f,
          ),
        }));
      },

      deleteScenario: (featureId, scenarioId) => {
        set((s) => ({
          features: s.features.map((f) =>
            f.id === featureId
              ? {
                  ...f,
                  scenarios: f.scenarios
                    .filter((sc) => sc.id !== scenarioId)
                    .map((sc, i) => ({ ...sc, position: i })),
                  updatedAt: new Date().toISOString(),
                }
              : f,
          ),
        }));
      },

      cloneScenario: (featureId, scenarioId) => {
        const state = get();
        const feature = state.features.find((f) => f.id === featureId);
        const scenario = feature?.scenarios.find((sc) => sc.id === scenarioId);
        if (!scenario) return null;

        const cloned: Scenario = {
          ...scenario,
          id: generateId(),
          name: `${scenario.name} (Copy)`,
          status: scenario.status || "backlog",
          position: feature!.scenarios.length,
          steps: scenario.steps.map((st) => ({ ...st, id: generateId() })),
          examples: scenario.examples.map((ex) => ({
            ...ex,
            id: generateId(),
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((s) => ({
          features: s.features.map((f) =>
            f.id === featureId
              ? {
                  ...f,
                  scenarios: [...f.scenarios, cloned],
                  updatedAt: new Date().toISOString(),
                }
              : f,
          ),
        }));
        return cloned;
      },

      reorderScenarios: (featureId, scenarioIds) => {
        set((s) => ({
          features: s.features.map((f) => {
            if (f.id !== featureId) return f;
            const reordered = scenarioIds
              .map((id, i) => {
                const sc = f.scenarios.find((s) => s.id === id);
                return sc ? { ...sc, position: i } : null;
              })
              .filter(Boolean) as Scenario[];
            return {
              ...f,
              scenarios: reordered,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      // ── Steps ─────────────────────────────────────────────
      addStep: (featureId, scenarioId, input) => {
        const state = get();
        const feature = state.features.find((f) => f.id === featureId);
        const scenario = feature?.scenarios.find((sc) => sc.id === scenarioId);
        const step: Step = {
          id: generateId(),
          scenarioId,
          keyword: input.keyword,
          text: input.text,
          dataTable: input.dataTable || null,
          docString: input.docString || null,
          position: scenario?.steps.length ?? 0,
        };
        set((s) => ({
          features: s.features.map((f) =>
            f.id === featureId
              ? {
                  ...f,
                  scenarios: f.scenarios.map((sc) =>
                    sc.id === scenarioId
                      ? { ...sc, steps: [...sc.steps, step] }
                      : sc,
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : f,
          ),
        }));
        return step;
      },

      updateStep: (featureId, scenarioId, stepId, updates) => {
        set((s) => ({
          features: s.features.map((f) =>
            f.id === featureId
              ? {
                  ...f,
                  scenarios: f.scenarios.map((sc) =>
                    sc.id === scenarioId
                      ? {
                          ...sc,
                          steps: sc.steps.map((st) =>
                            st.id === stepId ? { ...st, ...updates } : st,
                          ),
                        }
                      : sc,
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : f,
          ),
        }));
      },

      deleteStep: (featureId, scenarioId, stepId) => {
        set((s) => ({
          features: s.features.map((f) =>
            f.id === featureId
              ? {
                  ...f,
                  scenarios: f.scenarios.map((sc) =>
                    sc.id === scenarioId
                      ? {
                          ...sc,
                          steps: sc.steps
                            .filter((st) => st.id !== stepId)
                            .map((st, i) => ({ ...st, position: i })),
                        }
                      : sc,
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : f,
          ),
        }));
      },

      reorderSteps: (featureId, scenarioId, stepIds) => {
        set((s) => ({
          features: s.features.map((f) => {
            if (f.id !== featureId) return f;
            return {
              ...f,
              scenarios: f.scenarios.map((sc) => {
                if (sc.id !== scenarioId) return sc;
                const reordered = stepIds
                  .map((id, i) => {
                    const st = sc.steps.find((s) => s.id === id);
                    return st ? { ...st, position: i } : null;
                  })
                  .filter(Boolean) as Step[];
                return { ...sc, steps: reordered };
              }),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      // ── Background ────────────────────────────────────────
      setBackground: (featureId, steps) => {
        const bg: Background = {
          id: generateId(),
          featureId,
          steps: steps.map((s, i) => ({
            id: generateId(),
            scenarioId: "",
            keyword: s.keyword,
            text: s.text,
            dataTable: s.dataTable || null,
            docString: s.docString || null,
            position: i,
          })),
        };
        set((s) => ({
          features: s.features.map((f) =>
            f.id === featureId
              ? { ...f, background: bg, updatedAt: new Date().toISOString() }
              : f,
          ),
        }));
      },

      removeBackground: (featureId) => {
        set((s) => ({
          features: s.features.map((f) =>
            f.id === featureId
              ? { ...f, background: null, updatedAt: new Date().toISOString() }
              : f,
          ),
        }));
      },

      // ── Examples ──────────────────────────────────────────
      addExamples: (featureId, scenarioId, examples) => {
        const ex: Examples = {
          ...examples,
          id: generateId(),
          scenarioId,
          position: 0,
        };
        set((s) => ({
          features: s.features.map((f) =>
            f.id === featureId
              ? {
                  ...f,
                  scenarios: f.scenarios.map((sc) =>
                    sc.id === scenarioId
                      ? { ...sc, examples: [...sc.examples, ex] }
                      : sc,
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : f,
          ),
        }));
      },

      updateExamples: (featureId, scenarioId, examplesId, updates) => {
        set((s) => ({
          features: s.features.map((f) =>
            f.id === featureId
              ? {
                  ...f,
                  scenarios: f.scenarios.map((sc) =>
                    sc.id === scenarioId
                      ? {
                          ...sc,
                          examples: sc.examples.map((ex) =>
                            ex.id === examplesId ? { ...ex, ...updates } : ex,
                          ),
                        }
                      : sc,
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : f,
          ),
        }));
      },

      deleteExamples: (featureId, scenarioId, examplesId) => {
        set((s) => ({
          features: s.features.map((f) =>
            f.id === featureId
              ? {
                  ...f,
                  scenarios: f.scenarios.map((sc) =>
                    sc.id === scenarioId
                      ? {
                          ...sc,
                          examples: sc.examples.filter(
                            (ex) => ex.id !== examplesId,
                          ),
                        }
                      : sc,
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : f,
          ),
        }));
      },

      // ── Tags ──────────────────────────────────────────────
      addTag: (projectId, input) => {
        const tag: Tag = {
          id: generateId(),
          projectId,
          name: input.name,
          color: input.color,
        };
        set((s) => ({ tags: [...s.tags, tag] }));
        return tag;
      },

      updateTag: (id, updates) => {
        set((s) => ({
          tags: s.tags.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }));
      },

      deleteTag: (id) => {
        set((s) => ({
          tags: s.tags.filter((t) => t.id !== id),
          features: s.features.map((f) => ({
            ...f,
            tags: f.tags.filter((t) => t.id !== id),
            scenarios: f.scenarios.map((sc) => ({
              ...sc,
              tags: sc.tags.filter((t) => t.id !== id),
            })),
          })),
        }));
      },

      assignTag: (featureId, tagId, targetType, targetId) => {
        const tag = get().tags.find((t) => t.id === tagId);
        if (!tag) return;
        set((s) => ({
          features: s.features.map((f) => {
            if (f.id !== featureId && targetType === "feature") return f;
            if (targetType === "feature" && f.id === targetId) {
              if (f.tags.some((t) => t.id === tagId)) return f;
              return { ...f, tags: [...f.tags, tag] };
            }
            if (f.id === featureId && targetType === "scenario") {
              return {
                ...f,
                scenarios: f.scenarios.map((sc) => {
                  if (sc.id !== targetId) return sc;
                  if (sc.tags.some((t) => t.id === tagId)) return sc;
                  return { ...sc, tags: [...sc.tags, tag] };
                }),
              };
            }
            return f;
          }),
        }));
      },

      unassignTag: (featureId, tagId, targetType, targetId) => {
        set((s) => ({
          features: s.features.map((f) => {
            if (targetType === "feature" && f.id === targetId) {
              return { ...f, tags: f.tags.filter((t) => t.id !== tagId) };
            }
            if (f.id === featureId && targetType === "scenario") {
              return {
                ...f,
                scenarios: f.scenarios.map((sc) =>
                  sc.id === targetId
                    ? { ...sc, tags: sc.tags.filter((t) => t.id !== tagId) }
                    : sc,
                ),
              };
            }
            return f;
          }),
        }));
      },

      // ── GitHub ────────────────────────────────────────────
      githubConnection: null,
      githubFileMappings: [],

      setGitHubConnection: (connection) => {
        set({ githubConnection: connection });
      },

      setGitHubFileMappings: (mappings) => {
        set({ githubFileMappings: mappings });
      },

      addGitHubFileMapping: (mapping) => {
        set((s) => ({
          githubFileMappings: [
            ...s.githubFileMappings.filter(
              (m) => m.featureId !== mapping.featureId,
            ),
            mapping,
          ],
        }));
      },

      updateGitHubFileMapping: (featureId, updates) => {
        set((s) => ({
          githubFileMappings: s.githubFileMappings.map((m) =>
            m.featureId === featureId ? { ...m, ...updates } : m,
          ),
        }));
      },

      removeGitHubFileMapping: (featureId) => {
        set((s) => ({
          githubFileMappings: s.githubFileMappings.filter(
            (m) => m.featureId !== featureId,
          ),
        }));
      },

      // ── Helpers ───────────────────────────────────────────
      getProject: (id) => get().projects.find((p) => p.id === id),
      getFeature: (id) => get().features.find((f) => f.id === id),
      getProjectFeatures: (projectId) =>
        get()
          .features.filter((f) => f.projectId === projectId)
          .sort((a, b) => a.position - b.position),
      getProjectTags: (projectId) =>
        get().tags.filter((t) => t.projectId === projectId),

      // ── System Settings ───────────────────────────────────
      systemSettings: DEFAULT_SYSTEM_SETTINGS,
      updateSystemSettings: (updates) => {
        set((s) => ({
          systemSettings: { ...s.systemSettings, ...updates },
        }));
      },
    }),
    {
      name: "bdd-dashboard-store",
    },
  ),
);
