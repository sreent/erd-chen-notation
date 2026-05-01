import {
  Attribute,
  Cardinality,
  Edge,
  Entity,
  ERDModel,
  NodeId,
  Participation,
  Relationship,
} from "./types";
import { ValidationError } from "./validation";

export type ActionResult =
  | { ok: true; model: ERDModel }
  | { ok: false; error: ValidationError };

const fail = (error: ValidationError): ActionResult => ({ ok: false, error });
const ok = (model: ERDModel): ActionResult => ({ ok: true, model });

const newId = (): NodeId =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;

const nameTaken = (
  model: ERDModel,
  scope: "entity" | "relationship" | "attribute",
  name: string,
  exceptId?: NodeId,
): boolean => {
  const bag =
    scope === "entity"
      ? model.entities
      : scope === "relationship"
      ? model.relationships
      : model.attributes;
  return Object.values(bag).some(
    (n) => n.id !== exceptId && n.name.trim() === name.trim(),
  );
};

export const addEntity = (
  model: ERDModel,
  input: { name: string; weak?: boolean; position?: { x: number; y: number } },
): ActionResult => {
  const name = input.name.trim();
  if (!name) return fail({ code: "EMPTY_NAME", scope: "entity" });
  if (nameTaken(model, "entity", name))
    return fail({ code: "DUPLICATE_NAME", scope: "entity", name });
  const e: Entity = {
    id: newId(),
    name,
    weak: input.weak ?? false,
    position: input.position ?? { x: 0, y: 0 },
  };
  return ok({ ...model, entities: { ...model.entities, [e.id]: e } });
};

export const addRelationship = (
  model: ERDModel,
  input: {
    name: string;
    identifying?: boolean;
    position?: { x: number; y: number };
  },
): ActionResult => {
  const name = input.name.trim();
  if (!name) return fail({ code: "EMPTY_NAME", scope: "relationship" });
  if (nameTaken(model, "relationship", name))
    return fail({ code: "DUPLICATE_NAME", scope: "relationship", name });
  const r: Relationship = {
    id: newId(),
    name,
    identifying: input.identifying ?? false,
    position: input.position ?? { x: 0, y: 0 },
  };
  return ok({
    ...model,
    relationships: { ...model.relationships, [r.id]: r },
  });
};

export const addAttribute = (
  model: ERDModel,
  input: {
    name: string;
    unique?: boolean;
    position?: { x: number; y: number };
  },
): ActionResult => {
  const name = input.name.trim();
  if (!name) return fail({ code: "EMPTY_NAME", scope: "attribute" });
  if (nameTaken(model, "attribute", name))
    return fail({ code: "DUPLICATE_NAME", scope: "attribute", name });
  const a: Attribute = {
    id: newId(),
    name,
    unique: input.unique ?? false,
    position: input.position ?? { x: 0, y: 0 },
  };
  return ok({ ...model, attributes: { ...model.attributes, [a.id]: a } });
};

const edgeExists = (model: ERDModel, predicate: (e: Edge) => boolean): boolean =>
  Object.values(model.edges).some(predicate);

const attributeAlreadyOwned = (model: ERDModel, attributeId: NodeId): boolean =>
  edgeExists(
    model,
    (e) =>
      (e.kind === "entityAttribute" || e.kind === "relationshipAttribute") &&
      e.attributeId === attributeId,
  );

export const connectEntityToRelationship = (
  model: ERDModel,
  input: {
    entityId: NodeId;
    relationshipId: NodeId;
    participation?: Participation;
    cardinality?: Cardinality;
    role?: string;
  },
): ActionResult => {
  if (!model.entities[input.entityId])
    return fail({ code: "UNKNOWN_NODE", id: input.entityId });
  if (!model.relationships[input.relationshipId])
    return fail({ code: "UNKNOWN_NODE", id: input.relationshipId });
  const edge: Edge = {
    id: newId(),
    kind: "participation",
    entityId: input.entityId,
    relationshipId: input.relationshipId,
    participation: input.participation ?? "unspecified",
    cardinality: input.cardinality ?? "unspecified",
    role: input.role ?? "",
  };
  return ok({ ...model, edges: { ...model.edges, [edge.id]: edge } });
};

