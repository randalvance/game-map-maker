import { useDocument } from "@/store/document";
import { useEditor } from "@/store/editor";
import { dispatch } from "@/commands/history";
import { UpdateEntityPropertiesCommand } from "@/commands/entities";
import { getObjectType } from "@/objects/registry";
import type { ObjectPropertyValue } from "@/model/types";

export function PropertyPanel() {
  const selectedId = useEditor((s) => s.selectedEntityId);
  const entities = useDocument((s) => s.project.entities);

  if (!selectedId) {
    return (
      <div className="panel">
        <div className="panel__header">Properties</div>
        <p className="panel__empty">Select an object to edit its properties.</p>
      </div>
    );
  }

  const entity = entities.find((e) => e.id === selectedId);
  if (!entity) {
    return (
      <div className="panel">
        <div className="panel__header">Properties</div>
        <p className="panel__empty">Selection not found.</p>
      </div>
    );
  }

  const def = getObjectType(entity.type);

  const commit = (key: string, next: ObjectPropertyValue) => {
    const prev = { ...entity.properties };
    const nextProps = { ...prev, [key]: next };
    dispatch(new UpdateEntityPropertiesCommand(entity.id, prev, nextProps));
  };

  return (
    <div className="panel">
      <div className="panel__header">{def?.label ?? entity.type}</div>
      <dl className="props">
        <div>
          <dt>Position</dt>
          <dd>
            ({entity.x}, {entity.y})
          </dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{entity.type}</dd>
        </div>
      </dl>

      {def?.properties.map((schema) => {
        const value = entity.properties[schema.key] ?? schema.default;
        return (
          <label key={schema.key} className="field">
            <span>{schema.label}</span>
            {schema.type === "string" && (
              <input
                type="text"
                value={String(value)}
                onChange={(e) => commit(schema.key, e.target.value)}
              />
            )}
            {schema.type === "number" && (
              <input
                type="number"
                value={Number(value)}
                onChange={(e) => commit(schema.key, Number(e.target.value))}
              />
            )}
            {schema.type === "boolean" && (
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => commit(schema.key, e.target.checked)}
              />
            )}
          </label>
        );
      })}
    </div>
  );
}
