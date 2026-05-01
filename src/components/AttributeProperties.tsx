import { useDiagramStore } from "../store/diagramStore";
import { h3Style, inputStyle, labelStyle } from "./EntityProperties";

export default function AttributeProperties({ attributeId }: { attributeId: string }) {
  const attribute = useDiagramStore((s) => s.model.attributes[attributeId]);
  const model = useDiagramStore((s) => s.model);
  const renameNode = useDiagramStore((s) => s.renameNode);
  const setAttributeUnique = useDiagramStore((s) => s.setAttributeUnique);

  if (!attribute) return null;

  const ownerEdge = Object.values(model.edges).find(
    (e) =>
      (e.kind === "entityAttribute" || e.kind === "relationshipAttribute") &&
      e.attributeId === attributeId,
  );
  const ownerType = ownerEdge?.kind ?? null;
  const ownerWeak =
    ownerEdge?.kind === "entityAttribute" &&
    model.entities[ownerEdge.entityId]?.weak === true;

  return (
    <div>
      <h3 style={h3Style}>Attribute</h3>
      <label style={labelStyle}>Name</label>
      <input
        style={inputStyle}
        value={attribute.name}
        onChange={(e) =>
          renameNode({ scope: "attribute", id: attributeId, name: e.target.value })
        }
      />

      <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
        <input
          type="checkbox"
          checked={attribute.unique}
          disabled={ownerType === "relationshipAttribute"}
          onChange={(e) =>
            setAttributeUnique({ attributeId, unique: e.target.checked })
          }
        />
        <span style={{ fontSize: 13 }}>
          Unique{" "}
          {attribute.unique && (
            <span style={{ fontSize: 11, color: "#888" }}>
              ({ownerWeak ? "partial key — dashed underline" : "full key — solid underline"})
            </span>
          )}
        </span>
      </label>
      {ownerType === "relationshipAttribute" && (
        <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
          Relationship attributes cannot be unique.
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 12, color: "#666" }}>
        {ownerType === "entityAttribute" && "Attached to an entity."}
        {ownerType === "relationshipAttribute" && "Attached to a relationship."}
        {ownerType === null && (
          <span style={{ color: "#c00" }}>
            Not connected. Use Connect mode to attach to an entity or relationship.
          </span>
        )}
      </div>
    </div>
  );
}
