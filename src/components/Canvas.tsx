import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeChange,
  type Node as RFNode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useMemo, useState } from "react";
import EntityNode from "../nodes/EntityNode";
import RelationshipNode from "../nodes/RelationshipNode";
import AttributeNode from "../nodes/AttributeNode";
import ChenEdge from "../edges/ChenEdge";
import { projectModel } from "../lib/projection";
import { useDiagramStore } from "../store/diagramStore";

const nodeTypes = {
  entity: EntityNode,
  relationship: RelationshipNode,
  attribute: AttributeNode,
};
const edgeTypes = { chen: ChenEdge };

function CanvasInner() {
  const model = useDiagramStore((s) => s.model);
  const mode = useDiagramStore((s) => s.mode);
  const selection = useDiagramStore((s) => s.selection);
  const select = useDiagramStore((s) => s.select);
  const setMode = useDiagramStore((s) => s.setMode);
  const addEntity = useDiagramStore((s) => s.addEntity);
  const addRelationship = useDiagramStore((s) => s.addRelationship);
  const addAttribute = useDiagramStore((s) => s.addAttribute);
  const connectEntityToRelationship = useDiagramStore(
    (s) => s.connectEntityToRelationship,
  );
  const attachAttributeToEntity = useDiagramStore(
    (s) => s.attachAttributeToEntity,
  );
  const attachAttributeToRelationship = useDiagramStore(
    (s) => s.attachAttributeToRelationship,
  );
  const lastError = useDiagramStore((s) => s.lastError);
  const clearError = useDiagramStore((s) => s.clearError);

  const { screenToFlowPosition } = useReactFlow();
  const [connectFrom, setConnectFrom] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => projectModel(model), [model]);

  const decoratedNodes: RFNode[] = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        selected: n.id === selection,
        draggable: mode === "select",
      })),
    [nodes, selection, mode],
  );
  const decoratedEdges = useMemo(
    () => edges.map((e) => ({ ...e, selected: e.id === selection })),
    [edges, selection],
  );

  const onPaneClick = useCallback(
    (e: React.MouseEvent) => {
      if (mode === "select" || mode === "connect") {
        select(null);
        setConnectFrom(null);
        return;
      }
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const offset = { x: position.x - 50, y: position.y - 25 };
      if (mode === "entity") {
        addEntity({ name: nextName(model.entities, "Entity"), position: offset });
      } else if (mode === "relationship") {
        addRelationship({
          name: nextName(model.relationships, "Relationship"),
          position: offset,
        });
      } else if (mode === "attribute") {
        addAttribute({
          name: nextName(model.attributes, "Attribute"),
          position: offset,
        });
      }
      setMode("select");
    },
    [
      mode,
      select,
      screenToFlowPosition,
      addEntity,
      addRelationship,
      addAttribute,
      setMode,
      model,
    ],
  );

  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: RFNode) => {
      if (mode === "select") {
        select(node.id);
        return;
      }
      if (mode === "connect") {
        if (!connectFrom) {
          setConnectFrom(node.id);
          return;
        }
        if (connectFrom === node.id) {
          setConnectFrom(null);
          return;
        }
        tryConnect(connectFrom, node.id);
        setConnectFrom(null);
        setMode("select");
      }
    },
    [mode, select, connectFrom, setMode],
  );

  const tryConnect = (a: string, b: string) => {
    const aIsEntity = !!model.entities[a];
    const bIsEntity = !!model.entities[b];
    const aIsRel = !!model.relationships[a];
    const bIsRel = !!model.relationships[b];
    const aIsAttr = !!model.attributes[a];
    const bIsAttr = !!model.attributes[b];

    if (aIsEntity && bIsRel)
      connectEntityToRelationship({ entityId: a, relationshipId: b });
    else if (aIsRel && bIsEntity)
      connectEntityToRelationship({ entityId: b, relationshipId: a });
    else if (aIsEntity && bIsAttr)
      attachAttributeToEntity({ entityId: a, attributeId: b });
    else if (aIsAttr && bIsEntity)
      attachAttributeToEntity({ entityId: b, attributeId: a });
    else if (aIsRel && bIsAttr)
      attachAttributeToRelationship({ relationshipId: a, attributeId: b });
    else if (aIsAttr && bIsRel)
      attachAttributeToRelationship({ relationshipId: b, attributeId: a });
    else {
      alert("Invalid connection. Allowed: entity↔relationship, entity↔attribute, relationship↔attribute.");
    }
  };

  const onEdgeClick = useCallback(
    (_e: React.MouseEvent, edge: { id: string }) => {
      if (mode === "select") select(edge.id);
    },
    [mode, select],
  );

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    for (const c of changes) {
      if (c.type === "position" && c.position) {
        mutatePosition(c.id, c.position);
      }
    }
  }, []);

  const mutatePosition = (id: string, position: { x: number; y: number }) => {
    useDiagramStore.setState((s) => {
      if (s.model.entities[id])
        return {
          model: {
            ...s.model,
            entities: {
              ...s.model.entities,
              [id]: { ...s.model.entities[id], position },
            },
          },
        };
      if (s.model.relationships[id])
        return {
          model: {
            ...s.model,
            relationships: {
              ...s.model.relationships,
              [id]: { ...s.model.relationships[id], position },
            },
          },
        };
      if (s.model.attributes[id])
        return {
          model: {
            ...s.model,
            attributes: {
              ...s.model.attributes,
              [id]: { ...s.model.attributes[id], position },
            },
          },
        };
      return {};
    });
  };

  const cursor =
    mode === "entity" || mode === "attribute" || mode === "relationship"
      ? "crosshair"
      : mode === "connect"
      ? "alias"
      : "default";

  return (
    <div style={{ position: "relative", flex: 1, cursor }}>
      <ReactFlow
        nodes={decoratedNodes}
        edges={decoratedEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onNodesChange={onNodesChange}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
        fitView
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
      {mode === "connect" && (
        <div style={hintStyle}>
          {connectFrom
            ? "Click the second node to connect."
            : "Click the first node to start a connection."}
        </div>
      )}
      {lastError && (
        <div style={errStyle} onClick={clearError}>
          {formatError(lastError)} (click to dismiss)
        </div>
      )}
    </div>
  );
}

