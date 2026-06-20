
app_jsx = """import { useState, useEffect } from "react";
import { useSession } from "./hooks/useSession";
import { getCurriculum } from "./api";
import TeachingPanel from "./panels/TeachingPanel";
import Codespace from "./panels/Codespace";
import Curriculum from "./panels/Curriculum";
import Progress from "./panels/Progress";
import QuizOverlay from "./panels/QuizOverlay";
import SettingsPanel from "./panels/SettingsPanel";

// App.jsx — The root component. Holds the 4-panel layout and orchestrates state.
// Pattern: Container Component — holds all state, passes it down to presentational panels.

export default function App() {
  const session = useSession();
  const [showSettings, setShowSettings] = useState(false);
  const [curriculum, setCurriculum] = useState([]);

  // Load curriculum once we have a userId
  useEffect(() => {
    if (session.userId) {
      getCurriculum(session.userId).then((c) => setCurriculum(c.topics));
    }
  }, [session.userId]);

  // Handle user sending a message
  const handleSend = (text) => {
    session.sendChat(text).then((res) => {
      // If AI updated curriculum, refresh it
      if (res?.curriculum_update) {
        getCurriculum(session.userId).then((c) => setCurriculum(c.topics));
      }
    });
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 overflow-hidden">
      {/* Header */}
      <header className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐍</span>
          <h1 className="text-sm font-bold text-slate-800">PyTutor AI</h1>
          <span className="text-xs text-slate-400 ml-2">{session.topic}</span>
        </div>
        <div className="flex items-center gap-3">
          {session.loading && (
            <span className="text-xs text-blue-500 animate-pulse">AI thinking...</span>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* 4-Panel Grid */}
      <main className="flex-1 grid grid-cols-2 grid-rows-2 min-h-0">
        {/* Top Left: Teaching */}
        <div className="min-h-0 overflow-hidden">
          <TeachingPanel
            messages={session.messages}
            topic={session.topic}
            loading={session.loading}
            onSend={handleSend}
          />
        </div>

        {/* Top Right: Codespace */}
        <div className="min-h-0 overflow-hidden">
          <Codespace
            code={session.code}
            setCode={session.setCode}
            output={session.output}
            onRun={session.runCode}
            highlightLines={session.aiResponse?.highlight_lines || []}
          />
        </div>

        {/* Bottom Left: Curriculum */}
        <div className="min-h-0 overflow-hidden">
          <Curriculum curriculum={curriculum} progress={session.progress} />
        </div>

        {/* Bottom Right: Progress */}
        <div className="min-h-0 overflow-hidden">
          <Progress progress={session.progress} />
        </div>
      </main>

      {/* Quiz Overlay */}
      <QuizOverlay quiz={session.quiz} onSubmit={session.submitQuiz} />

      {/* Settings Modal */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
"""

with open("pytutor/frontend/src/App.jsx", "w") as f:
    f.write(app_jsx)

print("✅ App.jsx written")
