import { useRef, useState } from "react";
import { loadTilesetFromBlob } from "@/tileset/loadTileset";
import { setLoadedTileset } from "@/canvas/tilesetTextures";
import { useDocument } from "@/store/document";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function LoadTilesetDialog({ open, onClose }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [tileWidth, setTileWidth] = useState(16);
  const [tileHeight, setTileHeight] = useState(16);
  const [margin, setMargin] = useState(0);
  const [spacing, setSpacing] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!file) {
      setError("Pick a PNG file first.");
      return;
    }
    setBusy(true);
    try {
      const loaded = await loadTilesetFromBlob(file, {
        tileWidth,
        tileHeight,
        margin,
        spacing,
      });
      setLoadedTileset(loaded);
      const project = useDocument.getState().project;
      useDocument.getState().setProject({
        ...project,
        tileSize: tileWidth,
        tileset: loaded.meta,
      });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="modal" onSubmit={handleSubmit}>
        <h2>Load tileset</h2>

        <div className="field">
          <label htmlFor="tileset-file">Image (.png)</label>
          <input
            ref={fileInputRef}
            id="tileset-file"
            type="file"
            accept="image/png"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="field-row">
          <NumberField label="Tile width" value={tileWidth} onChange={setTileWidth} />
          <NumberField label="Tile height" value={tileHeight} onChange={setTileHeight} />
        </div>
        <div className="field-row">
          <NumberField label="Margin" value={margin} onChange={setMargin} min={0} />
          <NumberField label="Spacing" value={spacing} onChange={setSpacing} min={0} />
        </div>

        {error && <p className="error">{error}</p>}

        <div className="modal__actions">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? "Loading…" : "Load"}
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
  min = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value)))}
      />
    </label>
  );
}
