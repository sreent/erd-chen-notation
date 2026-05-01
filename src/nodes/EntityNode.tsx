import { Handle, NodeProps, Position } from "@xyflow/react";
import type { EntityNodeData } from "../lib/projection";

export default function EntityNode({
  data,
  selected,
}: NodeProps & { data: EntityNodeData }) {
  const inner: React.CSSProperties = {
    minWidth: 100,
    minHeight: 44,
    padding: "10px 18px",
    background: "#fff",
    border: "2px solid #222",
    borderRadius: 2,
    textAlign: "center",
    fontSize: 14,
    fontWeight: 500,
    boxShadow: selected ? "0 0 0 2px #2563eb" : "none",
  };
  const outer: React.CSSProperties = data.weak
    ? {
        padding: 4,
        border: "2px solid #222",
        borderRadius: 2,
        background: "transparent",
      }
    : {};

  return (
    <div style={outer}>
      <div style={inner}>{data.name}</div>
      <Handle type="source" position={Position.Top} style={handleStyle} />
      <Handle type="source" position={Position.Right} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
      <Handle type="source" position={Position.Left} style={handleStyle} />
      <Handle type="target" position={Position.Top} style={handleStyle} id="t-top" />
      <Handle type="target" position={Position.Right} style={handleStyle} id="t-right" />
      <Handle type="target" position={Position.Bottom} style={handleStyle} id="t-bottom" />
      <Handle type="target" position={Position.Left} style={handleStyle} id="t-left" />
    </div>
  );
}

const handleStyle: React.CSSProperties = {
  opacity: 0,
  width: 1,
  height: 1,
  pointerEvents: "none",
};
