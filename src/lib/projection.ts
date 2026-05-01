import type { Edge as RFEdge, Node as RFNode } from "@xyflow/react";
import { cardinalityLabel, ERDModel } from "../model/types";

export interface EntityNodeData extends Record<string, unknown> {
  kind: "entity";
  name: string;
  weak: boolean;
}
export interface RelationshipNodeData extends Record<string, unknown> {
  kind: "relationship";
  name: string;
  identifying: boolean;
}
export interface AttributeNodeData extends Record<string, unknown> {
  kind: "attribute";
  name: string;
  unique: boolean;
  ownerWeak: boolean;
}
export type ChenNodeData =
  | EntityNodeData
  | RelationshipNodeData
  | AttributeNodeData;

export interface ChenEdgeData extends Record<string, unknown> {
  label?: string;
  role?: string;
}

export const projectModel = (
  model: ERDModel,
): { nodes: RFNode<ChenNodeData>[]; edges: RFEdge<ChenEdgeData>[] } => {
  const nodes: RFNode<ChenNodeData>[] = [];
  const edges: RFEdge<ChenEdgeData>[] = [];

  for (const e of Object.values(model.entities)) {
    nodes.push({
      id: e.id,
      type: "entity",
      position: e.position,
      data: { kind: "entity", name: e.name, weak: e.weak },
    });
  }
  for (const r of Object.values(model.relationships)) {
    nodes.push({
      id: r.id,
      type: "relationship",
      position: r.position,
      data: { kind: "relationship", name: r.name, identifying: r.identifying },
    });
  }
  const attributeOwnerWeak = (attributeId: string): boolean => {
    const ownerEdge = Object.values(model.edges).find(
      (e) => e.kind === "entityAttribute" && e.attributeId === attributeId,
    );
    if (!ownerEdge || ownerEdge.kind !== "entityAttribute") return false;
    return model.entities[ownerEdge.entityId]?.weak ?? false;
  };
  for (const a of Object.values(model.attributes)) {
    nodes.push({
      id: a.id,
      type: "attribute",
      position: a.position,
      data: {
        kind: "attribute",
        name: a.name,
        unique: a.unique,
        ownerWeak: attributeOwnerWeak(a.id),
      },
    });
  }

  for (const edge of Object.values(model.edges)) {
    if (edge.kind === "participation") {
      const label = cardinalityLabel(edge.participation, edge.cardinality);
      edges.push({
        id: edge.id,
        type: "chen",
        source: edge.entityId,
        target: edge.relationshipId,
        data: {
          label: label ?? undefined,
          role: edge.role || undefined,
        },
      });
    } else if (edge.kind === "entityAttribute") {
      edges.push({
        id: edge.id,
        type: "chen",
        source: edge.entityId,
        target: edge.attributeId,
        data: {},
      });
    } else if (edge.kind === "relationshipAttribute") {
      edges.push({
        id: edge.id,
        type: "chen",
        source: edge.relationshipId,
        target: edge.attributeId,
        data: {},
      });
    }
  }

  return { nodes, edges };
};