export const attachAttributeToEntity = (
  model: ERDModel,
  input: { entityId: NodeId; attributeId: NodeId },
): ActionResult => {
  if (!model.entities[input.entityId])
    return fail({ code: "UNKNOWN_NODE", id: input.entityId });
  const attr = model.attributes[input.attributeId];
  if (!attr) return fail({ code: "UNKNOWN_NODE", id: input.attributeId });
  if (attributeAlreadyOwned(model, input.attributeId))
    return fail({
      code: "ATTRIBUTE_HAS_MULTIPLE_OWNERS",
      attributeId: input.attributeId,
    });
  if (attr.unique) {
    const existingUnique = Object.values(model.edges).some(
      (e) =>
        e.kind === "entityAttribute" &&
        e.entityId === input.entityId &&
        model.attributes[e.attributeId]?.unique,
    );
    if (existingUnique)
      return fail({ code: "MULTIPLE_UNIQUE", entityId: input.entityId });
  }
  const edge: Edge = {
    id: newId(),
    kind: "entityAttribute",
    entityId: input.entityId,
    attributeId: input.attributeId,
  };
  return ok({ ...model, edges: { ...model.edges, [edge.id]: edge } });
};

export const attachAttributeToRelationship = (
  model: ERDModel,
  input: { relationshipId: NodeId; attributeId: NodeId },
): ActionResult => {
  if (!model.relationships[input.relationshipId])
    return fail({ code: "UNKNOWN_NODE", id: input.relationshipId });
  const attr = model.attributes[input.attributeId];
  if (!attr) return fail({ code: "UNKNOWN_NODE", id: input.attributeId });
  if (attr.unique)
    return fail({
      code: "ILLEGAL_EDGE",
      reason: "unique attribute can only attach to an entity",
    });
  if (attributeAlreadyOwned(model, input.attributeId))
    return fail({
      code: "ATTRIBUTE_HAS_MULTIPLE_OWNERS",
      attributeId: input.attributeId,
    });
  const edge: Edge = {
    id: newId(),
    kind: "relationshipAttribute",
    relationshipId: input.relationshipId,
    attributeId: input.attributeId,
  };
  return ok({ ...model, edges: { ...model.edges, [edge.id]: edge } });
};

export const setParticipation = (
  model: ERDModel,
  input: { edgeId: NodeId; participation: Participation },
): ActionResult => {
  const edge = model.edges[input.edgeId];
  if (!edge) return fail({ code: "UNKNOWN_NODE", id: input.edgeId });
  if (edge.kind !== "participation")
    return fail({
      code: "ILLEGAL_EDGE",
      reason: "participation only applies to entity-relationship edges",
    });
  return ok({
    ...model,
    edges: {
      ...model.edges,
      [edge.id]: { ...edge, participation: input.participation },
    },
  });
};

export const setCardinality = (
  model: ERDModel,
  input: { edgeId: NodeId; cardinality: Cardinality },
): ActionResult => {
  const edge = model.edges[input.edgeId];
  if (!edge) return fail({ code: "UNKNOWN_NODE", id: input.edgeId });
  if (edge.kind !== "participation")
    return fail({
      code: "ILLEGAL_EDGE",
      reason: "cardinality only applies to entity-relationship edges",
    });
  return ok({
    ...model,
    edges: {
      ...model.edges,
      [edge.id]: { ...edge, cardinality: input.cardinality },
    },
  });
};

export const setRole = (
  model: ERDModel,
  input: { edgeId: NodeId; role: string },
): ActionResult => {
  const edge = model.edges[input.edgeId];
  if (!edge) return fail({ code: "UNKNOWN_NODE", id: input.edgeId });
  if (edge.kind !== "participation")
    return fail({
      code: "ILLEGAL_EDGE",
      reason: "role only applies to entity-relationship edges",
    });
  return ok({
    ...model,
    edges: { ...model.edges, [edge.id]: { ...edge, role: input.role } },
  });
};

