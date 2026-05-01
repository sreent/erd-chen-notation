import { Handle, NodeProps, Position } from "@xyflow/react";
import type { RelationshipNodeData } from "../lib/projection";

export default function RelationshipNode({
  data,
  selected,
}: NodeProps & { data: RelationshipNodeData }) {
  const size = 110;
  const half = size / 2;
  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width={size}
        height={size}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <polygon
          points={`${half},4 ${size - 4},${half} ${half},${size - 4} 4,${half}`}
          fill="#fff"
          stroke="#222"
          strokeWidth={2}
        />
        {data.identifying && (
          <polygon
            points={`${half},12 ${size - 12},${half} ${half},${size - 12} 12,${half}`}
            fill="none"
            stroke="#222"
            strokeWidth={2}
          />
        )}
        {selected && (
          <polygon
            points={`${half},2 ${size - 2},${half} ${half},${size - 2} 2,${half}`}
            fill="none"
            stroke="#2563eb"
            strokeWidth={2}
          />
        )}
      </svg>
      <div
        style={{
          position: "relative",
          fontSize: 13,
          fontWeight: 500,
          textAlign: "center",
          maxWidth: size - 30,
          wordBreak: "break-word",
        }}
      >
        {data.name}
      </div>
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
