const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

// status per [day][hourSlot], hand-placed to look like a believable week
const BLOCKS: ("free" | "tentative" | "busy" | null)[][] = [
  [null, "busy", "busy", null, "free", "free", null, "tentative"],
  ["free", "free", null, "busy", "busy", null, null, "free"],
  [null, "busy", "busy", "busy", null, "free", "free", null],
  ["tentative", "free", null, null, "busy", "busy", null, "free"],
  [null, null, "free", "free", null, "busy", "tentative", null],
];

const COLOR: Record<string, string> = {
  free: "#2f8f5b",
  tentative: "#c8862c",
  busy: "#b0432c",
};

export function MockPlanner() {
  return (
    <div className="mock-frame w-full max-w-md p-4 text-[#12151a]">
      <div className="mb-3 flex items-center justify-between">
        <span className="mock-chip">My Planner</span>
        <span className="mock-chip rounded-full bg-[#eef0ec] px-2 py-0.5 text-[#2f8f5b]">
          Free
        </span>
      </div>

      <div className="mb-3 flex gap-1.5">
        {[
          { label: "Free", color: "#2f8f5b" },
          { label: "Tentative", color: "#c8862c" },
          { label: "Busy", color: "#b0432c" },
        ].map((s) => (
          <span
            key={s.label}
            className="mock-chip flex items-center gap-1 rounded-full border border-[#e2dfd5] px-2 py-1 text-[#5c5f5a]"
          >
            <span
              className="size-2 rounded-full"
              style={{ background: s.color }}
            />
            {s.label}
          </span>
        ))}
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
        {Array.from({ length: 8 }).map((_, hour) =>
          DAYS.map((d, dayIdx) => {
            const status = BLOCKS[dayIdx][hour];
            return (
              <div
                key={`${d}-${hour}`}
                className="h-4"
                style={{
                  background: status ? COLOR[status] : "#fff",
                  opacity: status ? 0.85 : 1,
                }}
              />
            );
          }),
        )}
      </div>

      <div className="mt-3 flex flex-col gap-1 rounded-md border border-dashed border-[#c8862c] bg-[#fdf6ea] px-3 py-2 text-[11px] text-[#5c5f5a] sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <span>Tue, 2–3pm marked Free</span>
        <span className="font-medium text-[#12151a]">Share with Roommates?</span>
      </div>
    </div>
  );
}
