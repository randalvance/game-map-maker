import { useState } from "react";
import {
  extractProjectId,
  fetchProjectJson,
} from "@/storage/blobClient";
import { CloudStorageError } from "@/storage/types";
import { deserializeProject } from "@/persistence/serialize";
import { useDocument } from "@/store/document";
import { clearHistory } from "@/commands/history";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function OpenFromCloudDialog({ open, onClose }: Props) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const id = extractProjectId(input);
    if (!id) {
      setError(
        "Enter a project ID (UUID) or a project URL ending in /projects/<id>.json.",
      );
      return;
    }

    if (useDocument.getState().dirty) {
      const ok = window.confirm(
        "You have unsaved changes. Discard them and open the cloud project?",
      );
      if (!ok) return;
    }

    setBusy(true);
    try {
      const text = await fetchProjectJson(input);
      const project = deserializeProject(text);
      // Ensure the loaded project remembers where it came from so the next
      // Save-to-Cloud overwrites the same blob rather than minting a new one.
      useDocument.getState().replaceProject({ ...project, projectId: id });
      clearHistory();
      setInput("");
      onClose();
    } catch (e) {
      if (e instanceof CloudStorageError) {
        setError(messageForError(e));
      } else {
        setError((e as Error).message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="modal" onSubmit={handleSubmit}>
        <h2>Open from cloud</h2>

        <div className="field">
          <label htmlFor="cloud-id">Project ID or URL</label>
          <input
            id="cloud-id"
            type="text"
            autoFocus
            placeholder="8e6f9c5a-1b2c-4d5e-9f0a-…  or  https://…/projects/<id>.json"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>

        {error && <p className="error">{error}</p>}

        <div className="modal__actions">
          <button
            type="button"
            className="btn"
            onClick={() => {
              setInput("");
              setError(null);
              onClose();
            }}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={busy || input.trim() === ""}
          >
            {busy ? "Opening…" : "Open"}
          </button>
        </div>
      </form>
    </div>
  );
}

function messageForError(err: CloudStorageError): string {
  switch (err.kind) {
    case "not-configured":
      return "Cloud storage isn't configured for this deployment.";
    case "not-found":
      return "No project found with that ID.";
    case "forbidden-key":
      return err.message;
    case "network":
      return `Network error: ${err.message}. Check your connection and retry.`;
    case "too-large":
      return `That project is too large to load: ${err.message}`;
    case "unknown":
    default:
      return `Could not open project: ${err.message}`;
  }
}
