import { useState, useEffect, useCallback, useRef, useId } from "react";
import { useParams } from "react-router-dom";
import {
  GitBranch,
  FolderGit2,
  Search,
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
  ChevronDown,
  ChevronRight,
  Building2,
  Lock,
  Pencil,
  Info,
  Clock,
  Minus,
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

// ─── Repo Combobox ─────────────────────────────────────────

type RepoOption = {
  full_name: string;
  owner: string;
  name: string;
  private: boolean;
  default_branch: string;
};

function RepoCombobox({
  repos,
  value,
  onChange,
  disabled,
}: {
  repos: RepoOption[];
  value: string;
  onChange: (fullName: string) => void;
  disabled?: boolean;
}) {
  const uid = useId();
  const labelId = `${uid}-label`;
  const inputId = `${uid}-input`;
  const listboxId = `${uid}-listbox`;
  const optionId = (i: number) => `${uid}-option-${i}`;

  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  // Keep the input in sync when value changes externally
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Reset active index when the list changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  // Scroll the active option into view
  useEffect(() => {
    if (activeIndex < 0 || !listboxRef.current) return;
    const el = listboxRef.current.querySelector<HTMLElement>(
      `#${CSS.escape(optionId(activeIndex))}`,
    );
    el?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery(value);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [value]);

  const filtered = query.trim()
    ? repos.filter((r) =>
        r.full_name.toLowerCase().includes(query.toLowerCase()),
      )
    : repos;

  const handleSelect = (fullName: string) => {
    setQuery(fullName);
    setOpen(false);
    setActiveIndex(-1);
    onChange(fullName);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setActiveIndex(0);
        } else {
          setActiveIndex((i) => (i < filtered.length - 1 ? i + 1 : 0));
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setActiveIndex(filtered.length - 1);
        } else {
          setActiveIndex((i) => (i > 0 ? i - 1 : filtered.length - 1));
        }
        break;
      case "Enter":
        e.preventDefault();
        if (open && activeIndex >= 0 && filtered[activeIndex]) {
          handleSelect(filtered[activeIndex].full_name);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setQuery(value);
        setActiveIndex(-1);
        break;
      case "Tab":
        if (open && filtered.length > 0) {
          e.preventDefault();
          if (e.shiftKey) {
            setActiveIndex((i) => (i > 0 ? i - 1 : filtered.length - 1));
          } else {
            setActiveIndex((i) => (i < filtered.length - 1 ? i + 1 : 0));
          }
        }
        // If list is closed, let Tab move focus naturally
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label
        id={labelId}
        htmlFor={inputId}
        className="block text-sm font-medium mb-1.5"
      >
        Repository
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
        />
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-labelledby={labelId}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && activeIndex >= 0 ? optionId(activeIndex) : undefined
          }
          disabled={disabled}
          placeholder="Search repositories..."
          value={query}
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="flex h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Keyboard hint shown when repos have loaded and list is closed */}
      {!open && repos.length > 0 && (
        <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
          <kbd className="inline-flex items-center rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] leading-none">
            ↑↓
          </kbd>
          to open &amp; navigate
          <span className="mx-0.5 text-border">·</span>
          <kbd className="inline-flex items-center rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] leading-none">
            Enter
          </kbd>
          to select
          <span className="mx-0.5 text-border">·</span>
          <kbd className="inline-flex items-center rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] leading-none">
            Esc
          </kbd>
          to close
        </p>
      )}

      {open && (
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-labelledby={labelId}
          aria-label="Repositories"
          className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg overflow-hidden"
        >
          {/* Keyboard shortcut hint bar */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-1.5 text-[11px] text-muted-foreground select-none flex-wrap">
            <span className="flex items-center gap-1">
              <kbd className="inline-flex items-center rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] leading-none">
                ↑↓
              </kbd>
              navigate
            </span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1">
              <kbd className="inline-flex items-center rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] leading-none">
                Tab
              </kbd>
              cycle
            </span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1">
              <kbd className="inline-flex items-center rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] leading-none">
                Enter
              </kbd>
              select
            </span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1">
              <kbd className="inline-flex items-center rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] leading-none">
                Esc
              </kbd>
              close
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li
                role="option"
                aria-selected={false}
                aria-disabled="true"
                className="px-3 py-4 text-center text-sm text-muted-foreground"
              >
                No repositories found.
              </li>
            ) : (
              filtered.map((r, i) => {
                const isKeyboardActive = i === activeIndex;
                const isSelected = r.full_name === value;
                return (
                  <li
                    key={r.full_name}
                    id={optionId(i)}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={() => handleSelect(r.full_name)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={[
                      "relative flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors",
                      isKeyboardActive
                        ? // keyboard-focused: left primary bar + tinted bg — unmistakably different from hover
                          "bg-primary/10 text-foreground before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-primary"
                        : isSelected
                          ? "bg-primary/5 font-medium text-foreground hover:bg-primary/10"
                          : "hover:bg-accent hover:text-accent-foreground",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FolderGit2
                        aria-hidden="true"
                        className="w-4 h-4 shrink-0 text-muted-foreground"
                      />
                      <span className="truncate">{r.full_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {r.private && (
                        <span
                          aria-label="Private repository"
                          className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                        >
                          Private
                        </span>
                      )}
                      {r.full_name === value && (
                        <Check
                          aria-hidden="true"
                          className="w-3.5 h-3.5 text-primary"
                        />
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </div>
        </ul>
      )}
    </div>
  );
}

// ─── PAT Guide ──────────────────────────────────────────────

function PATGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors rounded-lg"
      >
        <span className="flex items-center gap-2">
          <Info className="w-4 h-4 text-muted-foreground" />
          How to create a Personal Access Token
        </span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-5 text-sm border-t border-border pt-4">
          {/* Step 1 */}
          <div className="space-y-1.5">
            <p className="font-semibold flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs shrink-0">
                1
              </span>
              Open GitHub Token Settings
            </p>
            <p className="text-muted-foreground pl-7">
              Go to{" "}
              <a
                href="https://github.com/settings/profile"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-foreground hover:text-primary"
              >
                github.com → Profile picture
              </a>{" "}
              → <strong>Settings</strong> → (scroll down) →{" "}
              <strong>Developer settings</strong> →{" "}
              <strong>Personal access tokens</strong>.
            </p>
          </div>

          {/* Step 2 */}
          <div className="space-y-2">
            <p className="font-semibold flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs shrink-0">
                2
              </span>
              Choose a token type
            </p>
            <div className="pl-7 space-y-2">
              <div className="rounded-md border border-border p-3 space-y-1 bg-background">
                <p className="font-medium flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Classic token{" "}
                  <span className="text-xs font-normal text-green-600 dark:text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">
                    Recommended for org repos
                  </span>
                </p>
                <p className="text-muted-foreground text-xs">
                  Simpler setup, works with all organizations immediately.
                  Generate at{" "}
                  <a
                    href="https://github.com/settings/tokens/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-foreground hover:text-primary"
                  >
                    Settings → Tokens (classic) → Generate new token (classic)
                  </a>
                  .
                </p>
              </div>
              <div className="rounded-md border border-border p-3 space-y-1 bg-background">
                <p className="font-medium flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Fine-grained token
                </p>
                <p className="text-muted-foreground text-xs">
                  More secure but requires your org admin to enable fine-grained
                  tokens. Generate at{" "}
                  <a
                    href="https://github.com/settings/personal-access-tokens/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-foreground hover:text-primary"
                  >
                    Settings → Fine-grained tokens → Generate new token
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>

          {/* Step 3 — Classic permissions */}
          <div className="space-y-2">
            <p className="font-semibold flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs shrink-0">
                3
              </span>
              Classic token — required permission
            </p>
            <div className="pl-7">
              <div className="rounded-md border border-border p-3 bg-background space-y-1">
                <p className="text-muted-foreground text-xs mb-2">
                  Under <strong>Select scopes</strong>, check:
                </p>
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded border-2 border-primary bg-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-mono font-medium text-xs">repo</p>
                    <p className="text-muted-foreground text-xs">
                      Full control of private repositories — this single scope
                      is all you need.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 — Fine-grained permissions */}
          <div className="space-y-2">
            <p className="font-semibold flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs shrink-0">
                4
              </span>
              Fine-grained token — required settings
            </p>
            <div className="pl-7 space-y-2 text-xs text-muted-foreground">
              <div className="rounded-md border border-border p-3 bg-background space-y-2">
                <div className="flex gap-2">
                  <Building2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-foreground" />
                  <p>
                    <strong className="text-foreground">Resource owner</strong>{" "}
                    — select your <strong>organization</strong> (not your
                    personal account).
                  </p>
                </div>
                <div className="flex gap-2">
                  <Pencil className="w-3.5 h-3.5 shrink-0 mt-0.5 text-foreground" />
                  <p>
                    <strong className="text-foreground">
                      Repository access
                    </strong>{" "}
                    — choose <em>"Only select repositories"</em> and pick your
                    repo.
                  </p>
                </div>
                <p className="font-medium text-foreground">
                  Permissions → Repository permissions:
                </p>
                <ul className="space-y-1 ml-2">
                  <li className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded border-2 border-primary bg-primary flex items-center justify-center shrink-0">
                      <Check className="w-2 h-2 text-primary-foreground" />
                    </div>
                    <span>
                      <strong className="text-foreground">Contents</strong>:
                      Read and write
                    </span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded border-2 border-primary bg-primary flex items-center justify-center shrink-0">
                      <Check className="w-2 h-2 text-primary-foreground" />
                    </div>
                    <span>
                      <strong className="text-foreground">Metadata</strong>:
                      Read-only (auto-selected)
                    </span>
                  </li>
                </ul>
                <p className="italic">
                  Note: If your org restricts fine-grained tokens, an org admin
                  must approve it before it works.
                </p>
              </div>
            </div>
          </div>

          {/* Step 5 — Generate & copy */}
          <div className="space-y-1.5">
            <p className="font-semibold flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs shrink-0">
                5
              </span>
              Set expiration, generate & copy
            </p>
            <p className="text-muted-foreground pl-7">
              Set an expiration (90 days recommended), click{" "}
              <strong>Generate token</strong>, and copy the token immediately —
              GitHub only shows it once. Paste it in the field below.
            </p>
          </div>
        </div>
      )}
    </div>
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
    <div className="space-y-5 max-w-xl">
      {step === "auth" && (
        <>
          {/* Org repo notice */}
          <div className="flex gap-3 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
            <Building2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-600 dark:text-blue-400">
                Connecting to an organization repository?
              </p>
              <p className="text-muted-foreground mt-0.5">
                GitHub OAuth only lists <em>personal</em> repos by default. For
                organization repos, use a{" "}
                <strong>Personal Access Token (PAT)</strong> — it works for both
                personal and org repos with no extra setup.
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* PAT — primary method */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                Personal Access Token
              </CardTitle>
              <CardDescription>
                Recommended for organization repos. Works for all GitHub repo
                types.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Step-by-step guide */}
              <PATGuide />

              <div className="space-y-3 pt-1">
                <Input
                  label="Paste your token here"
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx  or  github_pat_..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleValidate()}
                />
                <Button
                  onClick={handleValidate}
                  disabled={!token.trim() || validating}
                  className="w-full"
                >
                  {validating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {validating ? "Validating token..." : "Validate & Continue"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* OAuth — secondary */}
          {oauthAvailable && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    or
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleOAuth}
                className="w-full gap-2"
              >
                <Github className="w-4 h-4" />
                Connect with GitHub OAuth
                <span className="ml-auto text-xs text-muted-foreground font-normal">
                  personal repos only
                </span>
              </Button>
            </>
          )}
        </>
      )}

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
            <RepoCombobox
              repos={repos}
              value={selectedRepo}
              onChange={handleRepoChange}
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
            // Store the round-tripped Gherkin so the Push tab comparison
            // matches — raw file content may differ from our generator output
            const roundTripped = featureToGherkin(f);
            onMapFile({
              featureId: f.id,
              filePath: parsed[i].filePath,
              sha: parsed[i].sha,
              lastSyncedContent: roundTripped,
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

// ─── Diff Utilities ─────────────────────────────────────────

type DiffLine = {
  type: "added" | "removed" | "context";
  text: string;
  oldLineNo?: number;
  newLineNo?: number;
};

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  // Simple LCS-based diff
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: DiffLine[] = [];
  let i = m;
  let j = n;
  const stack: DiffLine[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      stack.push({
        type: "context",
        text: oldLines[i - 1],
        oldLineNo: i,
        newLineNo: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: "added", text: newLines[j - 1], newLineNo: j });
      j--;
    } else {
      stack.push({ type: "removed", text: oldLines[i - 1], oldLineNo: i });
      i--;
    }
  }
  stack.reverse();
  result.push(...stack);
  return result;
}

function countDiffStats(diff: DiffLine[]): {
  additions: number;
  deletions: number;
} {
  let additions = 0;
  let deletions = 0;
  for (const line of diff) {
    if (line.type === "added") additions++;
    if (line.type === "removed") deletions++;
  }
  return { additions, deletions };
}

// ─── Push Tab ───────────────────────────────────────────────

interface ChangeItem {
  featureId: string;
  featureName: string;
  filePath: string;
  type: "new" | "modified" | "unchanged";
  currentContent: string;
  oldContent: string;
  updatedAt: string;
  lastSyncedAt?: string;
  additions: number;
  deletions: number;
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
      const newLines = currentContent.split("\n").length;
      return {
        featureId: feature.id,
        featureName: feature.name,
        filePath: `${basePath}${fileName}.feature`,
        type: "new" as const,
        currentContent,
        oldContent: "",
        updatedAt: feature.updatedAt,
        additions: newLines,
        deletions: 0,
      };
    }

    const oldContent = mapping.lastSyncedContent;
    const isModified = currentContent.trim() !== oldContent.trim();
    const diff = isModified ? computeDiff(oldContent, currentContent) : null;
    const stats = diff ? countDiffStats(diff) : { additions: 0, deletions: 0 };
    return {
      featureId: feature.id,
      featureName: feature.name,
      filePath: mapping.filePath,
      type: isModified ? ("modified" as const) : ("unchanged" as const),
      currentContent,
      oldContent,
      updatedAt: feature.updatedAt,
      lastSyncedAt: mapping.lastSyncedAt,
      additions: stats.additions,
      deletions: stats.deletions,
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
            const relDate = formatRelativeDate(change.updatedAt);

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
                  {/* Date + diff stats row */}
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {relDate}
                    </span>
                    {isPending && (
                      <span className="flex items-center gap-2">
                        {change.additions > 0 && (
                          <span className="text-green-500 font-medium flex items-center gap-0.5">
                            <Plus className="w-3 h-3" />
                            {change.additions}
                          </span>
                        )}
                        {change.deletions > 0 && (
                          <span className="text-red-500 font-medium flex items-center gap-0.5">
                            <Minus className="w-3 h-3" />
                            {change.deletions}
                          </span>
                        )}
                      </span>
                    )}
                    {change.lastSyncedAt && (
                      <span className="text-muted-foreground/70">
                        synced {formatRelativeDate(change.lastSyncedAt)}
                      </span>
                    )}
                  </div>
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

      {/* Diff / Preview Modal */}
      <Modal
        open={!!previewFeature}
        onClose={() => setPreviewFeature(null)}
        title={`${previewFeature?.type === "modified" ? "Changes" : "Preview"}: ${previewFeature?.featureName || ""}`}
        size="xl"
      >
        {previewFeature && <DiffViewer change={previewFeature} />}
      </Modal>
    </div>
  );
}

// ─── Diff Viewer ────────────────────────────────────────────

function DiffViewer({ change }: { change: ChangeItem }) {
  const [viewMode, setViewMode] = useState<"inline" | "side">(
    change.type === "new" ? "inline" : "inline",
  );

  if (change.type === "new") {
    return (
      <div>
        <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
          <span className="text-green-500 font-medium">
            +{change.additions} lines
          </span>
          <span>New file</span>
        </div>
        <div className="max-h-[500px] overflow-auto rounded-lg border border-border">
          <table className="w-full text-xs font-mono border-collapse">
            <tbody>
              {change.currentContent.split("\n").map((line, i) => (
                <tr
                  key={i}
                  className="bg-green-500/5 border-b border-border/30 last:border-b-0"
                >
                  <td className="w-12 text-right pr-3 pl-2 py-0.5 text-muted-foreground/50 select-none border-r border-border/30">
                    {i + 1}
                  </td>
                  <td className="w-6 text-center text-green-500 select-none py-0.5">
                    +
                  </td>
                  <td className="px-3 py-0.5 whitespace-pre-wrap break-all">
                    {line || " "}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const diff = computeDiff(change.oldContent, change.currentContent);
  const stats = countDiffStats(diff);

  return (
    <div>
      {/* Diff header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="text-green-500 font-medium">+{stats.additions}</span>
          <span className="text-red-500 font-medium">-{stats.deletions}</span>
          <span>
            {stats.additions + stats.deletions} change
            {stats.additions + stats.deletions !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          <button
            onClick={() => setViewMode("inline")}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
              viewMode === "inline"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Inline
          </button>
          <button
            onClick={() => setViewMode("side")}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
              viewMode === "side"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Side by Side
          </button>
        </div>
      </div>

      <div className="max-h-[500px] overflow-auto rounded-lg border border-border">
        {viewMode === "inline" ? (
          <InlineDiff diff={diff} />
        ) : (
          <SideBySideDiff diff={diff} />
        )}
      </div>
    </div>
  );
}

function InlineDiff({ diff }: { diff: DiffLine[] }) {
  return (
    <table className="w-full text-xs font-mono border-collapse">
      <tbody>
        {diff.map((line, i) => (
          <tr
            key={i}
            className={`border-b border-border/30 last:border-b-0 ${
              line.type === "added"
                ? "bg-green-500/10"
                : line.type === "removed"
                  ? "bg-red-500/10"
                  : ""
            }`}
          >
            <td className="w-10 text-right pr-1 pl-2 py-0.5 text-muted-foreground/40 select-none border-r border-border/30 tabular-nums">
              {line.oldLineNo ?? ""}
            </td>
            <td className="w-10 text-right pr-1 pl-1 py-0.5 text-muted-foreground/40 select-none border-r border-border/30 tabular-nums">
              {line.newLineNo ?? ""}
            </td>
            <td
              className={`w-5 text-center select-none py-0.5 ${
                line.type === "added"
                  ? "text-green-500"
                  : line.type === "removed"
                    ? "text-red-500"
                    : "text-muted-foreground/20"
              }`}
            >
              {line.type === "added"
                ? "+"
                : line.type === "removed"
                  ? "−"
                  : " "}
            </td>
            <td
              className={`px-3 py-0.5 whitespace-pre-wrap break-all ${
                line.type === "added"
                  ? "text-green-300"
                  : line.type === "removed"
                    ? "text-red-300"
                    : ""
              }`}
            >
              {line.text || " "}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SideBySideDiff({ diff }: { diff: DiffLine[] }) {
  // Build left (old) and right (new) columns, aligned row-by-row
  type SideRow = {
    lineNo?: number;
    text: string;
    type: "context" | "removed" | "added" | "empty";
  };
  const left: SideRow[] = [];
  const right: SideRow[] = [];

  let i = 0;
  while (i < diff.length) {
    const line = diff[i];
    if (line.type === "context") {
      left.push({ lineNo: line.oldLineNo, text: line.text, type: "context" });
      right.push({ lineNo: line.newLineNo, text: line.text, type: "context" });
      i++;
    } else if (line.type === "removed") {
      // Collect consecutive removed lines, then pair with consecutive added lines
      const removedBlock: DiffLine[] = [];
      while (i < diff.length && diff[i].type === "removed") {
        removedBlock.push(diff[i]);
        i++;
      }
      const addedBlock: DiffLine[] = [];
      while (i < diff.length && diff[i].type === "added") {
        addedBlock.push(diff[i]);
        i++;
      }
      const maxLen = Math.max(removedBlock.length, addedBlock.length);
      for (let j = 0; j < maxLen; j++) {
        left.push(
          j < removedBlock.length
            ? {
                lineNo: removedBlock[j].oldLineNo,
                text: removedBlock[j].text,
                type: "removed",
              }
            : { text: "", type: "empty" },
        );
        right.push(
          j < addedBlock.length
            ? {
                lineNo: addedBlock[j].newLineNo,
                text: addedBlock[j].text,
                type: "added",
              }
            : { text: "", type: "empty" },
        );
      }
    } else {
      // Added without a preceding removed
      left.push({ text: "", type: "empty" });
      right.push({ lineNo: line.newLineNo, text: line.text, type: "added" });
      i++;
    }
  }

  const cellBg = (type: SideRow["type"]) =>
    type === "removed"
      ? "bg-red-500/10"
      : type === "added"
        ? "bg-green-500/10"
        : type === "empty"
          ? "bg-muted/30"
          : "";

  return (
    <div className="grid grid-cols-2">
      {/* Left = old */}
      <div className="border-r border-border overflow-x-auto">
        <table className="w-full text-xs font-mono border-collapse">
          <tbody>
            {left.map((row, idx) => (
              <tr
                key={idx}
                className={`border-b border-border/30 last:border-b-0 ${cellBg(row.type)}`}
              >
                <td className="w-10 text-right pr-1.5 pl-2 py-0.5 text-muted-foreground/40 select-none border-r border-border/30 tabular-nums">
                  {row.lineNo ?? ""}
                </td>
                <td className="w-5 text-center select-none py-0.5 text-red-500/60">
                  {row.type === "removed" ? "−" : ""}
                </td>
                <td
                  className={`px-2 py-0.5 whitespace-pre-wrap break-all ${
                    row.type === "removed" ? "text-red-300" : ""
                  }`}
                >
                  {row.text || " "}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Right = new */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono border-collapse">
          <tbody>
            {right.map((row, idx) => (
              <tr
                key={idx}
                className={`border-b border-border/30 last:border-b-0 ${cellBg(row.type)}`}
              >
                <td className="w-10 text-right pr-1.5 pl-2 py-0.5 text-muted-foreground/40 select-none border-r border-border/30 tabular-nums">
                  {row.lineNo ?? ""}
                </td>
                <td className="w-5 text-center select-none py-0.5 text-green-500/60">
                  {row.type === "added" ? "+" : ""}
                </td>
                <td
                  className={`px-2 py-0.5 whitespace-pre-wrap break-all ${
                    row.type === "added" ? "text-green-300" : ""
                  }`}
                >
                  {row.text || " "}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Date Helpers ───────────────────────────────────────────

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
