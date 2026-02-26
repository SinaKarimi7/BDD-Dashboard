import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useAppStore } from "@/store";
import type { Examples } from "@/types";
import { Button, Input } from "@/components/ui";

interface ExamplesEditorProps {
  featureId: string;
  scenarioId: string;
  examples: Examples[];
}

export function ExamplesEditor({
  featureId,
  scenarioId,
  examples,
}: ExamplesEditorProps) {
  const addExamples = useAppStore((s) => s.addExamples);
  const updateExamples = useAppStore((s) => s.updateExamples);
  const deleteExamples = useAppStore((s) => s.deleteExamples);

  const [showAdd, setShowAdd] = useState(false);
  const [newHeaders, setNewHeaders] = useState("");

  const handleAddExamples = () => {
    const headers = newHeaders
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    if (headers.length === 0) return;
    addExamples(featureId, scenarioId, { name: "", headers, rows: [] });
    setNewHeaders("");
    setShowAdd(false);
  };

  const addRow = (exId: string, ex: Examples) => {
    const newRow = ex.headers.map(() => "");
    updateExamples(featureId, scenarioId, exId, {
      rows: [...ex.rows, newRow],
    });
  };

  const updateCell = (
    exId: string,
    ex: Examples,
    rowIdx: number,
    colIdx: number,
    value: string,
  ) => {
    const newRows = ex.rows.map((row, ri) =>
      ri === rowIdx
        ? row.map((cell, ci) => (ci === colIdx ? value : cell))
        : row,
    );
    updateExamples(featureId, scenarioId, exId, { rows: newRows });
  };

  const deleteRow = (exId: string, ex: Examples, rowIdx: number) => {
    updateExamples(featureId, scenarioId, exId, {
      rows: ex.rows.filter((_, i) => i !== rowIdx),
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Examples
        </p>
        <Button size="sm" variant="ghost" onClick={() => setShowAdd(true)}>
          <Plus className="w-3 h-3" />
          Add Examples
        </Button>
      </div>

      {showAdd && (
        <div className="flex items-center gap-2">
          <Input
            placeholder="Headers (comma-separated): username, password, result"
            value={newHeaders}
            onChange={(e) => setNewHeaders(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddExamples()}
            className="text-sm"
          />
          <Button size="sm" onClick={handleAddExamples}>
            Add
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
            Cancel
          </Button>
        </div>
      )}

      {examples.map((ex) => (
        <div key={ex.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {ex.name || "Examples"}
            </span>
            <button
              onClick={() => deleteExamples(featureId, scenarioId, ex.id)}
              className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  {ex.headers.map((h, i) => (
                    <th
                      key={i}
                      className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground border-b border-border"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="w-8 border-b border-border" />
                </tr>
              </thead>
              <tbody>
                {ex.rows.map((row, ri) => (
                  <tr key={ri} className="group hover:bg-accent/30">
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className="px-1 py-0.5 border-b border-border"
                      >
                        <input
                          value={cell}
                          onChange={(e) =>
                            updateCell(ex.id, ex, ri, ci, e.target.value)
                          }
                          className="w-full bg-transparent px-2 py-1 text-sm outline-none focus:bg-background focus:ring-1 focus:ring-ring rounded"
                        />
                      </td>
                    ))}
                    <td className="px-1 py-0.5 border-b border-border">
                      <button
                        onClick={() => deleteRow(ex.id, ex, ri)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all cursor-pointer p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => addRow(ex.id, ex)}
            className="text-xs"
          >
            <Plus className="w-3 h-3" />
            Add Row
          </Button>
        </div>
      ))}
    </div>
  );
}
