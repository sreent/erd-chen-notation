import { useDiagramStore } from "../store/diagramStore";
import EntityProperties from "./EntityProperties";
import RelationshipProperties from "./RelationshipProperties";
import AttributeProperties from "./AttributeProperties";
import ParticipationProperties from "./ParticipationProperties";

export default function PropertiesPanel() {
  const selection = useDiagramStore((s) => s.selection);
  const model = useDiagramStore((s) => s.model);

  if (!selection)
    return (
      <aside style={asideStyle}>
        <div style={emptyStyle}>Select a node or edge to edit its properties.</div>
      </aside>
    );

  const entity = model.entities[selection];
  const relationship = model.relationships[selection];
  const attribute = model.attributes[selection];
  const edge = model.edges[selection];

  return (
    <aside style={asideStyle}>
      {entity && <EntityProperties entityId={entity.id} />}
      {relationship && <RelationshipProperties relationshipId={relationship.id} />}
      {attribute && <AttributeProperties attributeId={attribute.id} />}
      {edge && edge.kind === "participation" && (
        <ParticipationProperties edgeId={edge.id} />
      )}
      {edge && edge.kind !== "participation" && (
        <div style={emptyStyle}>Attribute connection — no editable properties.</div>
      )}
    </aside>
  );
}

const asideStyle: React.CSSProperties = {
  width: 280,
  borderLeft: "1px solid #ddd",
  background: "#fafafa",
  padding: 16,
  overflowY: "auto",
};

const emptyStyle: React.CSSProperties = {
  color: "#888",
  fontSize: 13,
};
