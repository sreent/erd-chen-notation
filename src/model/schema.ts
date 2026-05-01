import { z } from "zod";
import type { ERDModel } from "./types";

const positionSchema = z.object({ x: z.number(), y: z.number() });
const participationSchema = z.union([
  z.literal("mandatory"),
  z.literal("optional"),
  z.literal("unspecified"),
]);
const cardinalitySchema = z.union([
  z.literal("one"),
  z.literal("many"),
  z.literal("unspecified"),
]);

const entitySchema = z.object({
  id: z.string(),
  name: z.string(),
  weak: z.boolean(),
  position: positionSchema,
});

const relationshipSchema = z.object({
  id: z.string(),
  name: z.string(),
  identifying: z.boolean(),
  position: positionSchema,
});

const attributeSchema = z.object({
  id: z.string(),
  name: z.string(),
  unique: z.boolean(),
  position: positionSchema,
});

const edgeSchema = z.discriminatedUnion("kind", [
  z.object({
    id: z.string(),
    kind: z.literal("participation"),
    entityId: z.string(),
    relationshipId: z.string(),
    participation: participationSchema,
    cardinality: cardinalitySchema,
    role: z.string(),
  }),
  z.object({
    id: z.string(),
    kind: z.literal("entityAttribute"),
    entityId: z.string(),
    attributeId: z.string(),
  }),
  z.object({
    id: z.string(),
    kind: z.literal("relationshipAttribute"),
    relationshipId: z.string(),
    attributeId: z.string(),
  }),
]);

export const erdModelSchema = z.object({
  entities: z.record(entitySchema),
  relationships: z.record(relationshipSchema),
  attributes: z.record(attributeSchema),
  edges: z.record(edgeSchema),
});

export const serializeModel = (model: ERDModel): string =>
  JSON.stringify(model, null, 2);

export const parseModel = (json: string): ERDModel =>
  erdModelSchema.parse(JSON.parse(json)) as ERDModel;
