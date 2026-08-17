import type { Assignments, PaintStep, PaintStepType, Part } from "../types";
import { EXTRA_TYPES, SLOT_TYPES } from "../types";
import { paintById } from "../data/paints";
import { displayColorForSteps, extraSteps, slotStep } from "../recipe";

export interface Target {
  kind: "slot" | "extra";
  type: PaintStepType;
}

interface Props {
  parts: Part[];
  assignments: Assignments;
  selectedPartId: string | null;
  activeTarget: Target | null;
  onAddPart: () => void;
  onSelectPart: (id: string) => void;
  onSetTarget: (t: Target) => void;
  onRenamePart: (id: string, label: string) => void;
  onDeletePart: (id: string) => void;
  onClearSlot: (partId: string, type: PaintStepType) => void;
  onRemoveExtra: (partId: string, extraIndex: number) => void;
}

export default function PartPanel({
  parts,
  assignments,
  selectedPartId,
  activeTarget,
  onAddPart,
  onSelectPart,
  onSetTarget,
  onRenamePart,
  onDeletePart,
  onClearSlot,
  onRemoveExtra,
}: Props) {
  const renderSlot = (partId: string, steps: PaintStep[], type: PaintStepType) => {
    const step = slotStep(steps, type);
    const paint = paintById(step?.paintId);
    const active = activeTarget?.kind === "slot" && activeTarget.type === type;
    return (
      <li
        key={type}
        className={`slot${active ? " active" : ""}`}
        onClick={() => onSetTarget({ kind: "slot", type })}
      >
        <span className="slot-label">{type}</span>
        <span className="chip" style={{ background: paint ? paint.hex : "transparent" }} />
        <span className="slot-paint">{paint ? paint.name : "— pick a paint —"}</span>
        {paint && (
          <button
            className="clear"
            title={`Clear ${type}`}
            onClick={(e) => {
              e.stopPropagation();
              onClearSlot(partId, type);
            }}
          >
            ×
          </button>
        )}
      </li>
    );
  };

  return (
    <div className="parts-panel">
      <div className="parts-panel-head">
        <h2>Parts</h2>
        <button className="add-part" onClick={onAddPart}>
          ＋ Add part
        </button>
      </div>

      {parts.length === 0 && (
        <p className="hint">
          Add the parts of your miniature (e.g. Helmet, Shoulder Pads, Bolter, Base), then
          give each one a paint recipe.
        </p>
      )}

      <ul className="parts">
        {parts.map((part) => {
          const steps = assignments[part.id] ?? [];
          const selected = part.id === selectedPartId;
          const extras = extraSteps(steps);
          return (
            <li key={part.id} className={`part${selected ? " selected" : ""}`}>
              <div className="part-head" onClick={() => onSelectPart(part.id)}>
                <span className="part-swatch" style={{ background: displayColorForSteps(steps) ?? "#39414f" }} />
                <span className="part-info">
                  <span className="part-name">{part.label}</span>
                  {!selected && (
                    <span className="slot-chips">
                      {SLOT_TYPES.map((t) => {
                        const paint = paintById(slotStep(steps, t)?.paintId);
                        return (
                          <span
                            key={t}
                            className="chip tiny"
                            title={`${t}: ${paint ? paint.name : "—"}`}
                            style={{ background: paint ? paint.hex : "#31363f" }}
                          />
                        );
                      })}
                    </span>
                  )}
                </span>
                <button
                  className="clear"
                  title="Rename part"
                  onClick={(e) => {
                    e.stopPropagation();
                    const label = window.prompt("Rename part", part.label);
                    if (label && label.trim()) onRenamePart(part.id, label.trim());
                  }}
                >
                  ✎
                </button>
                <button
                  className="clear"
                  title="Delete part"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePart(part.id);
                  }}
                >
                  ×
                </button>
              </div>

              {selected && (
                <div className="slots">
                  <ul className="slot-list">{SLOT_TYPES.map((t) => renderSlot(part.id, steps, t))}</ul>

                  {extras.length > 0 && (
                    <ul className="slot-list extras">
                      {extras.map((ex, idx) => {
                        const paint = paintById(ex.paintId);
                        return (
                          <li key={idx} className="slot extra-row">
                            <span className="slot-label">{ex.type}</span>
                            <span className="chip" style={{ background: paint ? paint.hex : "transparent" }} />
                            <span className="slot-paint">{paint ? paint.name : "?"}</span>
                            <button
                              className="clear"
                              title="Remove extra"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveExtra(part.id, idx);
                              }}
                            >
                              ×
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <label className="add-extra">
                    ＋ Extra
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) onSetTarget({ kind: "extra", type: e.target.value as PaintStepType });
                        e.target.value = "";
                      }}
                    >
                      <option value="">step…</option>
                      {EXTRA_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
