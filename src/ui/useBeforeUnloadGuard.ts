import { useEffect } from "react";
import { useDocument } from "@/store/document";

export function useBeforeUnloadGuard(): void {
  useEffect(() => {
    let installed = false;
    let handler: ((event: BeforeUnloadEvent) => void) | null = null;

    const ensureInstalled = (dirty: boolean) => {
      if (dirty && !installed) {
        handler = (event: BeforeUnloadEvent) => {
          event.preventDefault();
          event.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        installed = true;
      } else if (!dirty && installed && handler) {
        window.removeEventListener("beforeunload", handler);
        handler = null;
        installed = false;
      }
    };

    ensureInstalled(useDocument.getState().dirty);
    const unsub = useDocument.subscribe((state) => ensureInstalled(state.dirty));

    return () => {
      unsub();
      if (handler) window.removeEventListener("beforeunload", handler);
    };
  }, []);
}
