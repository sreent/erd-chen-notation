export type NodeId = string;

export type Cardinality =
  | { kind: "one" }
  | { kind: "many"; symbol: "N" | "M" }
  | { kind: "minMax"; min: number; max: number | "N" };

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

export type AttributeFlag = "key" | "partialKey" | "derived" | "multivalued";

export interface Attribute {
  id: NodeId;
  name: string;
  flags: ReadonlySet<AttributeFlag>;
  position: { x: number; y: number };
}

export interface ParticipationEdge {
  id: NodeId;
  kind: "participation";
  entityId: NodeId;
  relationshipId: NodeId;
  cardinality: Cardinality;
  total: boolean;
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
