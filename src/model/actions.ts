import {
  Attribute,
  AttributeFlag,
  Cardinality,
  Edge,
  Entity,
  ERDModel,
  NodeId,
  Relationship,
} from "./types";
import { isValidCardinality, ValidationError } from "./validation";

export type ActionResult<T = ERDModel> =
  | { ok: true; model: T }
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
    flags?: AttributeFlag[];
    position?: { x: number; y: number };
  },
): ActionResult => {
  const name = input.name.trim();
  if (!name) return fail({ code: "EMPTY_NAME", scope: "attribute" });
  if (nameTaken(model, "attribute", name))
    return fail({ code: "DUPLICATE_NAME", scope: "attribute", name });
  const flagSet = new Set(input.flags ?? []);
  if (flagSet.has("key") && flagSet.has("partialKey"))
    return fail({ code: "KEY_AND_PARTIAL_KEY", attributeId: "(new)" });
  if (flagSet.has("derived") && flagSet.has("multivalued"))
    return fail({ code: "DERIVED_AND_MULTIVALUED", attributeId: "(new)" });
  const a: Attribute = {
    id: newId(),
    name,
    flags: flagSet,
    position: input.position ?? { x: 0, y: 0 },
  };
  return ok({ ...model, attributes: { ...model.attributes, [a.id]: a } });
};

const edgeExists = (model: ERDModel, predicate: (e: Edge) => boolean): boolean =>
  Object.values(model.edges).some(predicate);

