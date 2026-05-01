import { create } from "zustand";
import * as A from "../model/actions";
import { emptyModel, ERDModel } from "../model/types";
import { ValidationError } from "../model/validation";

type Mode = "select" | "connect" | "entity" | "attribute" | "relationship";

interface HistoryState {
  past: ERDModel[];
  future: ERDModel[];
}

interface DiagramState extends HistoryState {
  model: ERDModel;
  mode: Mode;
  selection: string | null;
  lastError: ValidationError | null;

  setMode: (mode: Mode) => void;
  select: (id: string | null) => void;
  clearError: () => void;
  undo: () => void;
  redo: () => void;

  addEntity: (input: Parameters<typeof A.addEntity>[1]) => void;
  addRelationship: (input: Parameters<typeof A.addRelationship>[1]) => void;
  addAttribute: (input: Parameters<typeof A.addAttribute>[1]) => void;
  addAttributeToEntity: (input: {
    entityId: string;
    name: string;
    unique?: boolean;
  }) => void;
  addAttributeToRelationship: (input: {
    relationshipId: string;
    name: string;
  }) => void;
  connectEntityToRelationship: (
    input: Parameters<typeof A.connectEntityToRelationship>[1],
  ) => void;
  attachAttributeToEntity: (
    input: Parameters<typeof A.attachAttributeToEntity>[1],
  ) => void;
  attachAttributeToRelationship: (
    input: Parameters<typeof A.attachAttributeToRelationship>[1],
  ) => void;
  setParticipation: (input: Parameters<typeof A.setParticipation>[1]) => void;
  setCardinality: (input: Parameters<typeof A.setCardinality>[1]) => void;
  setRole: (input: Parameters<typeof A.setRole>[1]) => void;
  renameNode: (input: Parameters<typeof A.renameNode>[1]) => void;
  setAttributeUnique: (input: Parameters<typeof A.setAttributeUnique>[1]) => void;
  setEntityWeak: (input: Parameters<typeof A.setEntityWeak>[1]) => void;
  setRelationshipIdentifying: (
    input: Parameters<typeof A.setRelationshipIdentifying>[1],
  ) => void;
  removeNode: (input: Parameters<typeof A.removeNode>[1]) => void;
  removeEdge: (input: Parameters<typeof A.removeEdge>[1]) => void;
  loadModel: (model: ERDModel) => void;
}

const HISTORY_LIMIT = 50;

const wrap =
  <I,>(action: (m: ERDModel, input: I) => A.ActionResult) =>
  (set: (fn: (s: DiagramState) => Partial<DiagramState>) => void) =>
  (input: I) => {
    set((s) => {
      const result = action(s.model, input);
      if (!result.ok) return { lastError: result.error };
      const past = [...s.past, s.model].slice(-HISTORY_LIMIT);
      return {
        model: result.model,
        past,
        future: [],
        lastError: null,
      };
    });
  };

export const useDiagramStore = create<DiagramState>()((set) => ({
  model: emptyModel(),
  mode: "select",
  selection: null,
  lastError: null,
  past: [],
  future: [],

  setMode: (mode) => set({ mode, selection: null }),
  select: (id) => set({ selection: id }),
  clearError: () => set({ lastError: null }),

  undo: () =>
    set((s) => {
      if (s.past.length === 0) return {};
      const previous = s.past[s.past.length - 1];
      return {
        model: previous,
        past: s.past.slice(0, -1),
        future: [s.model, ...s.future],
      };
    }),
  redo: () =>
    set((s) => {
      if (s.future.length === 0) return {};
      const [next, ...rest] = s.future;
      return {
        model: next,
        past: [...s.past, s.model].slice(-HISTORY_LIMIT),
        future: rest,
      };
    }),

  addEntity: wrap(A.addEntity)(set),
  addRelationship: wrap(A.addRelationship)(set),
  addAttribute: wrap(A.addAttribute)(set),

  addAttributeToEntity: (input) =>
    set((s) => {
      const created = A.addAttribute(s.model, {
        name: input.name,
        unique: input.unique,
      });
      if (!created.ok) return { lastError: created.error };
      const newAttr = Object.values(created.model.attributes).find(
        (a) => !s.model.attributes[a.id],
      );
      if (!newAttr) return { lastError: null };
      const linked = A.attachAttributeToEntity(created.model, {
        entityId: input.entityId,
        attributeId: newAttr.id,
      });
      if (!linked.ok) return { lastError: linked.error };
      return {
        model: linked.model,
        past: [...s.past, s.model].slice(-HISTORY_LIMIT),
        future: [],
        lastError: null,
      };
    }),

  addAttributeToRelationship: (input) =>
    set((s) => {
      const created = A.addAttribute(s.model, { name: input.name });
      if (!created.ok) return { lastError: created.error };
      const newAttr = Object.values(created.model.attributes).find(
        (a) => !s.model.attributes[a.id],
      );
      if (!newAttr) return { lastError: null };
      const linked = A.attachAttributeToRelationship(created.model, {
        relationshipId: input.relationshipId,
        attributeId: newAttr.id,
      });
      if (!linked.ok) return { lastError: linked.error };
      return {
        model: linked.model,
        past: [...s.past, s.model].slice(-HISTORY_LIMIT),
        future: [],
        lastError: null,
      };
    }),

  connectEntityToRelationship: wrap(A.connectEntityToRelationship)(set),
  attachAttributeToEntity: wrap(A.attachAttributeToEntity)(set),
  attachAttributeToRelationship: wrap(A.attachAttributeToRelationship)(set),
  setParticipation: wrap(A.setParticipation)(set),
  setCardinality: wrap(A.setCardinality)(set),
  setRole: wrap(A.setRole)(set),
  renameNode: wrap(A.renameNode)(set),
  setAttributeUnique: wrap(A.setAttributeUnique)(set),
  setEntityWeak: wrap(A.setEntityWeak)(set),
  setRelationshipIdentifying: wrap(A.setRelationshipIdentifying)(set),
  removeNode: wrap(A.removeNode)(set),
  removeEdge: wrap(A.removeEdge)(set),

  loadModel: (model) =>
    set((s) => ({
      model,
      past: [...s.past, s.model].slice(-HISTORY_LIMIT),
      future: [],
      lastError: null,
      selection: null,
    })),
}));
