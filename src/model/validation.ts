import {
  Attribute,
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
  | { code: "ATTRIBUTE_HAS_NO_OWNER"; attributeId: NodeId }
  | { code: "ATTRIBUTE_HAS_MULTIPLE_OWNERS"; attributeId: NodeId }
  | { code: "MULTIPLE_UNIQUE"; entityId: NodeId }
  | { code: "WEAK_ENTITY_NEEDS_IDENTIFYING_RELATIONSHIP"; entityId: NodeId }
  | { code: "IDENTIFYING_RELATIONSHIP_NEEDS_WEAK_ENTITY"; relationshipId: NodeId }
  | { code: "RELATIONSHIP_NEEDS_TWO_ENTITIES"; relationshipId: NodeId };

const ownersOfAttribute = (model: ERDModel, attributeId: NodeId): Edge[] =>
  Object.values(model.edges).filter(
    (e) =>
      (e.kind === "entityAttribute" || e.kind === "relationshipAttribute") &&
      e.attributeId === attributeId,
  );

export const attributeHasOwner = (model: ERDModel, attributeId: NodeId): boolean =>
  ownersOfAttribute(model, attributeId).length > 0;

export const entityUniqueAttributes = (
  model: ERDModel,
  entityId: NodeId,
): Attribute[] => {
  const ids = new Set(
    Object.values(model.edges)
      .filter((e) => e.kind === "entityAttribute" && e.entityId === entityId)
      .map((e) => (e as { attributeId: NodeId }).attributeId),
  );
  return Object.values(model.attributes).filter((a) => ids.has(a.id) && a.unique);
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
    if (a.unique && owners[0]?.kind === "relationshipAttribute")
      errors.push({
        code: "ILLEGAL_EDGE",
        reason: "relationship attribute cannot be unique",
      });
  }

  for (const e of Object.values(model.entities)) {
    if (entityUniqueAttributes(model, e.id).length > 1)
      errors.push({ code: "MULTIPLE_UNIQUE", entityId: e.id });
    if (e.weak && identifyingRelationshipsFor(model, e.id).length === 0)
      errors.push({
        code: "WEAK_ENTITY_NEEDS_IDENTIFYING_RELATIONSHIP",
        entityId: e.id,
      });
  }

  for (const r of Object.values(model.relationships)) {
    const parts = relationshipParticipants(model, r.id);
    if (parts.length < 2)
      errors.push({ code: "RELATIONSHIP_NEEDS_TWO_ENTITIES", relationshipId: r.id });
    if (r.identifying && !parts.some((p) => p.weak))
      errors.push({
        code: "IDENTIFYING_RELATIONSHIP_NEEDS_WEAK_ENTITY",
        relationshipId: r.id,
      });
  }

  for (const edge of Object.values(model.edges)) {
    if (edge.kind === "participation") {
      if (!model.entities[edge.entityId])
        errors.push({ code: "UNKNOWN_NODE", id: edge.entityId });
      if (!model.relationships[edge.relationshipId])
        errors.push({ code: "UNKNOWN_NODE", id: edge.relationshipId });
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
