import type { Assignments, Pin } from "../types";
import { paintById } from "../data/paints";
import { displayColorForSteps } from "../recipe";

interface Props {
  title: string;
  pins: Pin[];
  assignments: Assignments;
  selectedPinId: string | null;
  onSelectPin: (id: string) => void;
  onRenamePin: (id: string, label: string) => void;
  onDeletePin: (id: string) => void;
  onRemoveStep: (pinId: string, index: number) => void;
}

export default function PinPanel({
  title,
  pins,
  assignments,
  selectedPinId,
  onSelectPin,
  onRenamePin,
  onDeletePin,
  onRemoveStep,
}: Props) {
  return (
    <div className="recipe">
      <h2>{title}</h2>
      {pins.length === 0 && <p className="hint">No pins yet — click the image to add one.</p>}
      <ul className="parts">
        {pins.map((pin, i) => {
          const steps = assignments[pin.id] ?? [];
          const selected = pin.id === selectedPinId;
          const previewHex = displayColorForSteps(steps);
          return (
            <li key={pin.id} className={`part${selected ? " selected" : ""}`}>
              <div className="part-head" onClick={() => onSelectPin(pin.id)}>
                <span className="pin-num" style={{ background: previewHex ?? "#39414f" }}>
                  {i + 1}
                </span>
                <span className="part-info">
                  <span className="part-name">{pin.label}</span>
                  <span className="part-paint">
                    {steps.length ? `${steps.length} step${steps.length > 1 ? "s" : ""}` : "unpainted"}
                  </span>
                </span>
                <button
                  className="clear"
                  title="Rename pin"
                  onClick={(e) => {
                    e.stopPropagation();
                    const label = window.prompt("Rename pin", pin.label);
                    if (label && label.trim()) onRenamePin(pin.id, label.trim());
                  }}
                >
                  ✎
                </button>
                <button
                  className="clear"
                  title="Delete pin"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePin(pin.id);
                  }}
                >
                  ×
                </button>
              </div>
              {selected && steps.length > 0 && (
                <ol className="steps">
                  {steps.map((step, idx) => {
                    const paint = paintById(step.paintId);
                    return (
                      <li key={idx} className="step">
                        <span
                          className="chip small"
                          style={{ background: paint ? paint.hex : "transparent" }}
                        />
                        <span className="step-type">{step.type}</span>
                        <span className="step-paint">{paint ? paint.name : "?"}</span>
                        <button
                          className="clear"
                          title="Remove step"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveStep(pin.id, idx);
                          }}
                        >
                          ×
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
