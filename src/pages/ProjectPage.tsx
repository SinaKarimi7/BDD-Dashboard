import { useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Plus,
  Upload,
  FileText,
  MoreHorizontal,
  Trash2,
  Edit3,
  Download,
  AlertTriangle,
  CheckSquare,
  Square,
  MinusSquare,
  Circle,
  CircleDot,
  Loader2,
  CheckCircle2,
  Tags,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import type { TriageStatus } from "@/types";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  EmptyState,
  Modal,
  Input,
  Textarea,
  SearchInput,
  Badge,
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { FileDropZone } from "@/components/features/FileDropZone";
import { exportSingleFeature, exportAllFeatures } from "@/lib/export";
import { PageTransition } from "@/components/animation";
import { staggerContainer, staggerItem, easing, duration } from "@/lib/motion";

const STATUS_CONFIG = [
  {
    status: "backlog" as TriageStatus,
    label: "Backlog",
    icon: Circle,
    color: "text-muted-foreground",
  },
  {
    status: "todo" as TriageStatus,
    label: "To Do",
    icon: CircleDot,
    color: "text-blue-500",
  },
  {
    status: "wip" as TriageStatus,
    label: "In Progress",
    icon: Loader2,
    color: "text-amber-500",
  },
  {
    status: "done" as TriageStatus,
    label: "Done",
    icon: CheckCircle2,
    color: "text-green-500",
  },
] as const;

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const project = useAppStore((s) => s.getProject(projectId!));
  const features = useAppStore(
    useShallow((s) => s.getProjectFeatures(projectId!)),
  );
  const addFeature = useAppStore((s) => s.addFeature);
  const deleteFeature = useAppStore((s) => s.deleteFeature);
  const updateFeature = useAppStore((s) => s.updateFeature);
  const importFeatures = useAppStore((s) => s.importFeatures);

  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingFeature, setEditingFeature] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [folderPath, setFolderPath] = useState("");
  const [search, setSearch] = useState("");
  const [pendingImport, setPendingImport] = useState<typeof features | null>(
    null,
  );
  const [duplicateNames, setDuplicateNames] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(
    new Set(),
  );
  const [filterTags, setFilterTags] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<TriageStatus | null>(null);
  const lastClickedRef = useRef<string | null>(null);

  if (!project) {
    return (
      <div className="p-6 lg:p-8">
        <EmptyState
          title="Project not found"
          description="This project doesn't exist."
        />
      </div>
    );
  }

  const filteredFeatures = features.filter((f) => {
    if (
      search &&
      !f.name.toLowerCase().includes(search.toLowerCase()) &&
      !f.description.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (
      filterTags.size > 0 &&
      !f.tags.some((t) => filterTags.has(t.name)) &&
      !f.scenarios.some((s) => s.tags.some((t) => filterTags.has(t.name)))
    )
      return false;
    if (
      filterStatus &&
      !f.scenarios.some((s) => (s.status || "backlog") === filterStatus)
    )
      return false;
    return true;
  });

  const handleFeatureClick = (featureId: string, event: React.MouseEvent) => {
    if (
      selectedFeatures.size > 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      event.preventDefault();
      event.stopPropagation();

      if (event.shiftKey && lastClickedRef.current) {
        // Shift-click: select range
        const ids = filteredFeatures.map((f) => f.id);
        const startIdx = ids.indexOf(lastClickedRef.current);
        const endIdx = ids.indexOf(featureId);
        if (startIdx !== -1 && endIdx !== -1) {
          const [lo, hi] =
            startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
          setSelectedFeatures((prev) => {
            const next = new Set(prev);
            for (let i = lo; i <= hi; i++) next.add(ids[i]);
            return next;
          });
        }
      } else {
        // Toggle single selection
        setSelectedFeatures((prev) => {
          const next = new Set(prev);
          if (next.has(featureId)) next.delete(featureId);
          else next.add(featureId);
          return next;
        });
      }
      lastClickedRef.current = featureId;
    } else {
      navigate(`/projects/${projectId}/features/${featureId}`);
    }
  };

  const toggleSelectAll = () => {
    const ids = filteredFeatures.map((f) => f.id);
    if (
      selectedFeatures.size === ids.length &&
      ids.every((id) => selectedFeatures.has(id))
    ) {
      setSelectedFeatures(new Set());
    } else {
      setSelectedFeatures(new Set(ids));
    }
  };

  const handleBulkDelete = () => {
    selectedFeatures.forEach((id) => deleteFeature(id));
    setSelectedFeatures(new Set());
  };

  const handleBulkExport = () => {
    const selected = features.filter((f) => selectedFeatures.has(f.id));
    if (selected.length > 0) exportAllFeatures(selected, project.name);
  };

  // Gather all tags in project for filter
  const allProjectTags = Array.from(
    new Map(
      features
        .flatMap((f) => [...f.tags, ...f.scenarios.flatMap((s) => s.tags)])
        .map((t) => [t.name, t]),
    ).values(),
  );

  const handleCreate = () => {
    if (!name.trim()) return;
    const feature = addFeature(projectId!, {
      name: name.trim(),
      description: description.trim(),
      folderPath: folderPath.trim() || "features",
    });
    resetForm();
    setShowCreate(false);
    navigate(`/projects/${projectId}/features/${feature.id}`);
  };

  const handleUpdate = () => {
    if (!editingFeature || !name.trim()) return;
    updateFeature(editingFeature, {
      name: name.trim(),
      description: description.trim(),
      folderPath: folderPath.trim() || "features",
    });
    resetForm();
    setEditingFeature(null);
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setFolderPath("");
  };

  const startEdit = (feature: (typeof features)[0]) => {
    setName(feature.name);
    setDescription(feature.description);
    setFolderPath(feature.folderPath);
    setEditingFeature(feature.id);
  };

  const handleImport = useCallback(
    (imported: typeof features) => {
      const existingNames = new Set(features.map((f) => f.name.toLowerCase()));
      const dupes = imported.filter((f) =>
        existingNames.has(f.name.toLowerCase()),
      );

      if (dupes.length > 0) {
        setPendingImport(imported);
        setDuplicateNames(dupes.map((f) => f.name));
        setShowImport(false);
      } else {
        importFeatures(projectId!, imported);
        setShowImport(false);
      }
    },
    [projectId, importFeatures, features],
  );

  const handleImportSkipDuplicates = () => {
    if (!pendingImport) return;
    const existingNames = new Set(features.map((f) => f.name.toLowerCase()));
    const nonDupes = pendingImport.filter(
      (f) => !existingNames.has(f.name.toLowerCase()),
    );
    if (nonDupes.length > 0) {
      importFeatures(projectId!, nonDupes);
    }
    setPendingImport(null);
    setDuplicateNames([]);
  };

  const handleImportOverwrite = () => {
    if (!pendingImport) return;
    const dupeNameSet = new Set(duplicateNames.map((n) => n.toLowerCase()));
    features.forEach((f) => {
      if (dupeNameSet.has(f.name.toLowerCase())) {
        deleteFeature(f.id);
      }
    });
    importFeatures(projectId!, pendingImport);
    setPendingImport(null);
    setDuplicateNames([]);
  };

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <Breadcrumbs
          items={[
            { label: "Dashboard", path: "/dashboard" },
            { label: project.name },
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {project.name}
            </h1>
            {project.description && (
              <p className="text-muted-foreground mt-1">
                {project.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowImport(true)}>
              <Upload className="w-4 h-4" />
              Import
            </Button>
            {features.length > 0 && (
              <Button
                variant="outline"
                onClick={() => exportAllFeatures(features, project.name)}
              >
                <Download className="w-4 h-4" />
                Export All
              </Button>
            )}
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" />
              New Feature
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Features", value: features.length },
            {
              label: "Scenarios",
              value: features.reduce((acc, f) => acc + f.scenarios.length, 0),
            },
            {
              label: "Steps",
              value: features.reduce(
                (acc, f) =>
                  acc + f.scenarios.reduce((a, s) => a + s.steps.length, 0),
                0,
              ),
            },
            {
              label: "Tags Used",
              value: new Set(
                features.flatMap((f) => [
                  ...f.tags.map((t) => t.id),
                  ...f.scenarios.flatMap((s) => s.tags.map((t) => t.id)),
                ]),
              ).size,
            },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {features.length > 0 && (
          <div className="mb-6 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search features..."
                className="max-w-sm"
              />
              {/* Status filter */}
              <div className="flex items-center gap-1">
                {STATUS_CONFIG.map((sc) => {
                  const Icon = sc.icon;
                  const active = filterStatus === sc.status;
                  return (
                    <button
                      key={sc.status}
                      onClick={() => setFilterStatus(active ? null : sc.status)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer border ${
                        active
                          ? `${sc.color} border-current bg-accent`
                          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent"
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span className="hidden sm:inline">{sc.label}</span>
                    </button>
                  );
                })}
                {filterStatus && (
                  <button
                    onClick={() => setFilterStatus(null)}
                    className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            {/* Tag filter chips */}
            {allProjectTags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Tags className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                {allProjectTags.map((tag) => {
                  const active = filterTags.has(tag.name);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => {
                        setFilterTags((prev) => {
                          const next = new Set(prev);
                          if (next.has(tag.name)) next.delete(tag.name);
                          else next.add(tag.name);
                          return next;
                        });
                      }}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer border ${
                        active
                          ? "ring-1 ring-offset-1"
                          : "opacity-70 hover:opacity-100"
                      }`}
                      style={{
                        backgroundColor: active
                          ? `${tag.color}25`
                          : `${tag.color}15`,
                        color: tag.color,
                        borderColor: active ? tag.color : "transparent",
                      }}
                    >
                      @{tag.name}
                      {active && <X className="w-2.5 h-2.5" />}
                    </button>
                  );
                })}
                {filterTags.size > 0 && (
                  <button
                    onClick={() => setFilterTags(new Set())}
                    className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer ml-1"
                  >
                    Clear all
                  </button>
                )}
              </div>
            )}
            {/* Selection controls */}
            {filteredFeatures.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border border-input bg-background hover:bg-accent transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  {selectedFeatures.size === 0 ? (
                    <Square className="w-3.5 h-3.5" />
                  ) : selectedFeatures.size === filteredFeatures.length ? (
                    <CheckSquare className="w-3.5 h-3.5" />
                  ) : (
                    <MinusSquare className="w-3.5 h-3.5" />
                  )}
                  {selectedFeatures.size === 0
                    ? "Select All"
                    : selectedFeatures.size === filteredFeatures.length
                      ? "Deselect All"
                      : `${selectedFeatures.size} selected`}
                </button>
                {selectedFeatures.size > 0 && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkExport}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export ({selectedFeatures.size})
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleBulkDelete}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete ({selectedFeatures.size})
                    </Button>
                    <span className="text-[10px] text-muted-foreground ml-2">
                      Hold Shift to select a range, Ctrl/Cmd to toggle
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {filteredFeatures.length === 0 && features.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-12 h-12" />}
            title="No features yet"
            description="Create a new feature file or import existing .feature files to get started."
            action={
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowImport(true)}>
                  <Upload className="w-4 h-4" />
                  Import Files
                </Button>
                <Button onClick={() => setShowCreate(true)}>
                  <Plus className="w-4 h-4" />
                  New Feature
                </Button>
              </div>
            }
          />
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={staggerContainer(50, 50)}
            initial="initial"
            animate="animate"
          >
            <AnimatePresence mode="popLayout">
              {filteredFeatures.map((feature) => (
                <motion.div
                  key={feature.id}
                  variants={staggerItem}
                  exit={{
                    opacity: 0,
                    scale: 0.95,
                    transition: {
                      duration: duration.normal,
                      ease: easing.apple,
                    },
                  }}
                  layout
                >
                  <Card
                    hover
                    onClick={(e: React.MouseEvent) =>
                      handleFeatureClick(feature.id, e)
                    }
                    className={
                      selectedFeatures.has(feature.id)
                        ? "ring-2 ring-primary ring-offset-1"
                        : ""
                    }
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Selection checkbox */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFeatures((prev) => {
                                const next = new Set(prev);
                                if (next.has(feature.id))
                                  next.delete(feature.id);
                                else next.add(feature.id);
                                return next;
                              });
                              lastClickedRef.current = feature.id;
                            }}
                            className="shrink-0 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {selectedFeatures.has(feature.id) ? (
                              <CheckSquare className="w-4 h-4 text-primary" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                          <CardTitle className="truncate text-base">
                            {feature.name}
                          </CardTitle>
                        </div>
                        <DropdownMenu
                          trigger={
                            <button
                              className="rounded-lg p-1.5 hover:bg-accent transition-colors cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          }
                        >
                          <DropdownItem onClick={() => startEdit(feature)}>
                            <Edit3 className="w-4 h-4" /> Edit
                          </DropdownItem>
                          <DropdownItem
                            onClick={() => exportSingleFeature(feature)}
                          >
                            <Download className="w-4 h-4" /> Export
                          </DropdownItem>
                          <DropdownSeparator />
                          <DropdownItem
                            destructive
                            onClick={() => deleteFeature(feature.id)}
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </DropdownItem>
                        </DropdownMenu>
                      </div>
                      {feature.description && (
                        <CardDescription className="line-clamp-2">
                          {feature.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      {feature.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {feature.tags.map((tag) => (
                            <Badge key={tag.id} color={tag.color}>
                              @{tag.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{feature.scenarios.length} scenarios</span>
                        <span className="text-xs">{feature.folderPath}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Create Feature Modal */}
        <Modal
          open={showCreate}
          onClose={() => {
            setShowCreate(false);
            resetForm();
          }}
          title="Create Feature"
        >
          <div className="space-y-4">
            <Input
              label="Feature Name"
              placeholder="e.g. User Authentication"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Textarea
              label="Description"
              placeholder="As a [role], I want [feature] so that [benefit]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <Input
              label="Folder Path"
              placeholder="e.g. features/auth"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreate(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!name.trim()}>
                Create Feature
              </Button>
            </div>
          </div>
        </Modal>

        {/* Edit Feature Modal */}
        <Modal
          open={!!editingFeature}
          onClose={() => {
            setEditingFeature(null);
            resetForm();
          }}
          title="Edit Feature"
        >
          <div className="space-y-4">
            <Input
              label="Feature Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <Textarea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <Input
              label="Folder Path"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingFeature(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={!name.trim()}>
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>

        {/* Import Modal */}
        <Modal
          open={showImport}
          onClose={() => setShowImport(false)}
          title="Import Feature Files"
          size="lg"
        >
          <FileDropZone projectId={projectId!} onImport={handleImport} />
        </Modal>

        {/* Duplicate Resolution Modal */}
        <Modal
          open={!!pendingImport}
          onClose={() => {
            setPendingImport(null);
            setDuplicateNames([]);
          }}
          title="Duplicate Features Found"
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-600 dark:text-amber-400">
                  {duplicateNames.length} feature
                  {duplicateNames.length !== 1 ? "s" : ""} already exist
                  {duplicateNames.length === 1 ? "s" : ""} in this project
                </p>
                <p className="text-muted-foreground mt-1">
                  {pendingImport &&
                  pendingImport.length - duplicateNames.length > 0
                    ? `${pendingImport.length - duplicateNames.length} new feature${pendingImport.length - duplicateNames.length !== 1 ? "s" : ""} will be imported regardless.`
                    : "All imported features are duplicates."}
                </p>
              </div>
            </div>

            <div className="max-h-[200px] overflow-y-auto space-y-1.5">
              {duplicateNames.map((name) => (
                <div
                  key={name}
                  className="flex items-center gap-2 text-sm rounded-md border border-border px-3 py-2"
                >
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{name}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPendingImport(null);
                  setDuplicateNames([]);
                }}
              >
                Cancel
              </Button>
              {pendingImport &&
                pendingImport.length > duplicateNames.length && (
                  <Button
                    variant="outline"
                    onClick={handleImportSkipDuplicates}
                  >
                    Skip Duplicates
                  </Button>
                )}
              <Button onClick={handleImportOverwrite}>
                Overwrite Existing
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
