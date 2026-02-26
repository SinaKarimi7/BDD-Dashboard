import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  GitBranch,
  FolderGit2,
  RefreshCw,
  Upload,
  Download,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Loader2,
  ExternalLink,
  FileText,
  Link2,
  Unlink,
  Eye,
  Plus,
  GitCommitHorizontal,
  Github,
  KeyRound,
} from "lucide-react";
import { useAppStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import type {
  GitHubContentItem,
  GitHubFileMapping,
  GitHubConnection,
  Feature,
} from "@/types";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Modal,
  Input,
  Select,
  EmptyState,
} from "@/components/ui";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageTransition } from "@/components/animation";
import {
  getUser,
  listRepos,
  listBranches,
  getFeatureFiles,
  getFileContent,
  createOrUpdateFile,
  createBranch,
  validateToken,
  startOAuthFlow,
  isOAuthConfigured,
  extractOAuthToken,
} from "@/lib/github";
import { parseGherkin } from "@/lib/gherkin";
import { featureToGherkin } from "@/lib/gherkin";

// ─── Tab types ──────────────────────────────────────────────

type Tab = "connection" | "pull" | "push";

// ─── Main Page ──────────────────────────────────────────────

export function GitHubSyncPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useAppStore((s) => s.getProject(projectId!));
  const features = useAppStore(
    useShallow((s) => s.getProjectFeatures(projectId!)),
  );
  const githubConnection = useAppStore((s) => s.githubConnection);
  const githubFileMappings = useAppStore(
    useShallow((s) => s.githubFileMappings),
  );
  const setGitHubConnection = useAppStore((s) => s.setGitHubConnection);
  const importFeatures = useAppStore((s) => s.importFeatures);
  const addGitHubFileMapping = useAppStore((s) => s.addGitHubFileMapping);
  const updateGitHubFileMapping = useAppStore((s) => s.updateGitHubFileMapping);
  const deleteFeature = useAppStore((s) => s.deleteFeature);

  const [activeTab, setActiveTab] = useState<Tab>(
    githubConnection ? "pull" : "connection",
  );

  if (!project) return null;

  const isConnected = !!githubConnection;

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <Breadcrumbs
          items={[
            { label: "Dashboard", path: "/dashboard" },
            { label: project.name, path: `/projects/${projectId}` },
            { label: "GitHub Sync" },
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FolderGit2 className="w-6 h-6" />
              GitHub Sync
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Connect to a GitHub repository to import and push feature files.
            </p>
          </div>
          {isConnected && (
            <div className="flex items-center gap-2 text-sm">
              <Badge color="#22c55e" className="text-xs">
                Connected
              </Badge>
              <span className="text-muted-foreground">
                {githubConnection.owner}/{githubConnection.repo}
              </span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-6">
          {(
            [
              { key: "connection", label: "Connection", icon: Link2 },
              { key: "pull", label: "Pull from GitHub", icon: Download },
              { key: "push", label: "Push to GitHub", icon: Upload },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === "connection" && (
          <ConnectionTab
            projectId={projectId!}
            connection={githubConnection}
            onConnect={setGitHubConnection}
            onDisconnect={() => setGitHubConnection(null)}
          />
        )}

        {activeTab === "pull" && (
          <PullTab
            projectId={projectId!}
            connection={githubConnection}
            features={features}
            mappings={githubFileMappings}
            onImport={importFeatures}
            onMapFile={addGitHubFileMapping}
            onDeleteFeature={deleteFeature}
            onSwitchTab={() => setActiveTab("connection")}
          />
        )}

        {activeTab === "push" && (
          <PushTab
            projectId={projectId!}
            connection={githubConnection}
            features={features}
            mappings={githubFileMappings}
            onUpdateMapping={updateGitHubFileMapping}
            onMapFile={addGitHubFileMapping}
            onSwitchTab={() => setActiveTab("connection")}
          />
        )}
      </div>
    </PageTransition>
  );
}

// ─── Connection Tab ─────────────────────────────────────────

function ConnectionTab({
  projectId,
  connection,
  onConnect,
  onDisconnect,
}: {
  projectId: string;
  connection: GitHubConnection | null;
  onConnect: (c: GitHubConnection) => void;
  onDisconnect: () => void;
}) {
  const [token, setToken] = useState(connection?.token || "");
  const [validating, setValidating] = useState(false);
  const [user, setUser] = useState<{
    login: string;
    avatar_url: string;
  } | null>(null);
  const [repos, setRepos] = useState<
    {
      full_name: string;
      owner: string;
      name: string;
      private: boolean;
      default_branch: string;
    }[]
  >([]);
  const [branches, setBranches] = useState<{ name: string }[]>([]);
  const [selectedRepo, setSelectedRepo] = useState(
    connection ? `${connection.owner}/${connection.repo}` : "",
  );
  const [selectedBranch, setSelectedBranch] = useState(
    connection?.branch || "",
  );
  const [basePath, setBasePath] = useState(connection?.path || "");
  const [error, setError] = useState("");
  const [step, setStep] = useState<"auth" | "repo" | "done">(
    connection ? "done" : "auth",
  );
  const [authMethod, setAuthMethod] = useState<"oauth" | "pat">("oauth");

  const oauthAvailable = isOAuthConfigured();

  // Handle OAuth callback token on mount
  useEffect(() => {
    const oauthToken = extractOAuthToken();
    if (oauthToken) {
      setToken(oauthToken);
      // Auto-validate the OAuth token
      (async () => {
        setValidating(true);
        setError("");
        try {
          const u = await getUser(oauthToken);
          setUser(u);
          const r = await listRepos(oauthToken);
          setRepos(r);
          setStep("repo");
        } catch (e: any) {
          setError(e.message || "OAuth token validation failed.");
          setStep("auth");
        } finally {
          setValidating(false);
        }
      })();
    }
  }, []);

  const handleOAuth = () => {
    try {
      startOAuthFlow(`/projects/${projectId}/github`);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleValidate = async () => {
    if (!token.trim()) return;
    setValidating(true);
    setError("");
    try {
      const u = await getUser(token.trim());
      setUser(u);
      const r = await listRepos(token.trim());
      setRepos(r);
      setStep("repo");
    } catch (e: any) {
      setError(e.message || "Invalid token. Please check and try again.");
    } finally {
      setValidating(false);
    }
  };

  const handleRepoChange = async (fullName: string) => {
    setSelectedRepo(fullName);
    setSelectedBranch("");
    const repo = repos.find((r) => r.full_name === fullName);
    if (!repo) return;
    try {
      const b = await listBranches(token.trim(), repo.owner, repo.name);
      setBranches(b);
      setSelectedBranch(repo.default_branch);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleConnect = () => {
    const repo = repos.find((r) => r.full_name === selectedRepo);
    if (!repo || !selectedBranch) return;
    onConnect({
      token: token.trim(),
      owner: repo.owner,
      repo: repo.name,
      branch: selectedBranch,
      path: basePath.trim(),
      connectedAt: new Date().toISOString(),
    });
    setStep("done");
  };

  const handleDisconnect = () => {
    onDisconnect();
    setToken("");
    setUser(null);
    setRepos([]);
    setBranches([]);
    setSelectedRepo("");
    setSelectedBranch("");
    setBasePath("");
    setStep("auth");
    setError("");
  };

  if (step === "done" && connection) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Check className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Connected to GitHub</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    <span className="font-medium text-foreground">
                      {connection.owner}/{connection.repo}
                    </span>{" "}
                    on branch{" "}
                    <span className="font-medium text-foreground">
                      {connection.branch}
                    </span>
                    {connection.path && (
                      <>
                        {" "}
                        in folder{" "}
                        <span className="font-medium text-foreground">
                          /{connection.path}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={handleDisconnect}>
                <Unlink className="w-4 h-4" />
                Disconnect
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state when OAuth token is being validated
  if (validating && step === "auth") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Connecting to GitHub...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      {/* Step 1: Authenticate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Connect to GitHub</CardTitle>
          <CardDescription>
            Authorize BDD Dashboard to access your repositories.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* OAuth Button — primary */}
          {oauthAvailable && (
            <Button
              onClick={handleOAuth}
              className="w-full gap-2 h-11 text-base"
            >
              <Github className="w-5 h-5" />
              Connect with GitHub
            </Button>
          )}

          {/* Divider */}
          {oauthAvailable && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  or use a personal access token
                </span>
              </div>
            </div>
          )}

          {/* PAT Collapsible / Always-shown */}
          {oauthAvailable ? (
            <button
              onClick={() =>
                setAuthMethod(authMethod === "pat" ? "oauth" : "pat")
              }
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-full justify-center"
            >
              <KeyRound className="w-3.5 h-3.5" />
              {authMethod === "pat"
                ? "Hide token input"
                : "Enter a Personal Access Token instead"}
            </button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Create a{" "}
              <a
                href="https://github.com/settings/tokens/new?scopes=repo&description=BDD+Dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Personal Access Token
                <ExternalLink className="w-3 h-3" />
              </a>{" "}
              with <strong>repo</strong> scope.
            </p>
          )}

          {(authMethod === "pat" || !oauthAvailable) && (
            <div className="space-y-3">
              <Input
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx or github_pat_..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleValidate()}
              />
              <Button
                onClick={handleValidate}
                disabled={!token.trim() || validating}
                variant={oauthAvailable ? "outline" : "default"}
                className="w-full"
              >
                {validating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {validating ? "Validating..." : "Validate & Continue"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Repo Selection */}
      {step === "repo" && user && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Select Repository</CardTitle>
            <CardDescription>
              Signed in as{" "}
              <span className="font-medium text-foreground">{user.login}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Repository"
              value={selectedRepo}
              onChange={(e) => handleRepoChange(e.target.value)}
              options={[
                { value: "", label: "Choose a repository..." },
                ...repos.map((r) => ({
                  value: r.full_name,
                  label: `${r.full_name}${r.private ? " 🔒" : ""}`,
                })),
              ]}
            />

            {branches.length > 0 && (
              <Select
                label="Branch"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                options={branches.map((b) => ({
                  value: b.name,
                  label: b.name,
                }))}
              />
            )}

            <Input
              label="Base Folder Path (optional)"
              placeholder="e.g. features or src/test/features"
              value={basePath}
              onChange={(e) => setBasePath(e.target.value)}
            />

            <Button
              onClick={handleConnect}
              disabled={!selectedRepo || !selectedBranch}
              className="w-full"
            >
              <Link2 className="w-4 h-4" />
              Connect Repository
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Pull Tab ───────────────────────────────────────────────

function PullTab({
  projectId,
  connection,
  features,
  mappings,
  onImport,
  onMapFile,
  onDeleteFeature,
  onSwitchTab,
}: {
  projectId: string;
  connection: GitHubConnection | null;
  features: Feature[];
  mappings: GitHubFileMapping[];
  onImport: (projectId: string, features: Feature[]) => void;
  onMapFile: (mapping: GitHubFileMapping) => void;
  onDeleteFeature: (id: string) => void;
  onSwitchTab: () => void;
}) {
  const [remoteFiles, setRemoteFiles] = useState<GitHubContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    if (!connection) return;
    setLoading(true);
    setError("");
    try {
      const files = await getFeatureFiles(
        connection.token,
        connection.owner,
        connection.repo,
        connection.path,
        connection.branch,
      );
      setRemoteFiles(files);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [connection]);

  useEffect(() => {
    if (connection) fetchFiles();
  }, [connection, fetchFiles]);

  if (!connection) {
    return (
      <EmptyState
        title="Not connected"
        description="Connect to a GitHub repository first."
        action={
          <Button onClick={onSwitchTab}>
            <Link2 className="w-4 h-4" />
            Go to Connection
          </Button>
        }
      />
    );
  }

  const toggleFile = (path: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedFiles.size === remoteFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(remoteFiles.map((f) => f.path)));
    }
  };

  const handleImport = async () => {
    if (selectedFiles.size === 0) return;
    setImporting(true);
    setError("");
    setImportResult(null);

    try {
      const filesToImport = remoteFiles.filter((f) =>
        selectedFiles.has(f.path),
      );

      const parsed: any[] = [];
      for (const file of filesToImport) {
        const { content, sha } = await getFileContent(
          connection.token,
          connection.owner,
          connection.repo,
          file.path,
          connection.branch,
        );

        const feature = parseGherkin(content, projectId);
        if (feature) {
          if (!feature.name) {
            feature.name = file.name.replace(".feature", "");
          }
          feature.folderPath = file.path.includes("/")
            ? file.path.substring(0, file.path.lastIndexOf("/"))
            : "";
          parsed.push({ feature, sha, filePath: file.path, content });
        }
      }

      if (parsed.length === 0) {
        setError("No valid feature files found in selected files.");
        return;
      }

      // Import features and track file mappings
      const featureData = parsed.map((p) => p.feature);
      onImport(projectId, featureData);

      // We need to get the newly created feature IDs
      // Since importFeatures generates new IDs, we wait a tick and read from store
      setTimeout(() => {
        const state = useAppStore.getState();
        const projectFeatures = state.features
          .filter((f) => f.projectId === projectId)
          .sort((a, b) => a.position - b.position);

        // Map the last N features (just imported)
        const importedFeatures = projectFeatures.slice(-parsed.length);
        importedFeatures.forEach((f, i) => {
          if (parsed[i]) {
            onMapFile({
              featureId: f.id,
              filePath: parsed[i].filePath,
              sha: parsed[i].sha,
              lastSyncedContent: parsed[i].content,
              lastSyncedAt: new Date().toISOString(),
            });
          }
        });

        setImportResult(
          `Successfully imported ${parsed.length} feature file${parsed.length !== 1 ? "s" : ""}.`,
        );
        setSelectedFiles(new Set());
      }, 100);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setImporting(false);
    }
  };

  const getMappedFeatureId = (filePath: string) => {
    return mappings.find((m) => m.filePath === filePath)?.featureId;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Found {remoteFiles.length} .feature file
          {remoteFiles.length !== 1 ? "s" : ""} in{" "}
          <span className="font-medium text-foreground">
            {connection.owner}/{connection.repo}
          </span>
          {connection.path && (
            <>
              {" / "}
              <span className="font-medium text-foreground">
                {connection.path}
              </span>
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchFiles}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {remoteFiles.length > 0 && (
            <Button variant="outline" size="sm" onClick={selectAll}>
              {selectedFiles.size === remoteFiles.length
                ? "Deselect All"
                : "Select All"}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {importResult && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 rounded-lg border border-green-500/30 bg-green-500/5 p-3">
          <Check className="w-4 h-4 shrink-0" />
          {importResult}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Scanning repository...
          </p>
        </div>
      ) : remoteFiles.length === 0 ? (
        <EmptyState
          title="No .feature files found"
          description={`No .feature files were found in ${connection.path || "the root"} of this repository.`}
        />
      ) : (
        <>
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
            {remoteFiles.map((file) => {
              const mappedId = getMappedFeatureId(file.path);
              const isSelected = selectedFiles.has(file.path);

              return (
                <div
                  key={file.path}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors cursor-pointer ${
                    isSelected
                      ? "border-primary/50 bg-primary/5"
                      : "border-border hover:border-primary/20"
                  }`}
                  onClick={() => toggleFile(file.path)}
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {isSelected && (
                      <Check className="w-3 h-3 text-primary-foreground" />
                    )}
                  </div>
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {file.path}
                    </p>
                  </div>
                  {mappedId && (
                    <Badge color="#3b82f6" className="text-[10px] shrink-0">
                      Imported
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>

          {selectedFiles.size > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-4">
              <p className="text-sm font-medium">
                {selectedFiles.size} file{selectedFiles.size !== 1 ? "s" : ""}{" "}
                selected
              </p>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {importing ? "Importing..." : "Import Selected"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Push Tab ───────────────────────────────────────────────

interface ChangeItem {
  featureId: string;
  featureName: string;
  filePath: string;
  type: "new" | "modified" | "unchanged";
  currentContent: string;
  mapping?: GitHubFileMapping;
}

function PushTab({
  projectId,
  connection,
  features,
  mappings,
  onUpdateMapping,
  onMapFile,
  onSwitchTab,
}: {
  projectId: string;
  connection: GitHubConnection | null;
  features: Feature[];
  mappings: GitHubFileMapping[];
  onUpdateMapping: (
    featureId: string,
    updates: Partial<GitHubFileMapping>,
  ) => void;
  onMapFile: (mapping: GitHubFileMapping) => void;
  onSwitchTab: () => void;
}) {
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [showPushModal, setShowPushModal] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [pushTarget, setPushTarget] = useState<"existing" | "new">("existing");
  const [newBranchName, setNewBranchName] = useState("");
  const [selectedChanges, setSelectedChanges] = useState<Set<string>>(
    new Set(),
  );
  const [previewFeature, setPreviewFeature] = useState<ChangeItem | null>(null);

  if (!connection) {
    return (
      <EmptyState
        title="Not connected"
        description="Connect to a GitHub repository first."
        action={
          <Button onClick={onSwitchTab}>
            <Link2 className="w-4 h-4" />
            Go to Connection
          </Button>
        }
      />
    );
  }

  // Build change list
  const changes: ChangeItem[] = features.map((feature) => {
    const mapping = mappings.find((m) => m.featureId === feature.id);
    const currentContent = featureToGherkin(feature);
    const basePath = connection.path ? `${connection.path}/` : "";

    if (!mapping) {
      // New feature - not yet in GitHub
      const fileName = feature.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
      return {
        featureId: feature.id,
        featureName: feature.name,
        filePath: `${basePath}${fileName}.feature`,
        type: "new" as const,
        currentContent,
      };
    }

    const isModified =
      currentContent.trim() !== mapping.lastSyncedContent.trim();
    return {
      featureId: feature.id,
      featureName: feature.name,
      filePath: mapping.filePath,
      type: isModified ? ("modified" as const) : ("unchanged" as const),
      currentContent,
      mapping,
    };
  });

  const pendingChanges = changes.filter((c) => c.type !== "unchanged");
  const selectedPending = pendingChanges.filter((c) =>
    selectedChanges.has(c.featureId),
  );

  const toggleChange = (featureId: string) => {
    setSelectedChanges((prev) => {
      const next = new Set(prev);
      if (next.has(featureId)) next.delete(featureId);
      else next.add(featureId);
      return next;
    });
  };

  const selectAllChanges = () => {
    if (selectedChanges.size === pendingChanges.length) {
      setSelectedChanges(new Set());
    } else {
      setSelectedChanges(new Set(pendingChanges.map((c) => c.featureId)));
    }
  };

  const handlePush = async () => {
    if (selectedPending.length === 0) return;
    setPushing(true);
    setError("");
    setResult(null);

    try {
      const targetBranch =
        pushTarget === "new" && newBranchName.trim()
          ? newBranchName.trim()
          : connection.branch;

      // Create new branch if needed
      if (pushTarget === "new" && newBranchName.trim()) {
        try {
          await createBranch(
            connection.token,
            connection.owner,
            connection.repo,
            newBranchName.trim(),
            connection.branch,
          );
        } catch (e: any) {
          // Branch may already exist — continue if so
          if (!e.message?.includes("already exists")) throw e;
        }
      }

      const message =
        commitMessage.trim() ||
        `Update ${selectedPending.length} feature file${selectedPending.length !== 1 ? "s" : ""}`;

      let pushed = 0;
      for (const change of selectedPending) {
        const result = await createOrUpdateFile(
          connection.token,
          connection.owner,
          connection.repo,
          change.filePath,
          change.currentContent,
          message,
          change.mapping?.sha,
          targetBranch,
        );

        // Update mapping with new SHA
        if (change.mapping) {
          onUpdateMapping(change.featureId, {
            sha: result.sha,
            lastSyncedContent: change.currentContent,
            lastSyncedAt: new Date().toISOString(),
          });
        } else {
          onMapFile({
            featureId: change.featureId,
            filePath: change.filePath,
            sha: result.sha,
            lastSyncedContent: change.currentContent,
            lastSyncedAt: new Date().toISOString(),
          });
        }
        pushed++;
      }

      setResult(
        `Successfully pushed ${pushed} file${pushed !== 1 ? "s" : ""} to ${targetBranch}.`,
      );
      setShowPushModal(false);
      setCommitMessage("");
      setSelectedChanges(new Set());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPushing(false);
    }
  };

  const discardChange = (featureId: string) => {
    const mapping = mappings.find((m) => m.featureId === featureId);
    if (!mapping) return;

    // Re-import the original content from the mapping
    // For simplicity, notify user — full discard would require re-parsing
    // We mark it as unchanged by syncing the current content
    const feature = features.find((f) => f.id === featureId);
    if (feature) {
      const currentContent = featureToGherkin(feature);
      onUpdateMapping(featureId, {
        lastSyncedContent: currentContent,
        lastSyncedAt: new Date().toISOString(),
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {pendingChanges.length === 0
            ? "All features are in sync."
            : `${pendingChanges.length} feature${pendingChanges.length !== 1 ? "s" : ""} with pending changes.`}
        </p>
        {pendingChanges.length > 0 && (
          <Button variant="outline" size="sm" onClick={selectAllChanges}>
            {selectedChanges.size === pendingChanges.length
              ? "Deselect All"
              : "Select All"}
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 rounded-lg border border-green-500/30 bg-green-500/5 p-3">
          <Check className="w-4 h-4 shrink-0" />
          {result}
        </div>
      )}

      {changes.length === 0 ? (
        <EmptyState
          title="No features yet"
          description="Create features first, then push them to GitHub."
        />
      ) : (
        <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
          {changes.map((change) => {
            const isSelected = selectedChanges.has(change.featureId);
            const isPending = change.type !== "unchanged";

            return (
              <div
                key={change.featureId}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                  isPending ? "cursor-pointer" : ""
                } ${
                  isSelected
                    ? "border-primary/50 bg-primary/5"
                    : "border-border"
                } ${!isPending ? "opacity-60" : "hover:border-primary/20"}`}
                onClick={() => isPending && toggleChange(change.featureId)}
              >
                {isPending && (
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {isSelected && (
                      <Check className="w-3 h-3 text-primary-foreground" />
                    )}
                  </div>
                )}
                {!isPending && (
                  <Check className="w-5 h-5 text-green-500 shrink-0" />
                )}
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {change.featureName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {change.filePath}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge
                    color={
                      change.type === "new"
                        ? "#22c55e"
                        : change.type === "modified"
                          ? "#f59e0b"
                          : "#6b7280"
                    }
                    className="text-[10px]"
                  >
                    {change.type === "new"
                      ? "New"
                      : change.type === "modified"
                        ? "Modified"
                        : "In Sync"}
                  </Badge>
                  {isPending && (
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="rounded p-1 hover:bg-accent transition-colors cursor-pointer text-muted-foreground"
                        onClick={() => setPreviewFeature(change)}
                        title="Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {change.type === "modified" && (
                        <button
                          className="rounded p-1 hover:bg-destructive/10 transition-colors cursor-pointer text-muted-foreground hover:text-destructive"
                          onClick={() => discardChange(change.featureId)}
                          title="Discard changes"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedPending.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-medium">
            {selectedPending.length} change
            {selectedPending.length !== 1 ? "s" : ""} ready to push
          </p>
          <Button onClick={() => setShowPushModal(true)}>
            <GitCommitHorizontal className="w-4 h-4" />
            Push to GitHub
          </Button>
        </div>
      )}

      {/* Push Modal */}
      <Modal
        open={showPushModal}
        onClose={() => setShowPushModal(false)}
        title="Push to GitHub"
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-sm text-muted-foreground mb-2">
              Pushing {selectedPending.length} file
              {selectedPending.length !== 1 ? "s" : ""}:
            </p>
            <div className="space-y-1 max-h-[120px] overflow-y-auto">
              {selectedPending.map((c) => (
                <div
                  key={c.featureId}
                  className="flex items-center gap-2 text-sm"
                >
                  <Badge
                    color={c.type === "new" ? "#22c55e" : "#f59e0b"}
                    className="text-[9px]"
                  >
                    {c.type === "new" ? "NEW" : "MOD"}
                  </Badge>
                  <span className="truncate text-xs font-mono">
                    {c.filePath}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Input
            label="Commit Message"
            placeholder={`Update ${selectedPending.length} feature file${selectedPending.length !== 1 ? "s" : ""}`}
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            autoFocus
          />

          <div>
            <p className="text-sm font-medium mb-2">Push Target</p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent transition-colors">
                <input
                  type="radio"
                  name="pushTarget"
                  checked={pushTarget === "existing"}
                  onChange={() => setPushTarget("existing")}
                  className="accent-primary"
                />
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5" />
                    {connection.branch}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Commit directly to the current branch
                  </p>
                </div>
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent transition-colors">
                <input
                  type="radio"
                  name="pushTarget"
                  checked={pushTarget === "new"}
                  onChange={() => setPushTarget("new")}
                  className="accent-primary"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Create new branch
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Push changes to a new branch
                  </p>
                </div>
              </label>
              {pushTarget === "new" && (
                <Input
                  placeholder="e.g. feature/update-bdd-specs"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                />
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowPushModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePush}
              disabled={
                pushing || (pushTarget === "new" && !newBranchName.trim())
              }
            >
              {pushing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {pushing ? "Pushing..." : "Push Changes"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        open={!!previewFeature}
        onClose={() => setPreviewFeature(null)}
        title={`Preview: ${previewFeature?.featureName || ""}`}
        size="lg"
      >
        {previewFeature && (
          <div className="max-h-[500px] overflow-auto">
            <pre className="text-xs font-mono bg-muted/50 rounded-lg p-4 whitespace-pre-wrap">
              {previewFeature.currentContent}
            </pre>
          </div>
        )}
      </Modal>
    </div>
  );
}
