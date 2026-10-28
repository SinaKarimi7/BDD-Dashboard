import type { GitHubConnection, GitHubFileMapping } from "@/types";

export const STORE_VERSION = 1;

type PersistedState = Record<string, unknown> & {
  projects?: { id: string }[];
  features?: { id: string; projectId: string }[];
};

// v0 kept one GitHub connection and one mapping list for every project.
// Give the connection to the projects its mappings point at (or to every
// project when no mapping says which) and tag each mapping with its project.
function migrateV0(state: PersistedState): PersistedState {
  const { githubConnection, githubFileMappings, ...rest } =
    state as PersistedState & {
      githubConnection?: GitHubConnection | null;
      githubFileMappings?: Omit<GitHubFileMapping, "projectId">[];
    };

  const projectOf = new Map(
    (state.features ?? []).map((f) => [f.id, f.projectId]),
  );
  const mappings: GitHubFileMapping[] = [];
  for (const m of githubFileMappings ?? []) {
    const projectId = projectOf.get(m.featureId);
    if (projectId) mappings.push({ ...m, projectId });
  }

  const githubConnections: Record<string, GitHubConnection> = {};
  if (githubConnection) {
    const owners = new Set(mappings.map((m) => m.projectId));
    const projectIds =
      owners.size > 0 ? [...owners] : (state.projects ?? []).map((p) => p.id);
    for (const id of projectIds) githubConnections[id] = githubConnection;
  }

  return { ...rest, githubConnections, githubFileMappings: mappings };
}

export function migrateStore(persisted: unknown, version: number): unknown {
  let state = (persisted ?? {}) as PersistedState;
  if (version < 1) state = migrateV0(state);
  return state;
}
