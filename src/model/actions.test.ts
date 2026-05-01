import { describe, expect, it } from "vitest";
import * as A from "./actions";
import { emptyModel, ERDModel } from "./types";
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

describe("entity/relationship/attribute creation", () => {
  it("rejects empty names", () => {
    expect(fail(A.addEntity(emptyModel(), { name: "  " })).code).toBe("EMPTY_NAME");
  });
  it("rejects duplicate names within scope", () => {
    let m = must(A.addEntity(emptyModel(), { name: "X" }));
    expect(fail(A.addEntity(m, { name: "X" })).code).toBe("DUPLICATE_NAME");
    m = must(A.addRelationship(m, { name: "X" }));
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
          cardinality: { kind: "many", symbol: "N" },
        }),
      ).code,
    ).toBe("UNKNOWN_NODE");
  });
  it("rejects duplicate participation", () => {
    let m = setup();
    const eId = Object.values(m.entities)[0].id;
    const rId = Object.values(m.relationships)[0].id;
    m = must(
      A.connectEntityToRelationship(m, {
        entityId: eId,
        relationshipId: rId,
        cardinality: { kind: "many", symbol: "N" },
      }),
    );
    expect(
      fail(
        A.connectEntityToRelationship(m, {
          entityId: eId,
          relationshipId: rId,
          cardinality: { kind: "one" },
        }),
      ).code,
    ).toBe("DUPLICATE_EDGE");
  });
  it("rejects invalid (min,max) cardinality", () => {
    const m = setup();
    const [e, _e2] = Object.values(m.entities);
    const r = Object.values(m.relationships)[0];
    expect(
      fail(
        A.connectEntityToRelationship(m, {
          entityId: e.id,
          relationshipId: r.id,
          cardinality: { kind: "minMax", min: 5, max: 2 },
        }),
      ).code,
    ).toBe("INVALID_CARDINALITY");
  });
});

describe("attribute attachment", () => {
  it("attaches to entity", () => {
    let m = setup();
    m = must(A.addAttribute(m, { name: "id", unique: true }));
    const eId = Object.values(m.entities)[0].id;
    const aId = Object.values(m.attributes)[0].id;
    m = must(A.attachAttributeToEntity(m, { entityId: eId, attributeId: aId }));
    expect(Object.values(m.edges)).toHaveLength(1);
  });
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
    let m = must(A.addEntity(emptyModel(), { name: "Dependent", weak: true }));
    const errs = validateModel(m);
    expect(errs.some((e) => e.code === "WEAK_ENTITY_NEEDS_IDENTIFYING_RELATIONSHIP")).toBe(true);
  });
  it("flags relationship with fewer than two participants", () => {
    let m = setup();
    const errs = validateModel(m);
    expect(errs.some((e) => e.code === "RELATIONSHIP_NEEDS_TWO_ENTITIES")).toBe(true);
  });
  it("flags identifying relationship with no weak entity participant", () => {
    let m = setup();
    m = must(
      A.setRelationshipIdentifying(m, {
        relationshipId: Object.values(m.relationships)[0].id,
        identifying: true,
      }),
    );
    const [e1, e2] = Object.values(m.entities);
    const r = Object.values(m.relationships)[0];
    m = must(
      A.connectEntityToRelationship(m, {
        entityId: e1.id,
        relationshipId: r.id,
        cardinality: { kind: "one" },
      }),
    );
    m = must(
      A.connectEntityToRelationship(m, {
        entityId: e2.id,
        relationshipId: r.id,
        cardinality: { kind: "many", symbol: "N" },
      }),
    );
    const errs = validateModel(m);
    expect(errs.some((e) => e.code === "IDENTIFYING_RELATIONSHIP_NEEDS_WEAK_ENTITY")).toBe(true);
  });
  it("flags orphan attribute", () => {
    let m = must(A.addAttribute(emptyModel(), { name: "lonely" }));
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
    m = must(
      A.connectEntityToRelationship(m, {
        entityId: eId,
        relationshipId: rId,
        cardinality: { kind: "one" },
      }),
    );
    m = must(A.attachAttributeToEntity(m, { entityId: eId, attributeId: aId }));
    expect(Object.values(m.edges)).toHaveLength(2);
    m = must(A.removeNode(m, { id: eId }));
    expect(Object.values(m.edges)).toHaveLength(0);
  });
});