const formatError = (e: { code: string } & Record<string, unknown>): string => {
  switch (e.code) {
    case "DUPLICATE_NAME":
      return `Name "${e.name}" already used.`;
    case "EMPTY_NAME":
      return "Name cannot be empty.";
    case "ATTRIBUTE_HAS_MULTIPLE_OWNERS":
      return "Attribute already attached to a node.";
    case "MULTIPLE_UNIQUE":
      return "Entity already has a unique attribute.";
    case "ILLEGAL_EDGE":
      return `Illegal edge: ${e.reason}.`;
    case "DUPLICATE_EDGE":
      return `Already connected: ${e.reason}.`;
    default:
      return e.code;
  }
};

const nextName = (bag: Record<string, { name: string }>, base: string): string => {
  const taken = new Set(Object.values(bag).map((n) => n.name));
  let i = 1;
  while (taken.has(`${base}${i}`)) i++;
  return `${base}${i}`;
};

const hintStyle: React.CSSProperties = {
  position: "absolute",
  top: 12,
  left: 12,
  padding: "6px 12px",
  background: "rgba(37,99,235,0.95)",
  color: "#fff",
  borderRadius: 4,
  fontSize: 13,
  pointerEvents: "none",
};

const errStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 12,
  left: 12,
  padding: "8px 12px",
  background: "#fee",
  border: "1px solid #f99",
  color: "#900",
  borderRadius: 4,
  fontSize: 13,
  cursor: "pointer",
};

export default function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
