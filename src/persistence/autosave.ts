import { useDocument } from "@/store/document";
import { AUTOSAVE_KEY, serializeProject } from "./serialize";

export const AUTOSAVE_DEBOUNCE_MS = 1000;

export function loadAutosavedText(): string | null {
  try {
    return window.localStorage.getItem(AUTOSAVE_KEY);
  } catch {
    return null;
  }
}

export function clearAutosave(): void {
  try {
    window.localStorage.removeItem(AUTOSAVE_KEY);
  } catch {
    // ignore — storage unavailable
  }
}

export function installAutosave(debounceMs = AUTOSAVE_DEBOUNCE_MS): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    const project = useDocument.getState().project;
    try {
      window.localStorage.setItem(AUTOSAVE_KEY, serializeProject(project));
    } catch {
      // storage full or unavailable; swallow — autosave is best-effort
    }
  };

  const unsubscribe = useDocument.subscribe((state, prev) => {
    if (state.project === prev.project) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, debounceMs);
  });

  return () => {
    if (timer) clearTimeout(timer);
    unsubscribe();
  };
}
