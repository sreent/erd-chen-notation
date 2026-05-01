import { useState } from "react";
import { useDiagramStore } from "../store/diagramStore";

export default function EntityProperties({ entityId }: { entityId: string }) {
  const entity = useDiagramStore((s) => s.model.entities[entityId]);
  const renameNode = useDiagramStore((s) => s.renameNode);
  const setEntityWeak = useDiagramStore((s) => s.setEntityWeak);
  const addAttributeToEntity = useDiagramStore((s) => s.addAttributeToEntity);
  const model = useDiagramStore((s) => s.model);

  const [newAttrName, setNewAttrName] = useState("");

  if (!entity) return null;

  const attachedAttributes = Object.values(model.edges)
    .filter((e) => e.kind === "entityAttribute" && e.entityId === entityId)
    .map((e) => model.attributes[(e as { attributeId: string }).attributeId])
    .filter(Boolean);

  const onAddAttribute = () => {
    const name = newAttrName.trim() || nextAttrName(model.attributes);
    addAttributeToEntity({ entityId, name });
    setNewAttrName("");
  };

  return (
    <div>
      <h3 style={h3Style}>Entity</h3>
      <label style={labelStyle}>Name</label>
      <input
        style={inputStyle}
        value={entity.name}
        onChange={(e) => renameNode({ scope: "entity", id: entityId, name: e.target.value })}
      />

      <label style={labelStyle}>Type</label>
      <div>
        <RadioRow
          checked={!entity.weak}
          label="Regular"
          onChange={() => setEntityWeak({ entityId, weak: false })}
        />
        <RadioRow
          checked={entity.weak}
          label="Weak"
          onChange={() => setEntityWeak({ entityId, weak: true })}
        />
      </div>

      <hr style={hrStyle} />
      <label style={labelStyle}>Attributes</label>
      <ul style={listStyle}>
        {attachedAttributes.length === 0 && (
          <li style={mutedStyle}>No attributes yet.</li>
        )}
        {attachedAttributes.map((a) => (
          <li key={a.id} style={listItemStyle}>
            <span style={a.unique ? { textDecoration: "underline", textDecorationStyle: entity.weak ? "dashed" : "solid" } : {}}>
              {a.name}
            </span>
            {a.unique && (
              <span style={{ marginLeft: 6, fontSize: 11, color: "#888" }}>
                {entity.weak ? "(partial key)" : "(unique)"}
              </span>
            )}
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

function RadioRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
      <input type="radio" checked={checked} onChange={onChange} />
      <span style={{ fontSize: 13 }}>{label}</span>
    </label>
  );
}

const nextAttrName = (bag: Record<string, { name: string }>): string => {
  const taken = new Set(Object.values(bag).map((n) => n.name));
  let i = 1;
  while (taken.has(`Attribute${i}`)) i++;
  return `Attribute${i}`;
};

export const h3Style: React.CSSProperties = {
  margin: "0 0 12px",
  fontSize: 14,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  color: "#444",
};
export const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#666",
  marginBottom: 4,
  marginTop: 8,
  textTransform: "uppercase",
  letterSpacing: 0.5,
};
export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  border: "1px solid #ccc",
  borderRadius: 3,
  fontSize: 13,
  marginBottom: 4,
  boxSizing: "border-box",
};
export const hrStyle: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid #ddd",
  margin: "16px 0 8px",
};
const listStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
};
const listItemStyle: React.CSSProperties = {
  padding: "4px 0",
  fontSize: 13,
};
const mutedStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#888",
  fontStyle: "italic",
};
const btnStyle: React.CSSProperties = {
  padding: "6px 12px",
  border: "1px solid #ccc",
  background: "#fff",
  borderRadius: 3,
  cursor: "pointer",
  fontSize: 13,
};
