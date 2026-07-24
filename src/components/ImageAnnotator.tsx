import type { Assignments, Pin } from "../types";
import { displayColorForSteps } from "../recipe";

interface Props {
  imageUrl: string;
  pins: Pin[];
  assignments: Assignments;
  selectedPinId: string | null;
  onAddPin: (x: number, y: number) => void;
  onSelectPin: (id: string) => void;
}

export default function ImageAnnotator({
  imageUrl,
  pins,
  assignments,
  selectedPinId,
  onAddPin,
  onSelectPin,
}: Props) {
  const addPinAt = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    onAddPin(Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y)));
  };

  return (
    <div className="image-annotator">
      <div className="image-wrap">
        <img src={imageUrl} alt="reference" draggable={false} onClick={addPinAt} />
        {pins.map((pin, i) => {
          const hex = displayColorForSteps(assignments[pin.id]);
          const selected = pin.id === selectedPinId;
          return (
            <button
              key={pin.id}
              className={`pin${selected ? " selected" : ""}`}
              style={{
                left: `${pin.x * 100}%`,
                top: `${pin.y * 100}%`,
                background: hex ?? "#cbd0d8",
              }}
              title={pin.label}
              onClick={(e) => {
                e.stopPropagation();
                onSelectPin(pin.id);
              }}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <p className="hint image-hint">Click the image to drop a pin, then assign paints to it.</p>
    </div>
  );
}
