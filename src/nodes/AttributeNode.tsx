import { Handle, NodeProps, Position } from "@xyflow/react";
import type { AttributeNodeData } from "../lib/projection";

export default function AttributeNode({
  data,
  selected,
}: NodeProps & { data: AttributeNodeData }) {
  const underlineStyle: React.CSSProperties = data.unique
    ? {
        textDecoration: "underline",
        textDecorationStyle: data.ownerWeak ? "dashed" : "solid",
        textUnderlineOffset: 3,
      }
    : {};

  return (
    <div
      style={{
        minWidth: 80,
        minHeight: 36,
        padding: "8px 18px",
        background: "#fff",
        border: "2px solid #222",
        borderRadius: 999,
        textAlign: "center",
        fontSize: 13,
        fontWeight: 500,
        boxShadow: selected ? "0 0 0 2px #2563eb" : "none",
      }}
    >
      <span style={underlineStyle}>{data.name}</span>
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
