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

// ─── Global stacks ──────────────────────────────────────────

const MAX_HISTORY = 50;

let undoStack: HistoryEntry[] = [];
let redoStack: HistoryEntry[] = [];
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

// ─── Public API ─────────────────────────────────────────────

/** Call BEFORE mutating a feature to save a snapshot for undo. */
export function pushUndo(featureId: string, description: string) {
  const feature = useAppStore.getState().getFeature(featureId);
  if (!feature) return;

  // Deep-clone the feature so the snapshot is truly immutable
  const snapshot = JSON.parse(JSON.stringify(feature)) as Feature;

  undoStack.push({ featureId, snapshot, description, timestamp: Date.now() });
  if (undoStack.length > MAX_HISTORY) undoStack.shift();

  // Any new action clears the redo stack
  redoStack = [];
  notify();
}

export function undo() {
  const entry = undoStack.pop();
  if (!entry) return;

  // Save current state to redo stack before restoring
  const current = useAppStore.getState().getFeature(entry.featureId);
  if (current) {
    redoStack.push({
      featureId: entry.featureId,
      snapshot: JSON.parse(JSON.stringify(current)) as Feature,
      description: entry.description,
      timestamp: Date.now(),
    });
  }

  // Restore the snapshot
  useAppStore.getState().updateFeature(entry.featureId, entry.snapshot);
  notify();
}

export function redo() {
  const entry = redoStack.pop();
  if (!entry) return;

  // Save current state to undo stack before restoring
  const current = useAppStore.getState().getFeature(entry.featureId);
  if (current) {
    undoStack.push({
      featureId: entry.featureId,
      snapshot: JSON.parse(JSON.stringify(current)) as Feature,
      description: entry.description,
      timestamp: Date.now(),
    });
  }

  // Restore the snapshot
  useAppStore.getState().updateFeature(entry.featureId, entry.snapshot);
  notify();
}

export function clearHistory() {
  undoStack = [];
  redoStack = [];
  notify();
}

// ─── React Hook ─────────────────────────────────────────────

export function useUndoRedo(featureId?: string) {
  // Subscribe to version changes to trigger re-renders
  useSyncExternalStore(subscribe, getSnapshot);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  const lastUndoDescription = canUndo
    ? undoStack[undoStack.length - 1].description
    : null;
  const lastRedoDescription = canRedo
    ? redoStack[redoStack.length - 1].description
    : null;

  const handlePushUndo = useCallback(
    (description: string) => {
      if (featureId) pushUndo(featureId, description);
    },
    [featureId],
  );

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip when focus is in text inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        isCtrlOrCmd &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return {
    canUndo,
    canRedo,
    undo,
    redo,
    pushUndo: handlePushUndo,
    lastUndoDescription,
    lastRedoDescription,
    clearHistory,
  };
}
