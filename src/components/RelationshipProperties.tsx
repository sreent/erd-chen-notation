import { useState } from "react";
import { useDiagramStore } from "../store/diagramStore";
import { h3Style, hrStyle, inputStyle, labelStyle } from "./EntityProperties";

export default function RelationshipProperties({
  relationshipId,
}: {
  relationshipId: string;
}) {
  const relationship = useDiagramStore(
    (s) => s.model.relationships[relationshipId],
  );
  const model = useDiagramStore((s) => s.model);
  const renameNode = useDiagramStore((s) => s.renameNode);
  const setRelationshipIdentifying = useDiagramStore(
    (s) => s.setRelationshipIdentifying,
  );
  const addAttributeToRelationship = useDiagramStore(
    (s) => s.addAttributeToRelationship,
  );

  const [newAttrName, setNewAttrName] = useState("");

  if (!relationship) return null;

  const attachedAttributes = Object.values(model.edges)
    .filter((e) => e.kind === "relationshipAttribute" && e.relationshipId === relationshipId)
    .map((e) => model.attributes[(e as { attributeId: string }).attributeId])
    .filter(Boolean);

  const participations = Object.values(model.edges).filter(
    (e) => e.kind === "participation" && e.relationshipId === relationshipId,
  );

  const onAddAttribute = () => {
    const name = newAttrName.trim() || nextAttrName(model.attributes);
    addAttributeToRelationship({ relationshipId, name });
    setNewAttrName("");
  };

  return (
    <div>
      <h3 style={h3Style}>Relationship</h3>
      <label style={labelStyle}>Name</label>
      <input
        style={inputStyle}
        value={relationship.name}
        onChange={(e) =>
          renameNode({ scope: "relationship", id: relationshipId, name: e.target.value })
        }
      />

      <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
        <input
          type="checkbox"
          checked={relationship.identifying}
          onChange={(e) =>
            setRelationshipIdentifying({
              relationshipId,
              identifying: e.target.checked,
            })
          }
        />
        <span style={{ fontSize: 13 }}>Identifying</span>
      </label>

      <hr style={hrStyle} />
      <label style={labelStyle}>Connected entities</label>
      {participations.length === 0 ? (
        <div style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>
          Not connected. A relationship must connect at least two entities.
        </div>
      ) : (
        <ul style={listStyle}>
          {participations.map((p) => {
            if (p.kind !== "participation") return null;
            const e = model.entities[p.entityId];
            return (
              <li key={p.id} style={{ fontSize: 13, padding: "2px 0" }}>
                {e?.name ?? "(missing)"}
              </li>
            );
          })}
        </ul>
      )}

      <hr style={hrStyle} />
      <label style={labelStyle}>Attributes</label>
      <ul style={listStyle}>
        {attachedAttributes.length === 0 && (
          <li style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>
            No attributes yet.
          </li>
        )}
        {attachedAttributes.map((a) => (
          <li key={a.id} style={{ padding: "4px 0", fontSize: 13 }}>
            {a.name}
          </li>
        ))}
      </ul>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <input
          style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
          placeholder="New attribute name"
          value={newAttrName}
          onChange={(e) => setNewAttrName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onAddAttribute();
          }}
        />
        <button style={btnStyle} onClick={onAddAttribute}>
          Add
        </button>
      </div>
    </div>
  );
}

const nextAttrName = (bag: Record<string, { name: string }>): string => {
  const taken = new Set(Object.values(bag).map((n) => n.name));
  let i = 1;
  while (taken.has(`Attribute${i}`)) i++;
  return `Attribute${i}`;
};

const listStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
};
const btnStyle: React.CSSProperties = {
  padding: "6px 12px",
  border: "1px solid #ccc",
  background: "#fff",
  borderRadius: 3,
  cursor: "pointer",
  fontSize: 13,
};
