import { z } from "zod";
import type { ERDModel } from "./types";

const positionSchema = z.object({ x: z.number(), y: z.number() });

const cardinalitySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("one") }),
  z.object({ kind: z.literal("many"), symbol: z.union([z.literal("N"), z.literal("M")]) }),
  z.object({
    kind: z.literal("minMax"),
    min: z.number().int().nonnegative(),
    max: z.union([z.number().int().nonnegative(), z.literal("N")]),
  }),
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
    cardinality: cardinalitySchema,
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
