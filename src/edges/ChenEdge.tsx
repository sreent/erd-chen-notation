import { EdgeProps, EdgeLabelRenderer, getStraightPath } from "@xyflow/react";
import type { ChenEdgeData } from "../lib/projection";

export default function ChenEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
}: EdgeProps & { data?: ChenEdgeData }) {
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });
  const stroke = selected ? "#2563eb" : "#222";

  return (
    <>
      <path id={id} className="react-flow__edge-path" d={edgePath} stroke={stroke} strokeWidth={1.5} fill="none" />
      {(data?.label || data?.role) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - 12}px)`,
              fontSize: 12,
              padding: "1px 4px",
              background: "rgba(255,255,255,0.85)",
              pointerEvents: "none",
              textAlign: "center",
              lineHeight: 1.2,
            }}
            className="nodrag nopan"
          >
            {data?.label && <div>{data.label}</div>}
            {data?.role && <div style={{ fontStyle: "italic", color: "#555" }}>{data.role}</div>}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
