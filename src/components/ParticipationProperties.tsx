import { useDiagramStore } from "../store/diagramStore";
import type { Cardinality, Participation } from "../model/types";
import { h3Style, hrStyle, inputStyle, labelStyle } from "./EntityProperties";

export default function ParticipationProperties({ edgeId }: { edgeId: string }) {
  const edge = useDiagramStore((s) => s.model.edges[edgeId]);
  const entity = useDiagramStore((s) =>
    edge?.kind === "participation" ? s.model.entities[edge.entityId] : undefined,
  );
  const relationship = useDiagramStore((s) =>
    edge?.kind === "participation"
      ? s.model.relationships[edge.relationshipId]
      : undefined,
  );
  const setParticipation = useDiagramStore((s) => s.setParticipation);
  const setCardinality = useDiagramStore((s) => s.setCardinality);
  const setRole = useDiagramStore((s) => s.setRole);

  if (!edge || edge.kind !== "participation" || !entity || !relationship) return null;

  return (
    <div>
      <h3 style={h3Style}>Participation</h3>
      <div style={{ fontSize: 13, color: "#444", marginBottom: 8 }}>
        <b>{entity.name}</b> ↔ <b>{relationship.name}</b>
      </div>

      <label style={labelStyle}>Participation</label>
      <RadioGroup
        value={edge.participation}
        options={[
          { value: "mandatory", label: "Mandatory (min = 1)" },
          { value: "optional", label: "Optional (min = 0)" },
          { value: "unspecified", label: "Unspecified" },
        ]}
        onChange={(v) =>
          setParticipation({ edgeId, participation: v as Participation })
        }
      />

      <label style={labelStyle}>Cardinality</label>
      <RadioGroup
        value={edge.cardinality}
        options={[
          { value: "one", label: "One (max = 1)" },
          { value: "many", label: "Many (max = N)" },
          { value: "unspecified", label: "Unspecified" },
        ]}
        onChange={(v) => setCardinality({ edgeId, cardinality: v as Cardinality })}
      />

      <hr style={hrStyle} />
      <label style={labelStyle}>Role (optional)</label>
      <input
        style={inputStyle}
        value={edge.role}
        placeholder="e.g., supervisor"
        onChange={(e) => setRole({ edgeId, role: e.target.value })}
      />
    </div>
  );
}

function RadioGroup({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      {options.map((o) => (
        <label
          key={o.value}
          style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}
        >
          <input
            type="radio"
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          <span style={{ fontSize: 13 }}>{o.label}</span>
        </label>
      ))}
    </div>
  );
}
