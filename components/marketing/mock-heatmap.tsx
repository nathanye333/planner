const DAYS = ["Thu", "Fri", "Sat", "Sun"];

// density 0..4 (of 4 people free) per [day][hourSlot]
const DENSITY = [
  [0, 1, 2, 3, 4, 3, 1],
  [0, 0, 1, 2, 3, 2, 0],
  [1, 2, 3, 4, 4, 2, 1],
  [2, 3, 4, 4, 3, 1, 0],
];

function fill(level: number) {
  if (level === 0) return "#e2dfd5";
  const pct = level * 25;
  return `color-mix(in oklab, #2f8f5b ${pct}%, #e2dfd5)`;
}

const AVATARS = ["#c8862c", "#2f8f5b", "#b0432c", "#5c5f5a"];

export function MockHeatmap() {
  return (
    <div className="mock-frame w-full max-w-md p-4 text-[#12151a]">
      <div className="mb-3 flex items-center justify-between">
        <span className="mock-chip">Roommates · Find a time</span>
        <div className="flex -space-x-1.5">
          {AVATARS.map((c, i) => (
            <span
              key={i}
              className="size-5 rounded-full border-2 border-white"
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        <span className="mock-chip rounded-full bg-[#eef0ec] px-2 py-1 text-[#1f6d43]">
          Sat 4:00pm · 4/4 free
        </span>
        <span className="mock-chip rounded-full border border-[#e2dfd5] px-2 py-1 text-[#5c5f5a]">
          Sun 3:30pm · 4/4 free
        </span>
      </div>

      <div
        className="grid gap-[3px] rounded-md border border-[#e2dfd5] bg-[#e2dfd5] p-[3px]"
        style={{ gridTemplateColumns: `repeat(${DAYS.length}, 1fr)` }}
      >
        {DAYS.map((d) => (
          <div
            key={d}
            className="bg-white pb-1 text-center text-[10px] font-medium text-[#5c5f5a]"
          >
            {d}
          </div>
        ))}
        {Array.from({ length: 7 }).map((_, hour) =>
          DAYS.map((d, dayIdx) => {
            const level = DENSITY[dayIdx][hour];
            const isBest = dayIdx === 2 && hour === 4;
            return (
              <div
                key={`${d}-${hour}`}
                className="relative h-5"
                style={{ background: fill(level) }}
              >
                {isBest && (
                  <span className="absolute inset-0 rounded-[2px] ring-2 ring-[#1f6d43]" />
                )}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
