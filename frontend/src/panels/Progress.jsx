import React from "react";

function ProgressRing({ percent }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <svg viewBox="0 0 96 96" className="h-24 w-24 shrink-0">
      <circle cx="48" cy="48" r={r} fill="none" stroke="#262B35" strokeWidth="8" />
      <circle
        cx="48"
        cy="48"
        r={r}
        fill="none"
        stroke="url(#ringGradient)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 48 48)"
      />
      <defs>
        <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F0A84B" />
          <stop offset="100%" stopColor="#4FD1AE" />
        </linearGradient>
      </defs>
      <text x="48" y="53" textAnchor="middle" className="fill-ink font-display text-[20px] font-semibold">
        {percent}%
      </text>
    </svg>
  );
}

export default function Progress({ progress, curriculum, panelActive }) {
  const total = progress.length || 1;
  const completed = progress.filter((p) => p.status === "completed").length;
  const percent = Math.round((completed / total) * 100);
  const exercisesAttempted = progress.filter((p) => p.score > 0).length;

  const nextTopic = curriculum.find((t) => t.state === "active")?.topic_name
    || curriculum.find((t) => t.state === "locked")?.topic_name;

  const sorted = [...progress].sort((a, b) => {
    const order = curriculum.map((c) => c.topic_name);
    return order.indexOf(a.topic_name) - order.indexOf(b.topic_name);
  });

  return (
    <section className={`relative flex flex-col overflow-hidden bg-panel ${panelActive ? "panel-active" : ""}`}>
      <div className="border-b border-hairline px-4 py-2.5">
        <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-mute">Progress</h2>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-4 py-4">
        <div className="flex items-center gap-4">
          <ProgressRing percent={percent} />
          <div className="space-y-1">
            <p className="text-sm text-ink">
              <span className="font-display font-semibold">{completed}</span> of {total} topics complete
            </p>
            <p className="font-mono text-[11px] text-mute">{exercisesAttempted} exercises attempted</p>
            {nextTopic && (
              <p className="font-mono text-[11px] text-amber">next up — {nextTopic}</p>
            )}
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          {sorted.map((p) => (
            <div key={p.topic_name}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-ink">{p.topic_name}</span>
                <span className="font-mono text-[10px] text-mute">{p.score}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-hairline">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber to-teal transition-all"
                  style={{ width: `${p.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
