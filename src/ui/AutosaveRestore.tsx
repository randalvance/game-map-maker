import { useEffect, useState } from "react";
import { useDocument } from "@/store/document";
import { clearAutosave, loadAutosavedText } from "@/persistence/autosave";
import { deserializeProject } from "@/persistence/serialize";
import { clearHistory } from "@/commands/history";

type RestoreDecision = "pending" | "decided";

export function AutosaveRestore({
  children,
}: {
  children: React.ReactNode;
}) {
  const [decision, setDecision] = useState<RestoreDecision>("pending");
  const [error, setError] = useState<string | null>(null);
  const [hasAutosave, setHasAutosave] = useState(false);

  useEffect(() => {
    const text = loadAutosavedText();
    if (!text) {
      setDecision("decided");
      return;
    }
    try {
      // eager validate so we don't prompt on corrupt blobs
      deserializeProject(text);
      setHasAutosave(true);
    } catch (e) {
      setError((e as Error).message);
      clearAutosave();
      setDecision("decided");
    }
  }, []);

  if (decision === "decided" || !hasAutosave) {
    return (
      <>
        {error && (
          <div className="toast" role="status">
            Autosave was discarded: {error}
          </div>
        )}
        {children}
      </>
    );
  }

  const handleRestore = () => {
    const text = loadAutosavedText();
    if (!text) {
      setDecision("decided");
      return;
    }
    try {
      const project = deserializeProject(text);
      useDocument.getState().replaceProject(project);
      clearHistory();
    } catch (e) {
      setError((e as Error).message);
      clearAutosave();
    }
    setDecision("decided");
  };

  const handleStartFresh = () => {
    clearAutosave();
    setDecision("decided");
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>Restore previous session?</h2>
        <p>
          We found a map you were editing. Would you like to restore it, or discard
          it and start with a blank map?
        </p>
        <div className="modal__actions">
          <button type="button" className="btn" onClick={handleStartFresh}>
            Start fresh
          </button>
          <button type="button" className="btn btn--primary" onClick={handleRestore}>
            Restore
          </button>
        </div>
      </div>
    </div>
  );
}
