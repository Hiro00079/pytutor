
curriculum_jsx = """export default function Curriculum({ curriculum, progress }) {
  // Merge curriculum with progress data
  const merged = curriculum.map((topic) => {
    const p = progress.find((pr) => pr.topic_name === topic.name);
    return { ...topic, ...p, status: p?.status || topic.status || "not_started" };
  });

  const statusIcon = {
    completed: "✅",
    in_progress: "🟡",
    not_started: "⚪",
  };

  const statusClass = {
    completed: "text-green-600 bg-green-50",
    in_progress: "text-yellow-600 bg-yellow-50",
    not_started: "text-slate-400 bg-slate-50",
  };

  return (
    <div className="flex flex-col h-full bg-white border-t border-r border-slate-200">
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-700">Curriculum</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {merged.length === 0 ? (
          <p className="text-xs text-slate-400 text-center mt-4">Loading curriculum...</p>
        ) : (
          merged.map((topic, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                topic.status === "in_progress"
                  ? "bg-blue-50 border border-blue-200"
                  : "hover:bg-slate-50"
              }`}
            >
              <span className="text-base">{statusIcon[topic.status] || "⚪"}</span>
              <span
                className={`flex-1 ${
                  topic.status === "not_started" ? "text-slate-400" : "text-slate-700"
                }`}
              >
                {topic.name}
              </span>
              {topic.score > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass[topic.status]}`}>
                  {topic.score}%
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
"""

with open("pytutor/frontend/src/panels/Curriculum.jsx", "w") as f:
    f.write(curriculum_jsx)

print("✅ Curriculum.jsx written")
