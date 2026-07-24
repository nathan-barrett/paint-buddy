import type { Paint } from "../types";

interface Props {
  projectName: string;
  needed: Paint[];
  ownedCount: number;
  usedCount: number;
  onToggleOwn: (paintId: string) => void;
  onClose: () => void;
}

export default function ShoppingList({
  projectName,
  needed,
  ownedCount,
  usedCount,
  onToggleOwn,
  onClose,
}: Props) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Shopping list — {projectName}</h2>
          <button className="clear" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="hint">
          {usedCount} paint{usedCount === 1 ? "" : "s"} used in this scheme · {ownedCount} owned ·{" "}
          <strong>{needed.length} to buy</strong>.
        </p>
        {needed.length === 0 ? (
          <p className="hint">You own everything this scheme needs. 🎉</p>
        ) : (
          <ul className="shopping">
            {needed.map((p) => (
              <li key={p.id} className="shop-item">
                <span className="chip" style={{ background: p.hex }} />
                <span className="match-info">
                  <span className="name">{p.name}</span>
                  <span className="line">
                    {p.line}
                    {p.range ? ` · ${p.range}` : ""}
                  </span>
                </span>
                <button className="own-btn" onClick={() => onToggleOwn(p.id)}>
                  Mark owned
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
