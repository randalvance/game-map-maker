import { useDocument } from "@/store/document";
import { useEditor } from "@/store/editor";

export function LayerPanel() {
  const layers = useDocument((s) => s.project.layers);
  const activeLayerId = useEditor((s) => s.activeLayerId);
  const setActiveLayer = useEditor((s) => s.setActiveLayer);

  const toggleVisible = (layerId: string, next: boolean) => {
    useDocument.getState().updateLayer(layerId, (layer) => ({ ...layer, visible: next }));
  };

  const ordered = [...layers].reverse(); // render topmost first

  return (
    <div className="panel">
      <div className="panel__header">Layers</div>
      <ul className="layer-list">
        {ordered.map((layer) => {
          const isActive = layer.id === activeLayerId;
          return (
            <li key={layer.id} className={`layer-item${isActive ? " layer-item--active" : ""}`}>
              <button
                type="button"
                className="layer-item__visibility"
                onClick={() => toggleVisible(layer.id, !layer.visible)}
                aria-pressed={layer.visible}
                aria-label={`Toggle ${layer.name} visibility`}
              >
                {layer.visible ? "●" : "○"}
              </button>
              <button
                type="button"
                className="layer-item__name"
                onClick={() => setActiveLayer(layer.id)}
              >
                {layer.name}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
