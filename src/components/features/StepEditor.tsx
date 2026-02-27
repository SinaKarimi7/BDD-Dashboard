import { useState } from "react";
import {
  Plus,
  GripVertical,
  Trash2,
  Table,
  X,
  ArrowDown,
  ArrowRight,
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
import { useAppStore } from "@/store";
import type { Step, StepKeyword } from "@/types";
import { Button } from "@/components/ui";
import { pushUndo } from "@/hooks/useUndoRedo";

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
    pushUndo(featureId, "Add step");
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
    pushUndo(featureId, "Reorder steps");
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
                onDelete={() => {
                  pushUndo(featureId, "Delete step");
                  deleteStep(featureId, scenarioId, step.id);
                }}
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

function SortableStepRow({
  step,
  featureId,
  onUpdate,
  onDelete,
}: SortableStepRowProps) {
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
      pushUndo(featureId, "Edit step text");
      onUpdate({ text: text.trim() });
    }
    setEditing(false);
  };

  const kwColor = KEYWORDS.find((k) => k.value === step.keyword)?.color ?? "";

  const hasTable = step.dataTable && step.dataTable.length > 0;

  const addDataTable = () => {
    pushUndo(featureId, "Add data table");
    onUpdate({ dataTable: [["", ""]] });
  };

  const removeDataTable = () => {
    pushUndo(featureId, "Remove data table");
    onUpdate({ dataTable: null });
  };

  const updateCell = (row: number, col: number, value: string) => {
    if (!step.dataTable) return;
    const updated = step.dataTable.map((r, ri) =>
      ri === row ? r.map((c, ci) => (ci === col ? value : c)) : [...r],
    );
    onUpdate({ dataTable: updated });
  };

  const addRow = () => {
    if (!step.dataTable) return;
    pushUndo(featureId, "Add table row");
    const cols = step.dataTable[0]?.length ?? 2;
    onUpdate({ dataTable: [...step.dataTable, Array(cols).fill("")] });
  };

  const insertRowAt = (index: number) => {
    if (!step.dataTable) return;
    pushUndo(featureId, "Insert table row");
    const cols = step.dataTable[0]?.length ?? 2;
    const newTable = [...step.dataTable];
    newTable.splice(index + 1, 0, Array(cols).fill(""));
    onUpdate({ dataTable: newTable });
  };

  const removeRow = (index: number) => {
    if (!step.dataTable) return;
    pushUndo(featureId, "Remove table row");
    if (step.dataTable.length <= 1) {
      onUpdate({ dataTable: null });
      return;
    }
    onUpdate({ dataTable: step.dataTable.filter((_, i) => i !== index) });
  };

  const addColumn = () => {
    if (!step.dataTable) return;
    pushUndo(featureId, "Add table column");
    onUpdate({ dataTable: step.dataTable.map((r) => [...r, ""]) });
  };

  const insertColumnAt = (colIndex: number) => {
    if (!step.dataTable) return;
    pushUndo(featureId, "Insert table column");
    const insertPos = colIndex + 1;
    onUpdate({
      dataTable: step.dataTable.map((r) => {
        const newRow = [...r];
        newRow.splice(insertPos, 0, "");
        return newRow;
      }),
    });
  };

  const removeColumn = (colIndex: number) => {
    if (!step.dataTable) return;
    pushUndo(featureId, "Remove table column");
    if (step.dataTable[0]?.length <= 1) {
      onUpdate({ dataTable: null });
      return;
    }
    onUpdate({
      dataTable: step.dataTable.map((r) =>
        r.filter((_, ci) => ci !== colIndex),
      ),
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg transition-colors ${
        isDragging ? "opacity-50 bg-accent" : ""
      }`}
    >
      {/* Step row */}
      <div className="group flex items-center gap-2 px-2 py-1.5 hover:bg-accent/50 rounded-lg">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>

        <select
          value={step.keyword}
          onChange={(e) => {
            pushUndo(featureId, "Change step keyword");
            onUpdate({ keyword: e.target.value as StepKeyword });
          }}
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

        {/* Toggle data table button */}
        <button
          onClick={hasTable ? removeDataTable : addDataTable}
          className={`shrink-0 p-1 rounded transition-colors cursor-pointer ${
            hasTable
              ? "text-primary hover:text-destructive"
              : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-primary"
          }`}
          title={hasTable ? "Remove data table" : "Add data table"}
        >
          <Table className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onDelete}
          className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Data table */}
      {hasTable && step.dataTable && (
        <div className="ml-8 mr-2 mb-2 mt-0.5">
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                {/* Column header row with remove buttons */}
                <thead>
                  <tr>
                    {step.dataTable[0]?.map((_, ci) => (
                      <th key={ci} className="p-0">
                        <div className="flex items-center justify-center gap-0.5 px-1 py-0.5">
                          <button
                            onClick={() => {
                              if (!step.dataTable) return;
                              onUpdate({
                                dataTable: step.dataTable.map((r) => {
                                  const newRow = [...r];
                                  newRow.splice(ci, 0, "");
                                  return newRow;
                                }),
                              });
                            }}
                            className="text-muted-foreground/40 hover:text-primary transition-colors cursor-pointer p-0.5"
                            title="Insert column before"
                          >
                            <ArrowRight className="w-2.5 h-2.5 rotate-180" />
                          </button>
                          <button
                            onClick={() => removeColumn(ci)}
                            className="text-muted-foreground/40 hover:text-destructive transition-colors cursor-pointer p-0.5"
                            title="Remove column"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                          <button
                            onClick={() => insertColumnAt(ci)}
                            className="text-muted-foreground/40 hover:text-primary transition-colors cursor-pointer p-0.5"
                            title="Insert column after"
                          >
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </th>
                    ))}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {step.dataTable.map((row, ri) => (
                    <tr
                      key={ri}
                      className={`border-b border-border/50 last:border-b-0 group/row ${ri === 0 ? "bg-muted/40 font-semibold" : "hover:bg-muted/20"}`}
                    >
                      {row.map((cell, ci) => (
                        <td key={ci} className="p-0">
                          <input
                            value={cell}
                            onChange={(e) => updateCell(ri, ci, e.target.value)}
                            className="w-full bg-transparent px-2 py-1.5 text-xs outline-none focus:bg-accent/30 min-w-[80px]"
                            placeholder={ri === 0 ? "Header" : "Value"}
                          />
                        </td>
                      ))}
                      <td className="w-16 p-0">
                        <div className="flex items-center">
                          <button
                            onClick={() => insertRowAt(ri)}
                            className="flex items-center justify-center py-1.5 px-1 text-muted-foreground/40 opacity-0 group-hover/row:opacity-100 hover:text-primary transition-all cursor-pointer"
                            title="Insert row below"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => removeRow(ri)}
                            className="flex items-center justify-center py-1.5 px-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-1 px-2 py-1.5 border-t border-border bg-muted/20">
              <button
                onClick={addRow}
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground rounded hover:bg-accent transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Row
              </button>
              <button
                onClick={addColumn}
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground rounded hover:bg-accent transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Column
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const _KEYWORDS = KEYWORDS; // re-export for SortableStepRow
