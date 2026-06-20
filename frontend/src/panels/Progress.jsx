
progress_jsx = """export default function Progress({ progress }) {
  const completed = progress.filter((p) => p.status === "completed").length;
  const inProgress = progress.filter((p) => p.status === "in_progress").length;
  const total = 10; // Default curriculum size
  const percent = Math.round((completed / total) * 100);

  // Calculate ring circumference for SVG progress ring
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col h-full bg-white border-t border-slate-200">
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-700">Progress</h2>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Progress Ring */}
        <div className="flex flex-col items-center">
          <div className="relative w-24 h-24">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-slate-700">{percent}%</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">{completed} of {total} topics completed</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-blue-600">{inProgress}</p>
            <p className="text-xs text-blue-500">In Progress</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-green-600">{completed}</p>
            <p className="text-xs text-green-500">Completed</p>
          </div>
        </div>

        {/* Skill Bars */}
        {progress.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Skills</h3>
            {progress.map((p, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">{p.topic_name}</span>
                  <span className="text-slate-500">{p.score}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      p.status === "completed" ? "bg-green-500" : "bg-blue-500"
                    }`}
                    style={{ width: `${p.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
"""

with open("pytutor/frontend/src/panels/Progress.jsx", "w") as f:
    f.write(progress_jsx)

print("✅ Progress.jsx written")