export const connectEntityToRelationship = (
  model: ERDModel,
  input: {
    entityId: NodeId;
    relationshipId: NodeId;
    cardinality: Cardinality;
    total?: boolean;
  },
): ActionResult => {
  if (!model.entities[input.entityId])
    return fail({ code: "UNKNOWN_NODE", id: input.entityId });
  if (!model.relationships[input.relationshipId])
    return fail({ code: "UNKNOWN_NODE", id: input.relationshipId });
  if (!isValidCardinality(input.cardinality))
    return fail({ code: "INVALID_CARDINALITY", reason: "out of range" });
  if (
    edgeExists(
      model,
      (e) =>
        e.kind === "participation" &&
        e.entityId === input.entityId &&
        e.relationshipId === input.relationshipId,
    )
  )
    return fail({
      code: "DUPLICATE_EDGE",
      reason: "entity already participates in this relationship",
    });
  const edge: Edge = {
    id: newId(),
    kind: "participation",
    entityId: input.entityId,
    relationshipId: input.relationshipId,
    cardinality: input.cardinality,
    total: input.total ?? false,
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
  if (
    edgeExists(
      model,
      (e) =>
        (e.kind === "entityAttribute" || e.kind === "relationshipAttribute") &&
        e.attributeId === input.attributeId,
    )
  )
    return fail({
      code: "ATTRIBUTE_HAS_MULTIPLE_OWNERS",
      attributeId: input.attributeId,
    });
  if (attr.flags.has("key")) {
    const existingKey = Object.values(model.edges).some(
      (e) =>
        e.kind === "entityAttribute" &&
        e.entityId === input.entityId &&
        model.attributes[e.attributeId]?.flags.has("key"),
    );
    if (existingKey)
      return fail({ code: "MULTIPLE_KEYS", entityId: input.entityId });
  }
  if (
    attr.flags.has("partialKey") &&
    !model.entities[input.entityId].weak
  )
    return fail({
      code: "PARTIAL_KEY_REQUIRES_WEAK_ENTITY",
      attributeId: input.attributeId,
    });
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
  if (attr.flags.has("key") || attr.flags.has("partialKey"))
    return fail({
      code: "ILLEGAL_EDGE",
      reason: "key/partial-key attribute can only attach to an entity",
    });
  if (
    edgeExists(
      model,
      (e) =>
        (e.kind === "entityAttribute" || e.kind === "relationshipAttribute") &&
        e.attributeId === input.attributeId,
    )
  )
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
  if (!isValidCardinality(input.cardinality))
    return fail({ code: "INVALID_CARDINALITY", reason: "out of range" });
  return ok({
    ...model,
    edges: {
      ...model.edges,
      [edge.id]: { ...edge, cardinality: input.cardinality },
    },
  });
};

export const setParticipationTotal = (
  model: ERDModel,
  input: { edgeId: NodeId; total: boolean },
): ActionResult => {
  const edge = model.edges[input.edgeId];
  if (!edge) return fail({ code: "UNKNOWN_NODE", id: input.edgeId });
  if (edge.kind !== "participation")
    return fail({
      code: "ILLEGAL_EDGE",
      reason: "total participation only applies to entity-relationship edges",
    });
  return ok({
    ...model,
    edges: { ...model.edges, [edge.id]: { ...edge, total: input.total } },
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

export const setAttributeFlags = (
  model: ERDModel,
  input: { attributeId: NodeId; flags: AttributeFlag[] },
): ActionResult => {
  const attr = model.attributes[input.attributeId];
  if (!attr) return fail({ code: "UNKNOWN_NODE", id: input.attributeId });
  const flags = new Set(input.flags);
  if (flags.has("key") && flags.has("partialKey"))
    return fail({ code: "KEY_AND_PARTIAL_KEY", attributeId: attr.id });
  if (flags.has("derived") && flags.has("multivalued"))
    return fail({ code: "DERIVED_AND_MULTIVALUED", attributeId: attr.id });
  const ownerEdge = Object.values(model.edges).find(
    (e) =>
      (e.kind === "entityAttribute" || e.kind === "relationshipAttribute") &&
      e.attributeId === attr.id,
  );
  if (ownerEdge?.kind === "relationshipAttribute" && (flags.has("key") || flags.has("partialKey")))
    return fail({
      code: "ILLEGAL_EDGE",
      reason: "relationship attributes cannot be keys",
    });
  if (ownerEdge?.kind === "entityAttribute") {
    const owner = model.entities[ownerEdge.entityId];
    if (flags.has("partialKey") && !owner.weak)
      return fail({
        code: "PARTIAL_KEY_REQUIRES_WEAK_ENTITY",
        attributeId: attr.id,
      });
    if (flags.has("key")) {
      const otherKey = Object.values(model.edges).some(
        (e) =>
          e.kind === "entityAttribute" &&
          e.entityId === owner.id &&
          e.attributeId !== attr.id &&
          model.attributes[e.attributeId]?.flags.has("key"),
      );
      if (otherKey) return fail({ code: "MULTIPLE_KEYS", entityId: owner.id });
    }
  }
  return ok({
    ...model,
    attributes: {
      ...model.attributes,
      [attr.id]: { ...attr, flags },
    },
  });
};

export const setEntityWeak = (
  model: ERDModel,
  input: { entityId: NodeId; weak: boolean },
): ActionResult => {
  const e = model.entities[input.entityId];
  if (!e) return fail({ code: "UNKNOWN_NODE", id: input.entityId });
  if (!input.weak) {
    const ownsPartialKey = Object.values(model.edges).some(
      (edge) =>
        edge.kind === "entityAttribute" &&
        edge.entityId === e.id &&
        model.attributes[edge.attributeId]?.flags.has("partialKey"),
    );
    if (ownsPartialKey)
      return fail({
        code: "ILLEGAL_EDGE",
        reason: "remove partial-key attribute before unsetting weak",
      });
  }
  return ok({
    ...model,
    entities: {
      ...model.entities,
      [e.id]: { ...e, weak: input.weak },
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
  if (next.attributes[id] === undefined && model.attributes[id] === undefined) {
    for (const a of Object.values(next.attributes)) {
      const stillOwned = Object.values(next.edges).some(
        (e) =>
          (e.kind === "entityAttribute" || e.kind === "relationshipAttribute") &&
          e.attributeId === a.id,
      );
      if (!stillOwned) delete next.attributes[a.id];
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
