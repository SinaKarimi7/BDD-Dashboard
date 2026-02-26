import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FileText,
  Download,
  Edit3,
  Copy,
  Trash2,
  MoreHorizontal,
  Plus,
  ChevronDown,
  GripVertical,
  Circle,
  CircleDot,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAppStore } from "@/store";
import type { Scenario, TriageStatus } from "@/types";
import {
  Button,
  Badge,
  Modal,
  Input,
  Select,
  EmptyState,
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { exportSingleFeature } from "@/lib/export";
import { PageTransition } from "@/components/animation";
import { collapseTransition } from "@/lib/motion";

const COLUMNS: {
  status: TriageStatus;
  label: string;
  icon: typeof Circle;
  color: string;
}[] = [
  {
    status: "backlog",
    label: "Backlog",
    icon: Circle,
    color: "text-muted-foreground",
  },
  { status: "todo", label: "To Do", icon: CircleDot, color: "text-blue-500" },
  {
    status: "wip",
    label: "In Progress",
    icon: Loader2,
    color: "text-amber-500",
  },
  {
    status: "done",
    label: "Done",
    icon: CheckCircle2,
    color: "text-green-500",
  },
];

export function BoardViewPage() {
  const { projectId, featureId } = useParams<{
    projectId: string;
    featureId: string;
  }>();
  const navigate = useNavigate();
  const project = useAppStore((s) => s.getProject(projectId!));
  const feature = useAppStore((s) => s.getFeature(featureId!));
  const addScenario = useAppStore((s) => s.addScenario);
  const cloneScenario = useAppStore((s) => s.cloneScenario);
  const deleteScenario = useAppStore((s) => s.deleteScenario);
  const updateScenario = useAppStore((s) => s.updateScenario);

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"scenario" | "scenario_outline">("scenario");
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  if (!project || !feature) {
    return (
      <div className="p-6 lg:p-8">
        <EmptyState title="Feature not found" />
      </div>
    );
  }

  const allScenarios = [...feature.scenarios].sort(
    (a, b) => a.position - b.position,
  );

  const getColumnScenarios = (status: TriageStatus) =>
    allScenarios.filter((s) => (s.status || "backlog") === status);

  const handleAdd = () => {
    if (!name.trim()) return;
    addScenario(featureId!, { name: name.trim(), type });
    setName("");
    setShowAdd(false);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const scenarioId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column
    const targetColumn = COLUMNS.find((c) => c.status === overId);
    if (targetColumn) {
      const scenario = allScenarios.find((s) => s.id === scenarioId);
      if (scenario && (scenario.status || "backlog") !== targetColumn.status) {
        updateScenario(featureId!, scenarioId, {
          status: targetColumn.status,
        });
      }
      return;
    }

    // Check if dropped on another scenario — move to that scenario's column
    const overScenario = allScenarios.find((s) => s.id === overId);
    if (overScenario) {
      const draggedScenario = allScenarios.find((s) => s.id === scenarioId);
      if (
        draggedScenario &&
        (draggedScenario.status || "backlog") !==
          (overScenario.status || "backlog")
      ) {
        updateScenario(featureId!, scenarioId, {
          status: overScenario.status || "backlog",
        });
      }
    }
  };

  const activeScenario = activeId
    ? allScenarios.find((s) => s.id === activeId)
    : null;

  const totalDone = getColumnScenarios("done").length;
  const total = allScenarios.length;
  const progress = total > 0 ? Math.round((totalDone / total) * 100) : 0;

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
        <Breadcrumbs
          items={[
            { label: "Dashboard", path: "/dashboard" },
            { label: project.name, path: `/projects/${projectId}` },
            {
              label: feature.name,
              path: `/projects/${projectId}/features/${featureId}`,
            },
            { label: "Board View" },
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Board: {feature.name}
            </h1>
            {total > 0 && (
              <div className="flex items-center gap-3 mt-2">
                <div className="w-40 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {progress}% done ({totalDone}/{total})
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(`/projects/${projectId}/features/${featureId}`)
              }
            >
              <FileText className="w-4 h-4" />
              Editor View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportSingleFeature(feature)}
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4" />
              Add Scenario
            </Button>
          </div>
        </div>

        {allScenarios.length === 0 ? (
          <EmptyState
            title="No scenarios on the board"
            description="Add scenarios to see them as interactive cards you can drag between columns."
            action={
              <Button onClick={() => setShowAdd(true)}>
                <Plus className="w-4 h-4" />
                Add Scenario
              </Button>
            }
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {COLUMNS.map((col) => (
                <KanbanColumn
                  key={col.status}
                  column={col}
                  scenarios={getColumnScenarios(col.status)}
                  featureId={featureId!}
                  projectId={projectId!}
                  onClone={(id) => cloneScenario(featureId!, id)}
                  onDelete={(id) => deleteScenario(featureId!, id)}
                  onEdit={() =>
                    navigate(`/projects/${projectId}/features/${featureId}`)
                  }
                />
              ))}
            </div>

            <DragOverlay>
              {activeScenario ? (
                <div className="rounded-xl border-2 border-primary bg-card shadow-2xl p-4 opacity-90 rotate-2 max-w-[300px]">
                  <p className="font-semibold text-sm">{activeScenario.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeScenario.steps.length} steps
                  </p>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* Add Scenario Modal */}
        <Modal
          open={showAdd}
          onClose={() => {
            setShowAdd(false);
            setName("");
          }}
          title="Add Scenario"
        >
          <div className="space-y-4">
            <Input
              label="Scenario Name"
              placeholder="e.g. User logs in with valid credentials"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Select
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              options={[
                { value: "scenario", label: "Scenario" },
                { value: "scenario_outline", label: "Scenario Outline" },
              ]}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAdd(false);
                  setName("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={!name.trim()}>
                Add Scenario
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}

// ─── Kanban Column ──────────────────────────────────────────

interface KanbanColumnProps {
  column: (typeof COLUMNS)[0];
  scenarios: Scenario[];
  featureId: string;
  projectId: string;
  onClone: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: () => void;
}

function KanbanColumn({
  column,
  scenarios,
  featureId,
  projectId,
  onClone,
  onDelete,
  onEdit,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.status });
  const Icon = column.icon;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border-2 bg-muted/30 min-h-[300px] transition-colors ${
        isOver ? "border-primary/50 bg-primary/5" : "border-border"
      }`}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Icon className={`w-4 h-4 ${column.color}`} />
        <h3 className="text-sm font-semibold">{column.label}</h3>
        <span className="ml-auto text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
          {scenarios.length}
        </span>
      </div>

      {/* Cards */}
      <SortableContext
        items={scenarios.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 p-2 space-y-2">
          {scenarios.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-xs text-muted-foreground border-2 border-dashed border-border rounded-lg">
              Drop here
            </div>
          ) : (
            scenarios.map((scenario) => (
              <KanbanCard
                key={scenario.id}
                scenario={scenario}
                featureId={featureId}
                projectId={projectId}
                onClone={() => onClone(scenario.id)}
                onDelete={() => onDelete(scenario.id)}
                onEdit={onEdit}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ─── Kanban Card ────────────────────────────────────────────

interface KanbanCardProps {
  scenario: Scenario;
  featureId: string;
  projectId: string;
  onClone: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

function KanbanCard({ scenario, onClone, onDelete, onEdit }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scenario.id });
  const [expanded, setExpanded] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const keyword = scenario.type === "scenario_outline" ? "Outline" : "Scenario";
  const stepsByKeyword = scenario.steps.reduce(
    (acc, s) => {
      acc[s.keyword] = (acc[s.keyword] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-lg border bg-card shadow-sm transition-all ${
        isDragging
          ? "shadow-xl border-primary opacity-50 scale-[1.02]"
          : "border-border hover:border-primary/30 hover:shadow-md"
      }`}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-1 mb-1.5">
          <div className="flex items-center gap-1.5">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab text-muted-foreground hover:text-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
            <span className="text-[9px] uppercase tracking-wider font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              {keyword}
            </span>
          </div>
          <DropdownMenu
            trigger={
              <button className="rounded-md p-0.5 hover:bg-accent transition-colors cursor-pointer opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            }
          >
            <DropdownItem onClick={onEdit}>
              <Edit3 className="w-4 h-4" /> Edit Steps
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

        <h3 className="font-medium text-sm leading-snug mb-1.5">
          {scenario.name}
        </h3>

        {/* Tags */}
        {scenario.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {scenario.tags.map((tag) => (
              <Badge key={tag.id} color={tag.color} className="text-[9px]">
                @{tag.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Step summary */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
          <span>{scenario.steps.length} steps</span>
          {Object.entries(stepsByKeyword)
            .slice(0, 3)
            .map(([kw, count]) => (
              <span key={kw} className="flex items-center gap-0.5">
                <span className="w-1 h-1 rounded-full bg-primary/40" />
                {count} {kw}
              </span>
            ))}
        </div>

        {/* Expandable steps preview */}
        {scenario.steps.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-1.5 text-[11px] text-primary hover:text-primary/80 transition-colors cursor-pointer"
          >
            <ChevronDown
              className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
            {expanded ? "Hide" : "Show"} steps
          </button>
        )}

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={collapseTransition}
              className="overflow-hidden mt-1.5"
            >
              <div className="space-y-0.5 text-[11px] font-mono border-t border-border pt-1.5">
                {scenario.steps
                  .sort((a, b) => a.position - b.position)
                  .map((step) => (
                    <div key={step.id} className="flex gap-1">
                      <span className="font-bold text-primary shrink-0">
                        {step.keyword}
                      </span>
                      <span className="text-muted-foreground truncate">
                        {step.text}
                      </span>
                    </div>
                  ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
