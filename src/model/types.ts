export type NodeId = string;

export type Participation = "mandatory" | "optional" | "unspecified";
export type Cardinality = "one" | "many" | "unspecified";

export interface Entity {
  id: NodeId;
  name: string;
  weak: boolean;
  position: { x: number; y: number };
}

export interface Relationship {
  id: NodeId;
  name: string;
  identifying: boolean;
  position: { x: number; y: number };
}

export interface Attribute {
  id: NodeId;
  name: string;
  unique: boolean;
  position: { x: number; y: number };
}

export interface ParticipationEdge {
  id: NodeId;
  kind: "participation";
  entityId: NodeId;
  relationshipId: NodeId;
  participation: Participation;
  cardinality: Cardinality;
  role: string;
}

export interface EntityAttributeEdge {
  id: NodeId;
  kind: "entityAttribute";
  entityId: NodeId;
  attributeId: NodeId;
}

export interface RelationshipAttributeEdge {
  id: NodeId;
  kind: "relationshipAttribute";
  relationshipId: NodeId;
  attributeId: NodeId;
}

export type Edge =
  | ParticipationEdge
  | EntityAttributeEdge
  | RelationshipAttributeEdge;

export interface ERDModel {
  entities: Record<NodeId, Entity>;
  relationships: Record<NodeId, Relationship>;
  attributes: Record<NodeId, Attribute>;
  edges: Record<NodeId, Edge>;
}

export const emptyModel = (): ERDModel => ({
  entities: {},
  relationships: {},
  attributes: {},
  edges: {},
});

export const cardinalityLabel = (
  participation: Participation,
  cardinality: Cardinality,
): string | null => {
  if (participation === "unspecified" || cardinality === "unspecified") return null;
  const min = participation === "mandatory" ? 1 : 0;
  const max = cardinality === "many" ? "N" : 1;
  return `(${min},${max})`;
};
