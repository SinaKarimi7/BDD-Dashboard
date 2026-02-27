import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Plus,
  Download,
  LayoutGrid,
  FileText,
  Edit3,
  Copy,
  Trash2,
  MoreHorizontal,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleDot,
  Loader2,
  CheckCircle2,
  Search,
  Tags,
  X,
  Undo2,
  Redo2,
  Save,
  RotateCcw,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAppStore } from "@/store";
import type { Scenario, TriageStatus } from "@/types";
import {
  Button,
  Badge,
  Modal,
  Input,
  Textarea,
  EmptyState,
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
  Select,
} from "@/components/ui";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { TagPicker } from "@/components/features/TagPicker";
import { StepEditor } from "@/components/features/StepEditor";
import { GherkinPreview } from "@/components/features/GherkinPreview";
import { ExamplesEditor } from "@/components/features/ExamplesEditor";
import { exportSingleFeature } from "@/lib/export";
import { PageTransition } from "@/components/animation";
import { collapseTransition, easing, duration } from "@/lib/motion";
import { useUndoRedo, pushUndo } from "@/hooks/useUndoRedo";

export function FeatureEditorPage() {
  const { projectId, featureId } = useParams<{
    projectId: string;
    featureId: string;
  }>();
  const navigate = useNavigate();
  const project = useAppStore((s) => s.getProject(projectId!));
  const feature = useAppStore((s) => s.getFeature(featureId!));
  const updateFeature = useAppStore((s) => s.updateFeature);
  const addScenario = useAppStore((s) => s.addScenario);
  const deleteScenario = useAppStore((s) => s.deleteScenario);
  const cloneScenario = useAppStore((s) => s.cloneScenario);
  const reorderScenarios = useAppStore((s) => s.reorderScenarios);
  const {
    canUndo,
    canRedo,
    undo: handleUndo,
    redo: handleRedo,
  } = useUndoRedo(featureId);

  const [showAddScenario, setShowAddScenario] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const [scenarioType, setScenarioType] = useState<
    "scenario" | "scenario_outline"
  >("scenario");
  const [expandedScenarios, setExpandedScenarios] = useState<Set<string>>(
    new Set(),
  );
  const [showPreview, setShowPreview] = useState(false);
  const [editingFeatureDesc, setEditingFeatureDesc] = useState(false);
  const [featureDesc, setFeatureDesc] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTags, setFilterTags] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<TriageStatus | null>(null);
  const [lastAddedScenarioId, setLastAddedScenarioId] = useState<string | null>(
    null,
  );
  const newScenarioRef = useRef<HTMLDivElement>(null);

  // ─── Draft mode ───────────────────────────────────────────
  const [savedSnapshot, setSavedSnapshot] = useState<string>(() =>
    feature ? JSON.stringify(feature) : "",
  );
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const currentJson = useMemo(
    () => (feature ? JSON.stringify(feature) : ""),
    [feature],
  );
  const isDraft = currentJson !== savedSnapshot && savedSnapshot !== "";

  const handleSaveConfirm = () => {
    setSavedSnapshot(currentJson);
    updateFeature(featureId!, { updatedAt: new Date().toISOString() });
    setShowSaveConfirm(false);
  };

  const handleDiscardDraft = () => {
    if (!savedSnapshot) return;
    try {
      const snap = JSON.parse(savedSnapshot);
      updateFeature(featureId!, snap);
      setShowSaveConfirm(false);
    } catch {
      /* ignore */
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  if (!project || !feature) {
    return (
      <div className="p-6 lg:p-8">
        <EmptyState title="Feature not found" />
      </div>
    );
  }

  const sortedScenarios = [...feature.scenarios].sort(
    (a, b) => a.position - b.position,
  );

  const toggleExpanded = (id: string) => {
    setExpandedScenarios((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddScenario = () => {
    if (!scenarioName.trim()) return;
    pushUndo(featureId!, "Add scenario");
    const sc = addScenario(featureId!, {
      name: scenarioName.trim(),
      type: scenarioType,
    });
    setScenarioName("");
    setScenarioType("scenario");
    setShowAddScenario(false);
    setExpandedScenarios((prev) => new Set(prev).add(sc.id));
    setLastAddedScenarioId(sc.id);
  };

  // Auto-scroll to newly added scenario
  useEffect(() => {
    if (lastAddedScenarioId && newScenarioRef.current) {
      setTimeout(() => {
        newScenarioRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        setLastAddedScenarioId(null);
      }, 150);
    }
  }, [lastAddedScenarioId, feature?.scenarios.length]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    pushUndo(featureId!, "Reorder scenarios");

    const oldIndex = sortedScenarios.findIndex((s) => s.id === active.id);
    const newIndex = sortedScenarios.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(sortedScenarios, oldIndex, newIndex);
    reorderScenarios(
      featureId!,
      reordered.map((s) => s.id),
    );
  };

  const startEditDescription = () => {
    setFeatureDesc(feature.description);
    setEditingFeatureDesc(true);
  };

  const saveDescription = () => {
    pushUndo(featureId!, "Edit description");
    updateFeature(featureId!, { description: featureDesc });
    setEditingFeatureDesc(false);
  };

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <Breadcrumbs
          items={[
            { label: "Dashboard", path: "/dashboard" },
            { label: project.name, path: `/projects/${projectId}` },
            { label: feature.name },
          ]}
        />

        {/* Feature header */}
        <div className="mt-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="gherkin-keyword">Feature:</span> {feature.name}
            </h1>
            <div className="flex items-center gap-2">
              {/* Draft indicator & save */}
              <div className="flex items-center gap-1.5 mr-1">
                {isDraft ? (
                  <>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 text-[11px] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Draft
                    </span>
                    <Button
                      size="sm"
                      onClick={() => setShowSaveConfirm(true)}
                      className="h-7 text-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDiscardDraft}
                      className="h-7 text-xs px-2"
                      title="Discard changes"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 text-green-600 text-[11px] font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    Saved
                  </span>
                )}
              </div>

              {/* Last edited */}
              <span
                className="hidden sm:inline-flex items-center gap-1 text-[11px] text-muted-foreground mr-1"
                title={new Date(feature.updatedAt).toLocaleString()}
              >
                <Clock className="w-3 h-3" />
                {formatDate(feature.updatedAt)}
              </span>

              <div className="flex items-center gap-0.5 mr-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUndo}
                  disabled={!canUndo}
                  title="Undo (Ctrl+Z)"
                  className="px-2"
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRedo}
                  disabled={!canRedo}
                  title="Redo (Ctrl+Shift+Z)"
                  className="px-2"
                >
                  <Redo2 className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate(`/projects/${projectId}/features/${featureId}/board`)
                }
              >
                <LayoutGrid className="w-4 h-4" />
                Kanban View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <FileText className="w-4 h-4" />
                {showPreview ? "Hide" : "Show"} Gherkin
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportSingleFeature(feature)}
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Feature status summary */}
          {sortedScenarios.length > 0 && (
            <FeatureStatusBar scenarios={sortedScenarios} />
          )}

          {/* Feature description */}
          <div className="mb-4">
            {editingFeatureDesc ? (
              <div className="space-y-2">
                <Textarea
                  value={featureDesc}
                  onChange={(e) => setFeatureDesc(e.target.value)}
                  placeholder="As a [role], I want [feature] so that [benefit]"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveDescription}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingFeatureDesc(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={startEditDescription}
                className="text-muted-foreground text-sm cursor-pointer hover:bg-accent/50 rounded-lg p-2 -m-2 transition-colors min-h-[40px]"
              >
                {feature.description || "Click to add a description..."}
              </div>
            )}
          </div>

          {/* Feature tags */}
          <div className="flex items-center gap-2 flex-wrap">
            {feature.tags.map((tag) => (
              <Badge key={tag.id} color={tag.color}>
                @{tag.name}
              </Badge>
            ))}
            <TagPicker
              projectId={projectId!}
              featureId={featureId!}
              targetType="feature"
              targetId={featureId!}
            />
          </div>
        </div>

        {/* Gherkin Preview Panel */}
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={collapseTransition}
              className="overflow-hidden mb-6"
            >
              <GherkinPreview feature={feature} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scenarios */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Scenarios ({feature.scenarios.length})
          </h2>
          <Button size="sm" onClick={() => setShowAddScenario(true)}>
            <Plus className="w-4 h-4" />
            Add Scenario
          </Button>
        </div>

        {/* Search & tag filter */}
        {sortedScenarios.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search scenarios..."
                  className="w-full h-8 pl-8 pr-8 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
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
                      title={`Filter: ${sc.label}`}
                    >
                      <Icon className="w-3 h-3" />
                      <span className="hidden sm:inline">{sc.label}</span>
                    </button>
                  );
                })}
                {filterStatus && (
                  <button
                    onClick={() => setFilterStatus(null)}
                    className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            {/* Multi-select tag filter chips */}
            {(() => {
              const allTags = Array.from(
                new Map(
                  feature.scenarios
                    .flatMap((s) => s.tags)
                    .map((t) => [t.name, t]),
                ).values(),
              );
              if (allTags.length === 0) return null;
              return (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Tags className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  {allTags.map((tag) => {
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
                          ...(active ? { ringColor: tag.color } : {}),
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
              );
            })()}
          </div>
        )}

        {(() => {
          const q = searchQuery.toLowerCase();
          const filtered = sortedScenarios.filter((s) => {
            if (
              q &&
              !s.name.toLowerCase().includes(q) &&
              !s.steps.some((st) => st.text.toLowerCase().includes(q))
            )
              return false;
            if (
              filterTags.size > 0 &&
              !s.tags.some((t) => filterTags.has(t.name))
            )
              return false;
            if (filterStatus && (s.status || "backlog") !== filterStatus)
              return false;
            return true;
          });

          if (sortedScenarios.length === 0) {
            return (
              <EmptyState
                title="No scenarios yet"
                description="Add your first scenario to start building this feature."
                action={
                  <Button onClick={() => setShowAddScenario(true)}>
                    <Plus className="w-4 h-4" />
                    Add Scenario
                  </Button>
                }
              />
            );
          }

          if (filtered.length === 0) {
            return (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No scenarios match your filters.
              </div>
            );
          }

          return (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filtered.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {filtered.map((scenario) => (
                      <motion.div
                        key={scenario.id}
                        ref={
                          scenario.id === lastAddedScenarioId
                            ? newScenarioRef
                            : undefined
                        }
                        layout
                        exit={{
                          opacity: 0,
                          height: 0,
                          transition: {
                            duration: duration.normal,
                            ease: easing.apple,
                          },
                        }}
                      >
                        <SortableScenarioCard
                          key={scenario.id}
                          scenario={scenario}
                          featureId={featureId!}
                          projectId={projectId!}
                          expanded={expandedScenarios.has(scenario.id)}
                          onToggle={() => toggleExpanded(scenario.id)}
                          onClone={() => {
                            pushUndo(featureId!, "Clone scenario");
                            cloneScenario(featureId!, scenario.id);
                          }}
                          onDelete={() => {
                            pushUndo(featureId!, "Delete scenario");
                            deleteScenario(featureId!, scenario.id);
                          }}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </SortableContext>
            </DndContext>
          );
        })()}

        {/* Add Scenario Modal */}
        <Modal
          open={showAddScenario}
          onClose={() => {
            setShowAddScenario(false);
            setScenarioName("");
          }}
          title="Add Scenario"
        >
          <div className="space-y-4">
            <Input
              label="Scenario Name"
              placeholder="e.g. User logs in with valid credentials"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleAddScenario()}
            />
            <Select
              label="Type"
              value={scenarioType}
              onChange={(e) =>
                setScenarioType(e.target.value as typeof scenarioType)
              }
              options={[
                { value: "scenario", label: "Scenario" },
                { value: "scenario_outline", label: "Scenario Outline" },
              ]}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddScenario(false);
                  setScenarioName("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddScenario}
                disabled={!scenarioName.trim()}
              >
                Add Scenario
              </Button>
            </div>
          </div>
        </Modal>

        {/* Save Confirmation Modal */}
        <Modal
          open={showSaveConfirm}
          onClose={() => setShowSaveConfirm(false)}
          title="Save Changes"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to finalize these changes? This will mark
              the current state as saved.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowSaveConfirm(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveConfirm}>
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}

// ─── Sortable Scenario Card ─────────────────────────────────

interface SortableScenarioCardProps {
  scenario: Scenario;
  featureId: string;
  projectId: string;
  expanded: boolean;
  onToggle: () => void;
  onClone: () => void;
  onDelete: () => void;
}

function SortableScenarioCard({
  scenario,
  featureId,
  projectId,
  expanded,
  onToggle,
  onClone,
  onDelete,
}: SortableScenarioCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scenario.id });
  const updateScenario = useAppStore((s) => s.updateScenario);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(scenario.name);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const saveName = () => {
    if (name.trim()) {
      updateScenario(featureId, scenario.id, { name: name.trim() });
    }
    setEditingName(false);
  };

  const keyword =
    scenario.type === "scenario_outline" ? "Scenario Outline" : "Scenario";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border border-border bg-card shadow-sm transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        isDragging
          ? "shadow-2xl scale-[1.02] opacity-90 z-50 border-primary/30"
          : "hover:shadow-md"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-4">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground hover:text-foreground shrink-0"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <button
          onClick={onToggle}
          className="shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
                if (e.key === "Escape") setEditingName(false);
              }}
              className="w-full bg-transparent border-b border-primary outline-none text-sm font-medium"
              autoFocus
            />
          ) : (
            <button
              className="text-left w-full cursor-pointer"
              onClick={onToggle}
            >
              <span className="text-sm">
                <span className="gherkin-keyword">{keyword}:</span>{" "}
                <span className="font-medium">{scenario.name}</span>
              </span>
            </button>
          )}
        </div>

        {/* Tags inline */}
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          {scenario.tags.slice(0, 3).map((tag) => (
            <Badge key={tag.id} color={tag.color} className="text-[10px]">
              @{tag.name}
            </Badge>
          ))}
          {scenario.tags.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{scenario.tags.length - 3}
            </span>
          )}
        </div>

        {/* Status indicator */}
        {(() => {
          const sc = STATUS_CONFIG.find(
            (c) => c.status === (scenario.status || "backlog"),
          );
          if (!sc) return null;
          const StatusIcon = sc.icon;
          return (
            <span className={`shrink-0 ${sc.color}`} title={sc.label}>
              <StatusIcon className="w-3.5 h-3.5" />
            </span>
          );
        })()}

        <span className="text-xs text-muted-foreground shrink-0">
          {scenario.steps.length} steps
        </span>

        <DropdownMenu
          trigger={
            <button className="rounded-lg p-1.5 hover:bg-accent transition-colors cursor-pointer shrink-0">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          }
        >
          <DropdownItem
            onClick={() => {
              setName(scenario.name);
              setEditingName(true);
            }}
          >
            <Edit3 className="w-4 h-4" /> Rename
          </DropdownItem>
          <DropdownItem onClick={onClone}>
            <Copy className="w-4 h-4" /> Clone
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem destructive onClick={onDelete}>
            <Trash2 className="w-4 h-4" /> Delete
          </DropdownItem>
        </DropdownMenu>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={collapseTransition}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Scenario tags */}
              <div className="flex items-center gap-2 flex-wrap">
                {scenario.tags.map((tag) => (
                  <Badge key={tag.id} color={tag.color}>
                    @{tag.name}
                  </Badge>
                ))}
                <TagPicker
                  projectId={projectId}
                  featureId={featureId}
                  targetType="scenario"
                  targetId={scenario.id}
                />
              </div>

              {/* Steps */}
              <StepEditor
                featureId={featureId}
                scenarioId={scenario.id}
                steps={scenario.steps}
              />

              {/* Examples for Scenario Outline */}
              {scenario.type === "scenario_outline" && (
                <ExamplesEditor
                  featureId={featureId}
                  scenarioId={scenario.id}
                  examples={scenario.examples}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Feature Status Bar ─────────────────────────────────────

const STATUS_CONFIG = [
  {
    status: "backlog",
    label: "Backlog",
    icon: Circle,
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
  {
    status: "todo",
    label: "To Do",
    icon: CircleDot,
    color: "text-blue-500",
    bg: "bg-blue-500",
  },
  {
    status: "wip",
    label: "In Progress",
    icon: Loader2,
    color: "text-amber-500",
    bg: "bg-amber-500",
  },
  {
    status: "done",
    label: "Done",
    icon: CheckCircle2,
    color: "text-green-500",
    bg: "bg-green-500",
  },
] as const;

function FeatureStatusBar({ scenarios }: { scenarios: Scenario[] }) {
  const total = scenarios.length;
  const counts = STATUS_CONFIG.map((c) => ({
    ...c,
    count: scenarios.filter((s) => (s.status || "backlog") === c.status).length,
  }));

  const backlogCount = counts.find((c) => c.status === "backlog")?.count ?? 0;
  const activeCount = total - backlogCount;
  const progress = total > 0 ? Math.round((activeCount / total) * 100) : 0;

  // Non-backlog statuses for the progress segments
  const progressSegments = counts.filter((c) => c.status !== "backlog");

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/20 px-4 py-2.5 mb-4">
      {/* Progress bar — backlog = empty background, only todo/wip/done fill from left */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-28 h-2 rounded-full bg-muted overflow-hidden flex shrink-0">
          {progressSegments.map(
            (c) =>
              c.count > 0 && (
                <div
                  key={c.status}
                  className={`h-full ${c.bg} transition-all duration-300`}
                  style={{ width: `${(c.count / total) * 100}%` }}
                />
              ),
          )}
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {progress}%
        </span>
      </div>

      {/* Status counts */}
      <div className="flex items-center gap-3 flex-wrap">
        {counts.map((c) => {
          const Icon = c.icon;
          return (
            <span
              key={c.status}
              className={`flex items-center gap-1 text-xs ${c.count > 0 ? c.color : "text-muted-foreground/40"}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="font-medium">{c.count}</span>
              <span className="hidden sm:inline">{c.label}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
