import { useEffect, useRef, useState } from "react";
import { useEditor } from "@/store/editor";
import { useDocument } from "@/store/document";
import { getLoadedTileset } from "@/canvas/tilesetTextures";

const THUMB_SCALE = 2;

export function TilePalette({ onLoadTileset }: { onLoadTileset: () => void }) {
  const activeTile = useEditor((s) => s.activeTile);
  const setActiveTile = useEditor((s) => s.setActiveTile);
  const tilesetSrc = useDocument((s) => s.project.tileset.src);
  const [ready, setReady] = useState(() => !!getLoadedTileset());

  useEffect(() => {
    setReady(!!getLoadedTileset());
  }, [tilesetSrc]);

  const loaded = getLoadedTileset();

  if (!ready || !loaded) {
    return (
      <div className="palette palette--empty">
        <p>No tileset loaded.</p>
        <button type="button" className="btn" onClick={onLoadTileset}>
          Load tileset…
        </button>
      </div>
    );
  }

  const cells: JSX.Element[] = [];
  for (let i = 0; i < loaded.tileTextures.length; i++) {
    cells.push(
      <TileThumbnail
        key={i}
        index={i}
        selected={i === activeTile}
        onSelect={() => setActiveTile(i)}
      />,
    );
  }

  return (
    <div className="palette" aria-label="Tile palette">
      <div className="palette__header">
        <span>Tiles</span>
        <button type="button" className="btn btn--small" onClick={onLoadTileset}>
          Load…
        </button>
      </div>
      <div className="palette__grid">{cells}</div>
    </div>
  );
}

function TileThumbnail({
  index,
  selected,
  onSelect,
}: {
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loaded = getLoadedTileset();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loaded) return;
    const image = loaded.source.source.resource as HTMLImageElement | ImageBitmap | undefined;
    if (!image) return;
    const frame = loaded.tileTextures[index]?.frame;
    if (!frame) return;

    const tw = loaded.meta.tileWidth;
    const th = loaded.meta.tileHeight;
    canvas.width = tw * THUMB_SCALE;
    canvas.height = th * THUMB_SCALE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      image as CanvasImageSource,
      frame.x,
      frame.y,
      frame.width,
      frame.height,
      0,
      0,
      tw * THUMB_SCALE,
      th * THUMB_SCALE,
    );
  }, [index, loaded]);

  return (
    <button
      type="button"
      className={`tile-thumb${selected ? " tile-thumb--active" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Tile ${index}`}
    >
      <canvas ref={canvasRef} />
    </button>
  );
}
