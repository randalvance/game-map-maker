import { useState } from "react";
import { useDocument } from "@/store/document";
import { createNewProject } from "@/model/project";
import { clearHistory } from "@/commands/history";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function NewMapDialog({ open, onClose }: Props) {
  const [width, setWidth] = useState(32);
  const [height, setHeight] = useState(32);
  const [tileSize, setTileSize] = useState(16);

  if (!open) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const { dirty } = useDocument.getState();
    if (dirty) {
      const ok = window.confirm(
        "You have unsaved changes. Create a new map and discard them?",
      );
      if (!ok) return;
    }
    const project = createNewProject(width, height, tileSize);
    useDocument.getState().replaceProject(project);
    clearHistory();
    onClose();
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="modal" onSubmit={handleSubmit}>
        <h2>New map</h2>
        <div className="field-row">
          <NumberField label="Width" value={width} onChange={setWidth} />
          <NumberField label="Height" value={height} onChange={setHeight} />
          <NumberField label="Tile size" value={tileSize} onChange={setTileSize} />
        </div>
        <div className="modal__actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary">
            Create
          </button>
        </div>
      </form>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Math.max(1, Number(e.target.value)))}
      />
    </label>
  );
}
