import type { Command } from "./Command";
import { useDocument } from "@/store/document";
import type { MapProject } from "@/model/types";

export const MAX_HISTORY = 200;

type HistoryState = {
  past: Command[];
  future: Command[];
};

const state: HistoryState = { past: [], future: [] };

function applyToStore(mutate: (project: MapProject) => MapProject): void {
  const current = useDocument.getState().project;
  useDocument.getState().setProject(mutate(current));
}

export function dispatch(command: Command): void {
  applyToStore((p) => command.apply(p));
  state.past.push(command);
  if (state.past.length > MAX_HISTORY) state.past.shift();
  state.future.length = 0;
}

export function undo(): boolean {
  const cmd = state.past.pop();
  if (!cmd) return false;
  applyToStore((p) => cmd.invert(p));
  state.future.push(cmd);
  return true;
}

export function redo(): boolean {
  const cmd = state.future.pop();
  if (!cmd) return false;
  applyToStore((p) => cmd.apply(p));
  state.past.push(cmd);
  return true;
}

export function canUndo(): boolean {
  return state.past.length > 0;
}

export function canRedo(): boolean {
  return state.future.length > 0;
}

export function clearHistory(): void {
  state.past.length = 0;
  state.future.length = 0;
}

export function historyDepth(): { past: number; future: number } {
  return { past: state.past.length, future: state.future.length };
}
