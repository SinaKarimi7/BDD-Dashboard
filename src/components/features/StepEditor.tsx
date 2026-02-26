import { useState } from "react";
import { Plus, GripVertical, Trash2 } from "lucide-react";
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
import type { Step, StepKeyword } from "@/types";
import { Button } from "@/components/ui";

interface StepEditorProps {
  featureId: string;
  scenarioId: string;
  steps: Step[];
}

const KEYWORDS: { value: StepKeyword; label: string; color: string }[] = [
  { value: "Given", label: "Given", color: "text-blue-600" },
  { value: "When", label: "When", color: "text-amber-600" },
  { value: "Then", label: "Then", color: "text-green-600" },
  { value: "And", label: "And", color: "text-gray-500" },
  { value: "But", label: "But", color: "text-red-500" },
];

export function StepEditor({ featureId, scenarioId, steps }: StepEditorProps) {
  const addStep = useAppStore((s) => s.addStep);
  const updateStep = useAppStore((s) => s.updateStep);
  const deleteStep = useAppStore((s) => s.deleteStep);
  const reorderSteps = useAppStore((s) => s.reorderSteps);

  const [newKeyword, setNewKeyword] = useState<StepKeyword>("Given");
  const [newText, setNewText] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const sortedSteps = [...steps].sort((a, b) => a.position - b.position);

  const handleAddStep = () => {
    if (!newText.trim()) return;
    addStep(featureId, scenarioId, {
      keyword: newKeyword,
      text: newText.trim(),
    });

    // Smart next keyword
    if (newKeyword === "Given") setNewKeyword("When");
    else if (newKeyword === "When") setNewKeyword("Then");
    else setNewKeyword("And");

    setNewText("");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedSteps.findIndex((s) => s.id === active.id);
    const newIndex = sortedSteps.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(sortedSteps, oldIndex, newIndex);
    reorderSteps(
      featureId,
      scenarioId,
      reordered.map((s) => s.id),
    );
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Steps
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedSteps.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1">
            {sortedSteps.map((step) => (
              <SortableStepRow
                key={step.id}
                step={step}
                featureId={featureId}
                scenarioId={scenarioId}
                onUpdate={(updates) =>
                  updateStep(featureId, scenarioId, step.id, updates)
                }
                onDelete={() => deleteStep(featureId, scenarioId, step.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add new step */}
      <div className="flex items-center gap-2 mt-2">
        <select
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value as StepKeyword)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {KEYWORDS.map((kw) => (
            <option key={kw.value} value={kw.value}>
              {kw.label}
            </option>
          ))}
        </select>
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddStep()}
          placeholder="step description..."
          className="flex-1 h-8 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={handleAddStep}
          disabled={!newText.trim()}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Sortable Step Row ──────────────────────────────────────

interface SortableStepRowProps {
  step: Step;
  featureId: string;
  scenarioId: string;
  onUpdate: (updates: Partial<Step>) => void;
  onDelete: () => void;
}

function SortableStepRow({ step, onUpdate, onDelete }: SortableStepRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(step.text);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const save = () => {
    if (text.trim()) {
      onUpdate({ text: text.trim() });
    }
    setEditing(false);
  };

  const kwColor = KEYWORDS.find((k) => k.value === step.keyword)?.color ?? "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent/50 transition-colors ${
        isDragging ? "opacity-50 bg-accent" : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      <select
        value={step.keyword}
        onChange={(e) => onUpdate({ keyword: e.target.value as StepKeyword })}
        className={`shrink-0 bg-transparent text-xs font-bold focus:outline-none cursor-pointer ${kwColor}`}
      >
        {KEYWORDS.map((kw) => (
          <option key={kw.value} value={kw.value}>
            {kw.label}
          </option>
        ))}
      </select>

      {editing ? (
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          className="flex-1 bg-transparent border-b border-primary outline-none text-sm"
          autoFocus
        />
      ) : (
        <span
          className="flex-1 text-sm cursor-pointer hover:text-primary transition-colors"
          onClick={() => {
            setText(step.text);
            setEditing(true);
          }}
        >
          {step.text}
        </span>
      )}

      <button
        onClick={onDelete}
        className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

const _KEYWORDS = KEYWORDS; // re-export for SortableStepRow
