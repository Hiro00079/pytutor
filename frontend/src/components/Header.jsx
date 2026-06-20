import React from "react";

function Gear({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V19.5a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H4.5a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.04 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09A1.7 1.7 0 0 0 11.64 4.5V4.5a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56h.09a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.56 1.04H19.5a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.04Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Header({ topic, provider, onOpenSettings }) {
  return (
    <header className="flex items-center justify-between border-b border-hairline bg-panel px-5 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-gradient-to-br from-amber to-teal text-xs font-bold text-void">
          PT
        </div>
        <div>
          <h1 className="font-display text-sm font-semibold tracking-wide text-ink">PyTutor AI</h1>
          <p className="font-mono text-[11px] text-mute">
            {topic ? `current topic — ${topic}` : "no topic started yet"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-full border border-hairline bg-raised px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-mute">
          {provider || "no provider"}
        </span>
        <button
          onClick={onOpenSettings}
          aria-label="Open settings"
          className="rounded-md border border-hairline bg-raised p-2 text-mute transition hover:text-amber hover:border-amber/40"
        >
          <Gear className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
