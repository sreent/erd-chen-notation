import { describe, expect, it } from "vitest";
import * as A from "./actions";
import { cardinalityLabel, emptyModel, ERDModel } from "./types";
import { validateModel } from "./validation";

const must = (r: A.ActionResult): ERDModel => {
  if (!r.ok) throw new Error(`expected ok, got ${JSON.stringify(r.error)}`);
  return r.model;
};
const fail = (r: A.ActionResult) => {
  if (r.ok) throw new Error("expected failure, got ok");
  return r.error;
};

const setup = () => {
  let m = emptyModel();
  m = must(A.addEntity(m, { name: "Student" }));
  m = must(A.addEntity(m, { name: "Course" }));
  m = must(A.addRelationship(m, { name: "enrols" }));
  return m;
};

describe("naming", () => {
  it("rejects empty names", () => {
    expect(fail(A.addEntity(emptyModel(), { name: "  " })).code).toBe("EMPTY_NAME");
  });
  it("rejects duplicate names within scope", () => {
    let m = must(A.addEntity(emptyModel(), { name: "X" }));
    expect(fail(A.addEntity(m, { name: "X" })).code).toBe("DUPLICATE_NAME");
    m = must(A.addRelationship(m, { name: "X" }));
  });
});

describe("cardinality label", () => {
  it("renders (min,max) when both sides specified", () => {
    expect(cardinalityLabel("mandatory", "many")).toBe("(1,N)");
    expect(cardinalityLabel("optional", "one")).toBe("(0,1)");
    expect(cardinalityLabel("mandatory", "one")).toBe("(1,1)");
    expect(cardinalityLabel("optional", "many")).toBe("(0,N)");
  });
  it("returns null when either side is unspecified", () => {
    expect(cardinalityLabel("unspecified", "many")).toBeNull();
    expect(cardinalityLabel("mandatory", "unspecified")).toBeNull();
  });
});

describe("connect entity ↔ relationship", () => {
  it("requires both endpoints to exist", () => {
    const m = setup();
    expect(
      fail(
        A.connectEntityToRelationship(m, {
          entityId: "missing",
          relationshipId: Object.values(m.relationships)[0].id,
        }),
      ).code,
    ).toBe("UNKNOWN_NODE");
  });
  it("creates participation with defaults", () => {
    let m = setup();
    const eId = Object.values(m.entities)[0].id;
    const rId = Object.values(m.relationships)[0].id;
    m = must(
      A.connectEntityToRelationship(m, { entityId: eId, relationshipId: rId }),
    );
    const edge = Object.values(m.edges)[0];
    expect(edge.kind).toBe("participation");
    if (edge.kind === "participation") {
      expect(edge.participation).toBe("unspecified");
      expect(edge.cardinality).toBe("unspecified");
      expect(edge.role).toBe("");
    }
  });
  it("sets cardinality and role", () => {
    let m = setup();
    const eId = Object.values(m.entities)[0].id;
    const rId = Object.values(m.relationships)[0].id;
    m = must(
      A.connectEntityToRelationship(m, { entityId: eId, relationshipId: rId }),
    );
    const edgeId = Object.values(m.edges)[0].id;
    m = must(A.setParticipation(m, { edgeId, participation: "mandatory" }));
    m = must(A.setCardinality(m, { edgeId, cardinality: "many" }));
    m = must(A.setRole(m, { edgeId, role: "enrolee" }));
    const e = m.edges[edgeId];
    if (e.kind === "participation") {
      expect(e.participation).toBe("mandatory");
      expect(e.cardinality).toBe("many");
      expect(e.role).toBe("enrolee");
    }
  });
});

describe("attribute attachment", () => {
  it("rejects double-owning an attribute", () => {
    let m = setup();
    m = must(A.addAttribute(m, { name: "name" }));
    const [e1, e2] = Object.values(m.entities);
    const aId = Object.values(m.attributes)[0].id;
    m = must(A.attachAttributeToEntity(m, { entityId: e1.id, attributeId: aId }));
    expect(
      fail(A.attachAttributeToEntity(m, { entityId: e2.id, attributeId: aId })).code,
    ).toBe("ATTRIBUTE_HAS_MULTIPLE_OWNERS");
  });
  it("rejects multiple unique attributes per entity", () => {
    let m = setup();
    m = must(A.addAttribute(m, { name: "id1", unique: true }));
    m = must(A.addAttribute(m, { name: "id2", unique: true }));
    const eId = Object.values(m.entities)[0].id;
    const [a1, a2] = Object.values(m.attributes);
    m = must(A.attachAttributeToEntity(m, { entityId: eId, attributeId: a1.id }));
    expect(
      fail(A.attachAttributeToEntity(m, { entityId: eId, attributeId: a2.id })).code,
    ).toBe("MULTIPLE_UNIQUE");
  });
  it("rejects unique attribute on relationship", () => {
    let m = setup();
    m = must(A.addAttribute(m, { name: "since", unique: true }));
    const rId = Object.values(m.relationships)[0].id;
    const aId = Object.values(m.attributes)[0].id;
    expect(
      fail(
        A.attachAttributeToRelationship(m, {
          relationshipId: rId,
          attributeId: aId,
        }),
      ).code,
    ).toBe("ILLEGAL_EDGE");
  });
});

describe("model validation", () => {
  it("flags weak entity without identifying relationship", () => {
    const m = must(A.addEntity(emptyModel(), { name: "Dependent", weak: true }));
    const errs = validateModel(m);
    expect(errs.some((e) => e.code === "WEAK_ENTITY_NEEDS_IDENTIFYING_RELATIONSHIP")).toBe(true);
  });
  it("flags relationship with fewer than two participants", () => {
    const m = setup();
    const errs = validateModel(m);
    expect(errs.some((e) => e.code === "RELATIONSHIP_NEEDS_TWO_ENTITIES")).toBe(true);
  });
  it("flags identifying relationship with no weak participant", () => {
    let m = setup();
    m = must(
      A.setRelationshipIdentifying(m, {
        relationshipId: Object.values(m.relationships)[0].id,
        identifying: true,
      }),
    );
    const [e1, e2] = Object.values(m.entities);
    const r = Object.values(m.relationships)[0];
    m = must(A.connectEntityToRelationship(m, { entityId: e1.id, relationshipId: r.id }));
    m = must(A.connectEntityToRelationship(m, { entityId: e2.id, relationshipId: r.id }));
    const errs = validateModel(m);
    expect(errs.some((e) => e.code === "IDENTIFYING_RELATIONSHIP_NEEDS_WEAK_ENTITY")).toBe(true);
  });
  it("flags orphan attribute", () => {
    const m = must(A.addAttribute(emptyModel(), { name: "lonely" }));
    const errs = validateModel(m);
    expect(errs.some((e) => e.code === "ATTRIBUTE_HAS_NO_OWNER")).toBe(true);
  });
});

describe("removal cascades edges", () => {
  it("removes edges when an entity is removed", () => {
    let m = setup();
    m = must(A.addAttribute(m, { name: "id", unique: true }));
    const eId = Object.values(m.entities)[0].id;
    const rId = Object.values(m.relationships)[0].id;
    const aId = Object.values(m.attributes)[0].id;
    m = must(A.connectEntityToRelationship(m, { entityId: eId, relationshipId: rId }));
    m = must(A.attachAttributeToEntity(m, { entityId: eId, attributeId: aId }));
    expect(Object.values(m.edges)).toHaveLength(2);
    m = must(A.removeNode(m, { id: eId }));
    expect(Object.values(m.edges)).toHaveLength(0);
  });
});
