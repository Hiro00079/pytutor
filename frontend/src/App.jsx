
teaching_panel_jsx = """import { useRef, useEffect } from "react";

export default function TeachingPanel({ messages, topic, loading, onSend }) {
  const bottomRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="flex flex-col h-full bg-slate-50 border-r border-slate-200">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">Teaching</h2>
          <p className="text-xs text-slate-500">{topic || "Loading..."}</p>
        </div>
        {loading && (
          <span className="text-xs text-blue-500 animate-pulse">AI is thinking...</span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 mt-10">
            <p className="text-sm">Welcome to PyTutor AI!</p>
            <p className="text-xs mt-1">Ask a question or say "start" to begin.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-blue-500 text-white rounded-br-none"
                  : "bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-lg rounded-bl-none px-3 py-2 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.target.elements.msg;
            if (input.value.trim()) {
              onSend(input.value.trim());
              input.value = "";
            }
          }}
          className="flex gap-2"
        >
          <input
            name="msg"
            type="text"
            placeholder="Ask a question..."
            className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
"""

with open("pytutor/frontend/src/panels/TeachingPanel.jsx", "w") as f:
    f.write(teaching_panel_jsx)

print("✅ TeachingPanel.jsx written")



codespace_jsx = """import { useEffect, useRef } from "react";

export default function Codespace({ code, setCode, output, onRun, highlightLines = [] }) {
  const editorRef = useRef(null);
  const textareaRef = useRef(null);

  // Simple textarea-based editor (Monaco requires build tooling, we'll use this for now)
  // In production, you'd swap this for @monaco-editor/react
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.value = code;
    }
  }, [code]);

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200">
      {/* Toolbar */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Codespace</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setCode("")}
            className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800 border border-slate-300 rounded hover:bg-slate-100 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={onRun}
            className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors font-medium"
          >
            Run ▶
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          defaultValue={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full h-full p-4 font-mono text-sm text-slate-800 bg-white resize-none focus:outline-none leading-relaxed"
          spellCheck={false}
          placeholder="# Python code will appear here..."
        />
      </div>

      {/* Output Panel */}
      <div className="h-1/3 border-t border-slate-200 flex flex-col">
        <div className="px-4 py-1 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">Output</span>
          {output && (
            <button
              onClick={() => setCode("")}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>
        <pre className="flex-1 p-3 overflow-auto font-mono text-xs text-slate-700 bg-slate-50">
          {output || "Click Run to execute code..."}
        </pre>
      </div>
    </div>
  );
}
"""

with open("pytutor/frontend/src/panels/Codespace.jsx", "w") as f:
    f.write(codespace_jsx)

print("✅ Codespace.jsx written")


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
