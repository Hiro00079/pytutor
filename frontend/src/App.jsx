import React, { useEffect, useState } from "react";
import Header from "./components/Header.jsx";
import SettingsModal from "./components/SettingsModal.jsx";
import TeachingPanel from "./panels/TeachingPanel.jsx";
import Codespace from "./panels/Codespace.jsx";
import Curriculum from "./panels/Curriculum.jsx";
import Progress from "./panels/Progress.jsx";
import { useSession } from "./hooks/useSession.js";
import * as api from "./api.js";

export default function App() {
  const session = useSession();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [provider, setProvider] = useState(null);
  const [focusPanel, setFocusPanel] = useState("teaching"); // teaching | code | curriculum | progress

  useEffect(() => {
    api.loadSettings().then((s) => setProvider(s.provider)).catch(() => {});
  }, []);

  const handleSend = async (message, mode, codeContext = null) => {
    setFocusPanel(mode === "REVIEW" ? "code" : "teaching");
    const ai = await session.sendMessage(message, mode, codeContext);
    if (ai?.curriculum_update) setFocusPanel("curriculum");
    if (ai?.progress_update) setFocusPanel("progress");
  };

  const handleReview = (code) => {
    handleSend("Please review my code.", "REVIEW", code);
  };

  if (session.loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-void">
        <p className="font-mono text-sm text-mute">starting session…</p>
      </div>
    );
  }

  if (session.error && !session.userId) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-void px-6 text-center">
        <p className="font-display text-lg text-ink">Can't reach the backend</p>
        <p className="max-w-md font-mono text-xs text-mute">{session.error}</p>
        <p className="font-mono text-xs text-mute">
          Run <code className="text-amber">uvicorn main:app --reload</code> inside{" "}
          <code className="text-amber">backend/</code>, then reload this page.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-void">
      <Header topic={session.topic} provider={provider} onOpenSettings={() => setSettingsOpen(true)} />

      <main className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2">
        <TeachingPanel
          messages={session.messages}
          sending={session.sending}
          error={session.error}
          onSend={handleSend}
          panelActive={focusPanel === "teaching"}
        />
        <Codespace
          code={session.lastEditorCode}
          setCode={session.setLastEditorCode}
          highlightLines={session.highlightLines}
          onReview={handleReview}
          sending={session.sending}
          panelActive={focusPanel === "code"}
        />
        <Curriculum curriculum={session.curriculum} panelActive={focusPanel === "curriculum"} />
        <Progress
          progress={session.progress}
          curriculum={session.curriculum}
          panelActive={focusPanel === "progress"}
        />
      </main>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={(s) => setProvider(s.provider)}
      />
    </div>
  );
}
