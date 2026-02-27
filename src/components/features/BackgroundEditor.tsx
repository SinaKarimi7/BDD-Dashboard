import { useState, useCallback } from "react";
import {
  Plus,
  GripVertical,
  Trash2,
  ChevronDown,
  ChevronRight,
  Layers,
} from "lucide-react";
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
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store";
import type { Background, StepKeyword } from "@/types";
import { Button } from "@/components/ui";
import { pushUndo } from "@/hooks/useUndoRedo";
import { collapseTransition } from "@/lib/motion";

interface BackgroundEditorProps {
  featureId: string;
  background: Background | null;
}

const KEYWORDS: { value: StepKeyword; label: string; color: string }[] = [
  { value: "Given", label: "Given", color: "text-blue-600" },
  { value: "When", label: "When", color: "text-amber-600" },
  { value: "Then", label: "Then", color: "text-green-600" },
  { value: "And", label: "And", color: "text-gray-500" },
  { value: "But", label: "But", color: "text-red-500" },
];

export function BackgroundEditor({
  featureId,
  background,
}: BackgroundEditorProps) {
  const setBackground = useAppStore((s) => s.setBackground);
  const removeBackground = useAppStore((s) => s.removeBackground);

  const [expanded, setExpanded] = useState(true);
  const [newKeyword, setNewKeyword] = useState<StepKeyword>("Given");
  const [newText, setNewText] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const steps = background
    ? [...background.steps].sort((a, b) => a.position - b.position)
    : [];

  const handleAddBackground = useCallback(() => {
    pushUndo(featureId, "Add background");
    setBackground(featureId, [
      { keyword: "Given", text: "the system is initialized" },
    ]);
  }, [featureId, setBackground]);

  const handleRemoveBackground = useCallback(() => {
    pushUndo(featureId, "Remove background");
    removeBackground(featureId);
  }, [featureId, removeBackground]);

  const handleAddStep = useCallback(() => {
    if (!newText.trim() || !background) return;
    pushUndo(featureId, "Add background step");
    const newSteps = [
      ...background.steps.map((s) => ({
        keyword: s.keyword,
        text: s.text,
        dataTable: s.dataTable,
        docString: s.docString,
      })),
      { keyword: newKeyword, text: newText.trim() },
    ];
    setBackground(featureId, newSteps);

    // Smart next keyword
    if (newKeyword === "Given") setNewKeyword("When");
    else if (newKeyword === "When") setNewKeyword("Then");
    else setNewKeyword("And");
    setNewText("");
  }, [background, featureId, newKeyword, newText, setBackground]);

  const handleUpdateStep = useCallback(
    (stepId: string, updates: { keyword?: StepKeyword; text?: string }) => {
      if (!background) return;
      pushUndo(featureId, "Edit background step");
      const newSteps = background.steps.map((s) =>
        s.id === stepId
          ? {
              keyword: updates.keyword ?? s.keyword,
              text: updates.text ?? s.text,
              dataTable: s.dataTable,
              docString: s.docString,
            }
          : {
              keyword: s.keyword,
              text: s.text,
              dataTable: s.dataTable,
              docString: s.docString,
            },
      );
      setBackground(featureId, newSteps);
    },
    [background, featureId, setBackground],
  );

  const handleDeleteStep = useCallback(
    (stepId: string) => {
      if (!background) return;
      pushUndo(featureId, "Delete background step");
      const remaining = background.steps.filter((s) => s.id !== stepId);
      if (remaining.length === 0) {
        removeBackground(featureId);
      } else {
        setBackground(
          featureId,
          remaining.map((s) => ({
            keyword: s.keyword,
            text: s.text,
            dataTable: s.dataTable,
            docString: s.docString,
          })),
        );
      }
    },
    [background, featureId, removeBackground, setBackground],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !background) return;
      pushUndo(featureId, "Reorder background steps");
      const oldIndex = steps.findIndex((s) => s.id === active.id);
      const newIndex = steps.findIndex((s) => s.id === over.id);
      const reordered = arrayMove(steps, oldIndex, newIndex);
      setBackground(
        featureId,
        reordered.map((s) => ({
          keyword: s.keyword,
          text: s.text,
          dataTable: s.dataTable,
          docString: s.docString,
        })),
      );
    },
    [background, featureId, setBackground, steps],
  );

  // No background yet — show "Add Background" button
  if (!background) {
    return (
      <div className="mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddBackground}
          className="gap-1.5"
        >
          <Layers className="w-4 h-4" />
          Add Background
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm mb-4">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        <Layers className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm font-medium">
          <span className="gherkin-keyword">Background</span>
        </span>
        <span className="text-xs text-muted-foreground ml-1">
          ({steps.length} step{steps.length !== 1 ? "s" : ""})
        </span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          Applies to all scenarios
        </span>
        <button
          onClick={handleRemoveBackground}
          className="shrink-0 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
          title="Remove background"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
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
            <div className="px-4 pb-4 space-y-2">
              {/* Step list */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={steps.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {steps.map((step) => (
                    <SortableBgStep
                      key={step.id}
                      step={step}
                      onUpdate={handleUpdateStep}
                      onDelete={handleDeleteStep}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {/* Add step row */}
              <div className="flex items-center gap-2">
                <select
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value as StepKeyword)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {KEYWORDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
                <input
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddStep()}
                  placeholder="Step text…"
                  className="flex-1 h-8 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleAddStep}
                  disabled={!newText.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sortable Background Step ───────────────────────────────

interface SortableBgStepProps {
  step: { id: string; keyword: StepKeyword; text: string };
  onUpdate: (
    id: string,
    updates: { keyword?: StepKeyword; text?: string },
  ) => void;
  onDelete: (id: string) => void;
}

function SortableBgStep({ step, onUpdate, onDelete }: SortableBgStepProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const kwColor =
    KEYWORDS.find((k) => k.value === step.keyword)?.color ?? "text-gray-500";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 bg-background transition-all ${
        isDragging ? "shadow-lg opacity-80 z-50" : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab shrink-0 text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      <select
        value={step.keyword}
        onChange={(e) =>
          onUpdate(step.id, { keyword: e.target.value as StepKeyword })
        }
        className={`bg-transparent text-sm font-medium outline-none cursor-pointer ${kwColor}`}
      >
        {KEYWORDS.map((k) => (
          <option key={k.value} value={k.value}>
            {k.label}
          </option>
        ))}
      </select>

      <input
        value={step.text}
        onChange={(e) => onUpdate(step.id, { text: e.target.value })}
        className="flex-1 bg-transparent text-sm outline-none min-w-0"
      />

      <button
        onClick={() => onDelete(step.id)}
        className="shrink-0 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
