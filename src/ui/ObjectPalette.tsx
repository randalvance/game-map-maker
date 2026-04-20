import { useEditor } from "@/store/editor";
import { listObjectTypes } from "@/objects/registry";

export function ObjectPalette() {
  const tool = useEditor((s) => s.tool);
  const activeObjectType = useEditor((s) => s.activeObjectType);
  const setTool = useEditor((s) => s.setTool);
  const setActiveObjectType = useEditor((s) => s.setActiveObjectType);

  return (
    <div className="palette">
      <div className="palette__header">
        <span>Objects</span>
      </div>
      <ul className="object-list">
        {listObjectTypes().map((def) => {
          const selected = tool === "place" && activeObjectType === def.type;
          return (
            <li key={def.type}>
              <button
                type="button"
                className={`object-button${selected ? " object-button--active" : ""}`}
                onClick={() => {
                  setActiveObjectType(def.type);
                  setTool("place");
                }}
              >
                <span
                  className="object-glyph"
                  style={{ backgroundColor: def.color }}
                  aria-hidden="true"
                >
                  {def.glyph}
                </span>
                <span>{def.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
