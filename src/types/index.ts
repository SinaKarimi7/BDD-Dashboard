// ─── Core Domain Types ─────────────────────────────────────────

export type StepKeyword = "Given" | "When" | "Then" | "And" | "But";
export type ScenarioType = "scenario" | "scenario_outline";
export type TagTargetType = "feature" | "scenario";
export type TriageStatus = "backlog" | "todo" | "wip" | "done";

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Feature {
  id: string;
  projectId: string;
  name: string;
  description: string;
  folderPath: string;
  position: number;
  tags: Tag[];
  scenarios: Scenario[];
  background: Background | null;
  createdAt: string;
  updatedAt: string;
}

export interface Scenario {
  id: string;
  featureId: string;
  name: string;
  type: ScenarioType;
  status: TriageStatus;
  position: number;
  tags: Tag[];
  steps: Step[];
  examples: Examples[];
  createdAt: string;
  updatedAt: string;
}

export interface Step {
  id: string;
  scenarioId: string;
  keyword: StepKeyword;
  text: string;
  dataTable: string[][] | null;
  docString: string | null;
  position: number;
}

export interface Tag {
  id: string;
  projectId: string;
  name: string;
  color: string;
}

export interface TagAssignment {
  id: string;
  tagId: string;
  targetType: TagTargetType;
  targetId: string;
}

export interface Examples {
  id: string;
  scenarioId: string;
  name: string;
  headers: string[];
  rows: string[][];
  position: number;
}

export interface Background {
  id: string;
  featureId: string;
  steps: Step[];
}

// ─── Form Types ────────────────────────────────────────────────

export interface CreateProjectInput {
  name: string;
  description: string;
}

export interface CreateFeatureInput {
  name: string;
  description: string;
  folderPath: string;
}

export interface CreateScenarioInput {
  name: string;
  type: ScenarioType;
}

export interface CreateStepInput {
  keyword: StepKeyword;
  text: string;
  dataTable?: string[][] | null;
  docString?: string | null;
}

export interface CreateTagInput {
  name: string;
  color: string;
}

// ─── GitHub Integration Types ──────────────────────────────────

export interface GitHubConnection {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  path: string; // base folder path in repo, e.g. "features" or ""
  connectedAt: string;
}

export interface GitHubFileMapping {
  featureId: string;
  filePath: string;
  sha: string;
  lastSyncedContent: string;
  lastSyncedAt: string;
}

export interface GitHubRepo {
  full_name: string;
  owner: string;
  name: string;
  private: boolean;
  default_branch: string;
}

export interface GitHubBranch {
  name: string;
  sha: string;
}

export interface GitHubContentItem {
  name: string;
  path: string;
  sha: string;
  type: "file" | "dir";
  size?: number;
}