export const renameNode = (
  model: ERDModel,
  input: {
    scope: "entity" | "relationship" | "attribute";
    id: NodeId;
    name: string;
  },
): ActionResult => {
  const name = input.name.trim();
  if (!name) return fail({ code: "EMPTY_NAME", scope: input.scope });
  if (nameTaken(model, input.scope, name, input.id))
    return fail({ code: "DUPLICATE_NAME", scope: input.scope, name });
  if (input.scope === "entity") {
    const node = model.entities[input.id];
    if (!node) return fail({ code: "UNKNOWN_NODE", id: input.id });
    return ok({
      ...model,
      entities: { ...model.entities, [input.id]: { ...node, name } },
    });
  }
  if (input.scope === "relationship") {
    const node = model.relationships[input.id];
    if (!node) return fail({ code: "UNKNOWN_NODE", id: input.id });
    return ok({
      ...model,
      relationships: {
        ...model.relationships,
        [input.id]: { ...node, name },
      },
    });
  }
  const node = model.attributes[input.id];
  if (!node) return fail({ code: "UNKNOWN_NODE", id: input.id });
  return ok({
    ...model,
    attributes: { ...model.attributes, [input.id]: { ...node, name } },
  });
};

export const setAttributeUnique = (
  model: ERDModel,
  input: { attributeId: NodeId; unique: boolean },
): ActionResult => {
  const attr = model.attributes[input.attributeId];
  if (!attr) return fail({ code: "UNKNOWN_NODE", id: input.attributeId });
  const ownerEdge = Object.values(model.edges).find(
    (e) =>
      (e.kind === "entityAttribute" || e.kind === "relationshipAttribute") &&
      e.attributeId === attr.id,
  );
  if (input.unique) {
    if (ownerEdge?.kind === "relationshipAttribute")
      return fail({
        code: "ILLEGAL_EDGE",
        reason: "relationship attribute cannot be unique",
      });
    if (ownerEdge?.kind === "entityAttribute") {
      const otherUnique = Object.values(model.edges).some(
        (e) =>
          e.kind === "entityAttribute" &&
          e.entityId === ownerEdge.entityId &&
          e.attributeId !== attr.id &&
          model.attributes[e.attributeId]?.unique,
      );
      if (otherUnique)
        return fail({ code: "MULTIPLE_UNIQUE", entityId: ownerEdge.entityId });
    }
  }
  return ok({
    ...model,
    attributes: {
      ...model.attributes,
      [attr.id]: { ...attr, unique: input.unique },
    },
  });
};

export const setEntityWeak = (
  model: ERDModel,
  input: { entityId: NodeId; weak: boolean },
): ActionResult => {
  const e = model.entities[input.entityId];
  if (!e) return fail({ code: "UNKNOWN_NODE", id: input.entityId });
  return ok({
    ...model,
    entities: {
      ...model.entities,
      [e.id]: { ...e, weak: input.weak },
    },
  });
};

export const setRelationshipIdentifying = (
  model: ERDModel,
  input: { relationshipId: NodeId; identifying: boolean },
): ActionResult => {
  const r = model.relationships[input.relationshipId];
  if (!r) return fail({ code: "UNKNOWN_NODE", id: input.relationshipId });
  return ok({
    ...model,
    relationships: {
      ...model.relationships,
      [r.id]: { ...r, identifying: input.identifying },
    },
  });
};

export const removeNode = (
  model: ERDModel,
  input: { id: NodeId },
): ActionResult => {
  const { id } = input;
  const next: ERDModel = {
    entities: { ...model.entities },
    relationships: { ...model.relationships },
    attributes: { ...model.attributes },
    edges: { ...model.edges },
  };
  if (next.entities[id]) delete next.entities[id];
  else if (next.relationships[id]) delete next.relationships[id];
  else if (next.attributes[id]) delete next.attributes[id];
  else return fail({ code: "UNKNOWN_NODE", id });
  for (const [edgeId, e] of Object.entries(next.edges)) {
    if (
      (e.kind === "participation" &&
        (e.entityId === id || e.relationshipId === id)) ||
      (e.kind === "entityAttribute" &&
        (e.entityId === id || e.attributeId === id)) ||
      (e.kind === "relationshipAttribute" &&
        (e.relationshipId === id || e.attributeId === id))
    ) {
      delete next.edges[edgeId];
    }
  }
  return ok(next);
};

export const removeEdge = (
  model: ERDModel,
  input: { edgeId: NodeId },
): ActionResult => {
  if (!model.edges[input.edgeId])
    return fail({ code: "UNKNOWN_NODE", id: input.edgeId });
  const next = { ...model, edges: { ...model.edges } };
  delete next.edges[input.edgeId];
  return ok(next);
};
