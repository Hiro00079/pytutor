import React from "react";

const STATE_STYLES = {
  done: { dot: "bg-teal", text: "text-teal", label: "done" },
  active: { dot: "bg-amber", text: "text-amber", label: "active" },
  locked: { dot: "bg-hairline", text: "text-mute", label: "locked" },
};

export default function Curriculum({ curriculum, panelActive }) {
  return (
    <section className={`relative flex flex-col overflow-hidden border-r border-hairline bg-panel ${panelActive ? "panel-active" : ""}`}>
      <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
        <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-mute">Curriculum</h2>
        <span className="font-mono text-[10px] text-mute">
          {curriculum.filter((t) => t.state === "done").length}/{curriculum.length}
        </span>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto px-2 py-2">
        {curriculum.map((t) => {
          const s = STATE_STYLES[t.state] || STATE_STYLES.locked;
          return (
            <div
              key={t.topic_name}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                t.state === "active" ? "bg-raised" : ""
              }`}
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
              <span className={`flex-1 ${t.state === "locked" ? "text-mute" : "text-ink"}`}>
                {t.topic_name}
              </span>
              <span className={`font-mono text-[10px] uppercase tracking-wider ${s.text}`}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
