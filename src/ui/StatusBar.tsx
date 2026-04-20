import { useDocument } from "@/store/document";
import { useEditor } from "@/store/editor";

export function StatusBar() {
  const hovered = useEditor((s) => s.hoveredCell);
  const zoom = useEditor((s) => s.zoom);
  const dirty = useDocument((s) => s.dirty);
  const tool = useEditor((s) => s.tool);

  const cellLabel = hovered ? `(${hovered.x}, ${hovered.y})` : "(—, —)";
  const zoomLabel = `${Math.round(zoom * 100)}%`;

  return (
    <div className="statusbar">
      <span className="statusbar__cell">Cell {cellLabel}</span>
      <span className="statusbar__tool">Tool: {tool}</span>
      <span className="statusbar__zoom">Zoom {zoomLabel}</span>
      <span className={`statusbar__dirty${dirty ? " statusbar__dirty--on" : ""}`}>
        {dirty ? "● Unsaved" : "Saved"}
      </span>
    </div>
  );
}
