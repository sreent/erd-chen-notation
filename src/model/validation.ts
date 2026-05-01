import {
  Attribute,
  Cardinality,
  Edge,
  Entity,
  ERDModel,
  NodeId,
  Relationship,
} from "./types";

export type ValidationError =
  | { code: "DUPLICATE_NAME"; scope: "entity" | "relationship" | "attribute"; name: string }
  | { code: "EMPTY_NAME"; scope: "entity" | "relationship" | "attribute" }
  | { code: "UNKNOWN_NODE"; id: NodeId }
  | { code: "ILLEGAL_EDGE"; reason: string }
  | { code: "DUPLICATE_EDGE"; reason: string }
  | { code: "INVALID_CARDINALITY"; reason: string }
  | { code: "ATTRIBUTE_HAS_NO_OWNER"; attributeId: NodeId }
  | { code: "ATTRIBUTE_HAS_MULTIPLE_OWNERS"; attributeId: NodeId }
  | { code: "MULTIPLE_KEYS"; entityId: NodeId }
  | { code: "PARTIAL_KEY_REQUIRES_WEAK_ENTITY"; attributeId: NodeId }
  | { code: "KEY_AND_PARTIAL_KEY"; attributeId: NodeId }
  | { code: "DERIVED_AND_MULTIVALUED"; attributeId: NodeId }
  | { code: "WEAK_ENTITY_NEEDS_IDENTIFYING_RELATIONSHIP"; entityId: NodeId }
  | { code: "RELATIONSHIP_NEEDS_TWO_ENTITIES"; relationshipId: NodeId };

export const isValidCardinality = (c: Cardinality): boolean => {
  if (c.kind === "one" || c.kind === "many") return true;
  if (c.kind === "minMax") {
    if (c.min < 0) return false;
    if (c.max !== "N" && c.max < c.min) return false;
    return true;
  }
  return false;
};

const ownersOfAttribute = (
  model: ERDModel,
  attributeId: NodeId,
): Edge[] =>
  Object.values(model.edges).filter(
    (e) =>
      (e.kind === "entityAttribute" || e.kind === "relationshipAttribute") &&
      e.attributeId === attributeId,
  );

export const attributeHasOwner = (model: ERDModel, attributeId: NodeId): boolean =>
  ownersOfAttribute(model, attributeId).length > 0;

export const entityKeyAttributes = (
  model: ERDModel,
  entityId: NodeId,
): Attribute[] => {
  const ids = new Set(
    Object.values(model.edges)
      .filter((e) => e.kind === "entityAttribute" && e.entityId === entityId)
      .map((e) => (e as { attributeId: NodeId }).attributeId),
  );
  return Object.values(model.attributes).filter(
    (a) => ids.has(a.id) && a.flags.has("key"),
  );
};

export const relationshipParticipants = (
  model: ERDModel,
  relationshipId: NodeId,
): Entity[] => {
  const ids = new Set(
    Object.values(model.edges)
      .filter(
        (e) => e.kind === "participation" && e.relationshipId === relationshipId,
      )
      .map((e) => (e as { entityId: NodeId }).entityId),
  );
  return Object.values(model.entities).filter((e) => ids.has(e.id));
};

const identifyingRelationshipsFor = (
  model: ERDModel,
  entityId: NodeId,
): Relationship[] => {
  const relIds = new Set(
    Object.values(model.edges)
      .filter((e) => e.kind === "participation" && e.entityId === entityId)
      .map((e) => (e as { relationshipId: NodeId }).relationshipId),
  );
  return Object.values(model.relationships).filter(
    (r) => relIds.has(r.id) && r.identifying,
  );
};

export const validateModel = (model: ERDModel): ValidationError[] => {
  const errors: ValidationError[] = [];

  const seen = (
    items: { id: NodeId; name: string }[],
    scope: "entity" | "relationship" | "attribute",
  ) => {
    const names = new Set<string>();
    for (const it of items) {
      const n = it.name.trim();
      if (!n) errors.push({ code: "EMPTY_NAME", scope });
      else if (names.has(n))
        errors.push({ code: "DUPLICATE_NAME", scope, name: n });
      else names.add(n);
    }
  };
  seen(Object.values(model.entities), "entity");
  seen(Object.values(model.relationships), "relationship");
  seen(Object.values(model.attributes), "attribute");

  for (const a of Object.values(model.attributes)) {
    const owners = ownersOfAttribute(model, a.id);
    if (owners.length === 0)
      errors.push({ code: "ATTRIBUTE_HAS_NO_OWNER", attributeId: a.id });
    if (owners.length > 1)
      errors.push({ code: "ATTRIBUTE_HAS_MULTIPLE_OWNERS", attributeId: a.id });
    if (a.flags.has("key") && a.flags.has("partialKey"))
      errors.push({ code: "KEY_AND_PARTIAL_KEY", attributeId: a.id });
    if (a.flags.has("derived") && a.flags.has("multivalued"))
      errors.push({ code: "DERIVED_AND_MULTIVALUED", attributeId: a.id });
    if (a.flags.has("partialKey")) {
      const owner = owners[0];
      const isWeakEntityOwner =
        owner?.kind === "entityAttribute" &&
        model.entities[owner.entityId]?.weak === true;
      if (!isWeakEntityOwner)
        errors.push({ code: "PARTIAL_KEY_REQUIRES_WEAK_ENTITY", attributeId: a.id });
    }
  }

  for (const e of Object.values(model.entities)) {
    if (entityKeyAttributes(model, e.id).length > 1)
      errors.push({ code: "MULTIPLE_KEYS", entityId: e.id });
    if (e.weak && identifyingRelationshipsFor(model, e.id).length === 0)
      errors.push({
        code: "WEAK_ENTITY_NEEDS_IDENTIFYING_RELATIONSHIP",
        entityId: e.id,
      });
  }

  for (const r of Object.values(model.relationships)) {
    if (relationshipParticipants(model, r.id).length < 2)
      errors.push({ code: "RELATIONSHIP_NEEDS_TWO_ENTITIES", relationshipId: r.id });
  }

  for (const edge of Object.values(model.edges)) {
    if (edge.kind === "participation") {
      if (!model.entities[edge.entityId])
        errors.push({ code: "UNKNOWN_NODE", id: edge.entityId });
      if (!model.relationships[edge.relationshipId])
        errors.push({ code: "UNKNOWN_NODE", id: edge.relationshipId });
      if (!isValidCardinality(edge.cardinality))
        errors.push({ code: "INVALID_CARDINALITY", reason: "out of range" });
    } else if (edge.kind === "entityAttribute") {
      if (!model.entities[edge.entityId])
        errors.push({ code: "UNKNOWN_NODE", id: edge.entityId });
      if (!model.attributes[edge.attributeId])
        errors.push({ code: "UNKNOWN_NODE", id: edge.attributeId });
    } else if (edge.kind === "relationshipAttribute") {
      if (!model.relationships[edge.relationshipId])
        errors.push({ code: "UNKNOWN_NODE", id: edge.relationshipId });
      if (!model.attributes[edge.attributeId])
        errors.push({ code: "UNKNOWN_NODE", id: edge.attributeId });
    }
  }

  return errors;
};
