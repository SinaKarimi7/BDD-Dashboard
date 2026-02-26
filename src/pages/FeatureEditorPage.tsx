import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
import type { Scenario, Step, StepKeyword } from "@/types";
import {
  Button,
  Card,
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
  const updateScenario = useAppStore((s) => s.updateScenario);
  const deleteScenario = useAppStore((s) => s.deleteScenario);
  const cloneScenario = useAppStore((s) => s.cloneScenario);
  const reorderScenarios = useAppStore((s) => s.reorderScenarios);

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
    const sc = addScenario(featureId!, {
      name: scenarioName.trim(),
      type: scenarioType,
    });
    setScenarioName("");
    setScenarioType("scenario");
    setShowAddScenario(false);
    setExpandedScenarios((prev) => new Set(prev).add(sc.id));
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

  const startEditDescription = () => {
    setFeatureDesc(feature.description);
    setEditingFeatureDesc(true);
  };

  const saveDescription = () => {
    updateFeature(featureId!, { description: featureDesc });
    setEditingFeatureDesc(false);
  };

  return (
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
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(`/projects/${projectId}/features/${featureId}/board`)
              }
            >
              <LayoutGrid className="w-4 h-4" />
              Board View
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

      {sortedScenarios.length === 0 ? (
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
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedScenarios.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {sortedScenarios.map((scenario) => (
                <SortableScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  featureId={featureId!}
                  projectId={projectId!}
                  expanded={expandedScenarios.has(scenario.id)}
                  onToggle={() => toggleExpanded(scenario.id)}
                  onClone={() => cloneScenario(featureId!, scenario.id)}
                  onDelete={() => deleteScenario(featureId!, scenario.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

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
            <Button onClick={handleAddScenario} disabled={!scenarioName.trim()}>
              Add Scenario
            </Button>
          </div>
        </div>
      </Modal>
    </div>
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
      className={`rounded-xl border border-border bg-card shadow-sm transition-shadow ${
        isDragging ? "shadow-xl opacity-50 z-50" : ""
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
