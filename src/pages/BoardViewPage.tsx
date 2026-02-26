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
  ArrowRight,
  ChevronDown,
  GripVertical,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAppStore } from "@/store";
import type { Scenario } from "@/types";
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
  const reorderScenarios = useAppStore((s) => s.reorderScenarios);

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"scenario" | "scenario_outline">("scenario");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
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

  const handleAdd = () => {
    if (!name.trim()) return;
    addScenario(featureId!, { name: name.trim(), type });
    setName("");
    setShowAdd(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedScenarios.findIndex((s) => s.id === active.id);
    const newIndex = sortedScenarios.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(sortedScenarios, oldIndex, newIndex);
    reorderScenarios(
      featureId!,
      reordered.map((s) => s.id),
    );
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          Board: {feature.name}
        </h1>
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

      {sortedScenarios.length === 0 ? (
        <EmptyState
          title="No scenarios on the board"
          description="Add scenarios to see them as interactive cards you can drag, reorder, and manage."
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
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedScenarios.map((s) => s.id)}
            strategy={rectSortingStrategy}
          >
            <div className="relative">
              {/* Flow connector lines */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sortedScenarios.map((scenario, idx) => (
                  <BoardCard
                    key={scenario.id}
                    scenario={scenario}
                    index={idx}
                    total={sortedScenarios.length}
                    featureId={featureId!}
                    projectId={projectId!}
                    onClone={() => cloneScenario(featureId!, scenario.id)}
                    onDelete={() => deleteScenario(featureId!, scenario.id)}
                    onEdit={() =>
                      navigate(`/projects/${projectId}/features/${featureId}`)
                    }
                  />
                ))}
              </div>
            </div>
          </SortableContext>
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
  );
}

// ─── Board Card ─────────────────────────────────────────────

interface BoardCardProps {
  scenario: Scenario;
  index: number;
  total: number;
  featureId: string;
  projectId: string;
  onClone: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

function BoardCard({
  scenario,
  index,
  total,
  featureId,
  projectId,
  onClone,
  onDelete,
  onEdit,
}: BoardCardProps) {
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
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className={`group relative rounded-xl border-2 bg-card shadow-sm transition-all ${
        isDragging
          ? "opacity-50 shadow-xl border-primary scale-105"
          : "border-border hover:border-primary/30 hover:shadow-md"
      }`}
    >
      {/* Card header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab text-muted-foreground hover:text-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                {keyword}
              </span>
            </div>
          </div>
          <DropdownMenu
            trigger={
              <button className="rounded-lg p-1 hover:bg-accent transition-colors cursor-pointer opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="w-4 h-4" />
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

        <h3 className="font-semibold text-sm mb-2 leading-snug">
          {scenario.name}
        </h3>

        {/* Tags */}
        {scenario.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {scenario.tags.map((tag) => (
              <Badge key={tag.id} color={tag.color} className="text-[10px]">
                @{tag.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Step summary */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{scenario.steps.length} steps</span>
          {Object.entries(stepsByKeyword).map(([kw, count]) => (
            <span key={kw} className="flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
              {count} {kw}
            </span>
          ))}
        </div>

        {/* Expandable steps preview */}
        {scenario.steps.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-2 text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer"
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
              className="overflow-hidden mt-2"
            >
              <div className="space-y-1 text-xs font-mono border-t border-border pt-2">
                {scenario.steps
                  .sort((a, b) => a.position - b.position)
                  .map((step) => (
                    <div key={step.id} className="flex gap-1.5">
                      <span className="font-bold text-primary shrink-0">
                        {step.keyword}
                      </span>
                      <span className="text-muted-foreground">{step.text}</span>
                    </div>
                  ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Flow connector arrow */}
      {index < total - 1 && (
        <div className="hidden sm:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 text-muted-foreground/30">
          <ArrowRight className="w-4 h-4" />
        </div>
      )}

      {/* Position indicator */}
      <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-sm">
        {index + 1}
      </div>
    </motion.div>
  );
}
