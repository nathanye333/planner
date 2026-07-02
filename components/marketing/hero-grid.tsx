// Fixed density pattern (not random) so the "best time" cell and the overall
// shape read the same on every load — this is meant to look like a real
// week of overlapping availability settling into a clear answer, not noise.
const PATTERN = [
  [0, 0, 1, 1, 0, 0, 0],
  [0, 1, 2, 2, 1, 0, 0],
  [1, 2, 3, 4, 2, 1, 0],
  [1, 2, 4, 4, 3, 1, 0],
  [0, 2, 3, 4, 2, 1, 0],
  [0, 1, 2, 2, 1, 0, 0],
  [0, 0, 1, 1, 0, 0, 0],
];

const BEST = { row: 3, col: 3 };

export function HeroGrid() {
  return (
    <div className="hero-grid" role="img" aria-label="Weekly availability grid highlighting the time everyone in the group is free">
      {PATTERN.flatMap((row, r) =>
        row.map((level, c) => {
          const delay = (r * 7 + c) * 22;
          const isBest = r === BEST.row && c === BEST.col;
          return (
            <div
              key={`${r}-${c}`}
              className={`hero-grid-cell${isBest ? " is-best" : ""}`}
              data-level={level}
              style={{ "--d": delay } as React.CSSProperties}
            />
          );
        }),
      )}
    </div>
  );
}
