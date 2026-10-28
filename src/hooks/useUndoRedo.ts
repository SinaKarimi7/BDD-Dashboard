import { useEffect, useSyncExternalStore, useCallback } from "react";
import { useAppStore } from "@/store";
import type { Feature } from "@/types";

// ─── History Types ──────────────────────────────────────────

interface HistoryEntry {
  featureId: string;
  snapshot: Feature;
  description: string;
  timestamp: number;
}

interface FeatureHistory {
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
}

// ─── Per-feature stacks ─────────────────────────────────────

export const MAX_HISTORY = 50;

// Keyed by featureId so undo never reverts a feature you aren't viewing.
const histories = new Map<string, FeatureHistory>();
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version++;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return version;
}

function getHistory(featureId: string): FeatureHistory {
  let history = histories.get(featureId);
  if (!history) {
    history = { undoStack: [], redoStack: [] };
    histories.set(featureId, history);
  }
  return history;
}

function cloneFeature(featureId: string): Feature | null {
  const feature = useAppStore.getState().getFeature(featureId);
  // Deep-clone the feature so the snapshot is truly immutable
  return feature ? (JSON.parse(JSON.stringify(feature)) as Feature) : null;
}

// ─── Public API ─────────────────────────────────────────────

/** Call BEFORE mutating a feature to save a snapshot for undo. */
export function pushUndo(featureId: string, description: string) {
  const snapshot = cloneFeature(featureId);
  if (!snapshot) return;

  const history = getHistory(featureId);
  history.undoStack.push({
    featureId,
    snapshot,
    description,
    timestamp: Date.now(),
  });
  if (history.undoStack.length > MAX_HISTORY) history.undoStack.shift();

  // Any new action clears the redo stack
  history.redoStack = [];
  notify();
}

export function undo(featureId: string) {
  const history = histories.get(featureId);
  const entry = history?.undoStack.pop();
  if (!history || !entry) return;

  // Save current state to redo stack before restoring
  const current = cloneFeature(featureId);
  if (current) {
    history.redoStack.push({
      featureId,
      snapshot: current,
      description: entry.description,
      timestamp: Date.now(),
    });
  }

  // Restore the snapshot
  useAppStore.getState().updateFeature(featureId, entry.snapshot);
  notify();
}

export function redo(featureId: string) {
  const history = histories.get(featureId);
  const entry = history?.redoStack.pop();
  if (!history || !entry) return;

  // Save current state to undo stack before restoring
  const current = cloneFeature(featureId);
  if (current) {
    history.undoStack.push({
      featureId,
      snapshot: current,
      description: entry.description,
      timestamp: Date.now(),
    });
  }

  // Restore the snapshot
  useAppStore.getState().updateFeature(featureId, entry.snapshot);
  notify();
}

export function canUndo(featureId: string) {
  return (histories.get(featureId)?.undoStack.length ?? 0) > 0;
}

export function canRedo(featureId: string) {
  return (histories.get(featureId)?.redoStack.length ?? 0) > 0;
}

/** Clear one feature's history, or every feature's when no id is given. */
export function clearHistory(featureId?: string) {
  if (featureId) histories.delete(featureId);
  else histories.clear();
  notify();
}

// ─── React Hook ─────────────────────────────────────────────

export function useUndoRedo(featureId?: string) {
  // Subscribe to version changes to trigger re-renders
  useSyncExternalStore(subscribe, getSnapshot);

  const history = featureId ? histories.get(featureId) : undefined;
  const undoStack = history?.undoStack ?? [];
  const redoStack = history?.redoStack ?? [];
  const lastUndoDescription =
    undoStack.length > 0 ? undoStack[undoStack.length - 1].description : null;
  const lastRedoDescription =
    redoStack.length > 0 ? redoStack[redoStack.length - 1].description : null;

  const handlePushUndo = useCallback(
    (description: string) => {
      if (featureId) pushUndo(featureId, description);
    },
    [featureId],
  );

  const handleUndo = useCallback(() => {
    if (featureId) undo(featureId);
  }, [featureId]);

  const handleRedo = useCallback(() => {
    if (featureId) redo(featureId);
  }, [featureId]);

  const handleClearHistory = useCallback(() => {
    if (featureId) clearHistory(featureId);
  }, [featureId]);

  // Global keyboard shortcut, acting on the feature this hook is mounted for
  useEffect(() => {
    if (!featureId) return;
    const handler = (e: KeyboardEvent) => {
      // Skip when focus is in text inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo(featureId);
      } else if (
        isCtrlOrCmd &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        redo(featureId);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [featureId]);

  return {
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undo: handleUndo,
    redo: handleRedo,
    pushUndo: handlePushUndo,
    lastUndoDescription,
    lastRedoDescription,
    clearHistory: handleClearHistory,
  };
}
