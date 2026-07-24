import { useMemo, useState } from "react";
import { PAINTS, PAINT_LINES } from "../data/paints";

interface Props {
  disabled: boolean;
  activePaintId?: string;
  hint?: string;
  ownedIds: Set<string>;
  onPick: (paintId: string) => void;
  onToggleOwn: (paintId: string) => void;
  onInspect: (paintId: string) => void;
  onPickColor: (hex: string) => void;
}

export default function PaintLibrary({
  disabled,
  activePaintId,
  hint,
  ownedIds,
  onPick,
  onToggleOwn,
  onInspect,
  onPickColor,
}: Props) {
  const [query, setQuery] = useState("");
  const [line, setLine] = useState<string>("All");
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [pickColor, setPickColor] = useState("#8a1a17");

  const paints = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PAINTS.filter((p) => {
      if (line !== "All" && p.line !== line) return false;
      if (ownedOnly && !ownedIds.has(p.id)) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, line, ownedOnly, ownedIds]);

  return (
    <div className="paint-library">
      <div className="controls">
        <input
          type="search"
          placeholder="Search paints…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={line} onChange={(e) => setLine(e.target.value)}>
          <option value="All">All lines</option>
          {PAINT_LINES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <div className="controls sub">
        <label className="owned-filter">
          <input
            type="checkbox"
            checked={ownedOnly}
            onChange={(e) => setOwnedOnly(e.target.checked)}
          />
          Owned only
        </label>
        <label className="color-pick" title="Find paints nearest to a color">
          Match color
          <input
            type="color"
            value={pickColor}
            onChange={(e) => {
              setPickColor(e.target.value);
              onPickColor(e.target.value);
            }}
          />
        </label>
      </div>

      {hint && <p className="hint">{hint}</p>}

      <div className="swatches">
        {paints.map((p) => (
          <div
            key={p.id}
            className={`swatch${p.id === activePaintId ? " active" : ""}`}
          >
            <button
              className={`star${ownedIds.has(p.id) ? " owned" : ""}`}
              title={ownedIds.has(p.id) ? "Owned" : "Mark as owned"}
              onClick={() => onToggleOwn(p.id)}
            >
              {ownedIds.has(p.id) ? "★" : "☆"}
            </button>
            <button
              className="pick"
              disabled={disabled}
              onClick={() => onPick(p.id)}
              title={`${p.name} — ${p.line}${p.range ? ` (${p.range})` : ""}`}
            >
              <span className="chip" style={{ background: p.hex }} />
              <span className="meta">
                <span className="name">{p.name}</span>
                <span className="line">
                  {p.line}
                  {p.range ? ` · ${p.range}` : ""}
                </span>
              </span>
            </button>
            <button
              className="inspect"
              title="Find similar paints in other brands"
              onClick={() => onInspect(p.id)}
            >
              ≈
            </button>
          </div>
        ))}
        {paints.length === 0 && <p className="hint">No paints match.</p>}
      </div>
    </div>
  );
}
