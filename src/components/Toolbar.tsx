import { useDiagramStore } from "../store/diagramStore";
import { parseModel, serializeModel } from "../model/schema";

const MODES = [
  { id: "select", label: "Select" },
  { id: "connect", label: "Connect" },
  { id: "entity", label: "Entity" },
  { id: "attribute", label: "Attribute" },
  { id: "relationship", label: "Relationship" },
] as const;

export default function Toolbar() {
  const mode = useDiagramStore((s) => s.mode);
  const setMode = useDiagramStore((s) => s.setMode);
  const undo = useDiagramStore((s) => s.undo);
  const redo = useDiagramStore((s) => s.redo);
  const past = useDiagramStore((s) => s.past);
  const future = useDiagramStore((s) => s.future);
  const selection = useDiagramStore((s) => s.selection);
  const removeNode = useDiagramStore((s) => s.removeNode);
  const removeEdge = useDiagramStore((s) => s.removeEdge);
  const model = useDiagramStore((s) => s.model);
  const loadModel = useDiagramStore((s) => s.loadModel);

  const onSave = () => {
    const json = serializeModel(model);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onLoad = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        loadModel(parseModel(text));
      } catch (err) {
        alert(`Invalid diagram: ${(err as Error).message}`);
      }
    };
    input.click();
  };

  const onDelete = () => {
    if (!selection) return;
    if (model.edges[selection]) removeEdge({ edgeId: selection });
    else removeNode({ id: selection });
  };

  return (
    <div style={toolbarStyle}>
      <button style={btnStyle()} onClick={onSave}>Save</button>
      <button style={btnStyle()} onClick={onLoad}>Load</button>
      <span style={dividerStyle} />
      <button style={btnStyle(past.length === 0)} disabled={past.length === 0} onClick={undo}>Undo</button>
      <button style={btnStyle(future.length === 0)} disabled={future.length === 0} onClick={redo}>Redo</button>
      <span style={dividerStyle} />
      <button style={btnStyle(!selection)} disabled={!selection} onClick={onDelete}>Delete</button>
      <span style={dividerStyle} />
      {MODES.map((m) => (
        <button
          key={m.id}
          style={btnStyle(false, mode === m.id)}
          onClick={() => setMode(m.id)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

const toolbarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 12px",
  borderBottom: "1px solid #ddd",
  background: "#fafafa",
};

const dividerStyle: React.CSSProperties = {
  width: 1,
  alignSelf: "stretch",
  background: "#ddd",
  margin: "0 4px",
};

const btnStyle = (disabled = false, active = false): React.CSSProperties => ({
  padding: "6px 14px",
  border: active ? "1px solid #2563eb" : "1px solid #ccc",
  background: active ? "#eef4ff" : "#fff",
  color: disabled ? "#999" : active ? "#2563eb" : "#222",
  borderRadius: 4,
  cursor: disabled ? "not-allowed" : "pointer",
  fontSize: 13,
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: 0.5,
});
