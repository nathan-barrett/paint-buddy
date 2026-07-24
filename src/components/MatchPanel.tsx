import { useMemo } from "react";
import { matchQuality, nearestPaints } from "../color";

export interface MatchTarget {
  hex: string;
  title: string;
  excludePaintId?: string;
  excludeLine?: string;
  onePerLine?: boolean;
}

interface Props {
  target: MatchTarget;
  ownedIds: Set<string>;
  onPick: (paintId: string) => void;
  onInspect: (paintId: string) => void;
  onToggleOwn: (paintId: string) => void;
  onClose: () => void;
}

export default function MatchPanel({
  target,
  ownedIds,
  onPick,
  onInspect,
  onToggleOwn,
  onClose,
}: Props) {
  const matches = useMemo(
    () =>
      nearestPaints(target.hex, {
        limit: target.onePerLine ? 8 : 10,
        excludePaintId: target.excludePaintId,
        excludeLine: target.excludeLine,
        onePerLine: target.onePerLine,
      }),
    [target]
  );

  return (
    <div className="match-panel">
      <div className="match-head">
        <span className="chip" style={{ background: target.hex }} />
        <strong>{target.title}</strong>
        <button className="clear" title="Close" onClick={onClose}>
          ×
        </button>
      </div>
      <ul className="matches">
        {matches.map(({ paint, distance }) => (
          <li key={paint.id} className="match">
            <button
              className={`star${ownedIds.has(paint.id) ? " owned" : ""}`}
              title={ownedIds.has(paint.id) ? "Owned" : "Mark as owned"}
              onClick={() => onToggleOwn(paint.id)}
            >
              {ownedIds.has(paint.id) ? "★" : "☆"}
            </button>
            <span className="chip" style={{ background: paint.hex }} />
            <span className="match-info" onClick={() => onPick(paint.id)}>
              <span className="name">{paint.name}</span>
              <span className="line">
                {paint.line}
                {paint.range ? ` · ${paint.range}` : ""} · {matchQuality(distance)} (ΔE{" "}
                {distance.toFixed(1)})
              </span>
            </span>
            <button className="inspect" title="Find similar to this" onClick={() => onInspect(paint.id)}>
              ≈
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
