const VOTES = { yes: 4, maybe: 1, no: 0 };
const MEMBERS = 6;
const total = VOTES.yes + VOTES.maybe + VOTES.no;
const pct = Math.round((VOTES.yes / MEMBERS) * 100);

export function MockProposal() {
  return (
    <div className="mock-frame w-full max-w-md p-4 text-[#12151a]">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold">Saturday game night</p>
          <p className="text-[11px] text-[#5c5f5a]">Sat, Jul 12 · 4:00–7:00pm</p>
        </div>
        <span className="mock-chip rounded-full border border-[#c8862c] px-2 py-0.5 text-[#c8862c]">
          Proposed
        </span>
      </div>

      <div className="mb-3 flex gap-2">
        {[
          { label: "Yes", count: VOTES.yes, color: "#2f8f5b" },
          { label: "Maybe", count: VOTES.maybe, color: "#c8862c" },
          { label: "No", count: VOTES.no, color: "#b0432c" },
        ].map((v) => (
          <div
            key={v.label}
            className="flex-1 rounded-md border border-[#e2dfd5] px-2 py-1.5 text-center"
          >
            <p className="text-sm font-semibold" style={{ color: v.color }}>
              {v.count}
            </p>
            <p className="mock-chip text-[#5c5f5a]">{v.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-1 flex h-1.5 overflow-hidden rounded-full bg-[#e2dfd5]">
        <div
          style={{ width: `${(VOTES.yes / total) * 100}%`, background: "#2f8f5b" }}
        />
        <div
          style={{ width: `${(VOTES.maybe / total) * 100}%`, background: "#c8862c" }}
        />
      </div>
      <p className="mb-3 text-[11px] text-[#5c5f5a]">
        {VOTES.yes} of {MEMBERS} members said yes ({pct}%)
      </p>

      <div className="flex flex-col gap-1 rounded-md bg-[#eef0ec] px-3 py-2 text-[11px] sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <span className="text-[#1f6d43]">Locks in automatically at 5 yes votes</span>
        <span className="font-medium text-[#12151a]">1 to go</span>
      </div>
    </div>
  );
}
