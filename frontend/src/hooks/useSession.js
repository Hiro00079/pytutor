import { useCallback, useEffect, useState } from "react";
import * as api from "../api.js";

const USER_ID_KEY = "pytutor.userId";

export function useSession() {
  const [userId, setUserId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [topic, setTopic] = useState(null);
  const [messages, setMessages] = useState([]); // [{role, content}] content is raw string for user, AIResponse-shaped obj for assistant
  const [curriculum, setCurriculum] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [lastEditorCode, setLastEditorCode] = useState("# Your code will appear here\n");
  const [lastQuiz, setLastQuiz] = useState(null);
  const [highlightLines, setHighlightLines] = useState([]);

  const init = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const storedId = localStorage.getItem(USER_ID_KEY);
      const data = await api.startSession({
        userId: storedId ? Number(storedId) : null,
        name: "Learner",
      });
      localStorage.setItem(USER_ID_KEY, String(data.user_id));
      setUserId(data.user_id);
      setSessionId(data.session_id);
      setTopic(data.topic);
      setCurriculum(data.curriculum);
      setProgress(data.progress);

      const parsedMessages = data.messages.map((m) => {
        if (m.role === "assistant") {
          try {
            return { role: "assistant", content: JSON.parse(m.content) };
          } catch {
            return { role: "assistant", content: { message: m.content, action: "explain" } };
          }
        }
        return m;
      });
      setMessages(parsedMessages);
      const lastAssistant = [...parsedMessages].reverse().find((m) => m.role === "assistant");
      if (lastAssistant?.content?.code) setLastEditorCode(lastAssistant.content.code);
    } catch (e) {
      setError(e.message || "Couldn't reach the PyTutor backend. Is it running on :8000?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  const refreshProgressAndCurriculum = useCallback(async (uid) => {
    const [p, c] = await Promise.all([api.getProgress(uid), api.getCurriculum(uid)]);
    setProgress(p.progress);
    setCurriculum(c.curriculum);
  }, []);

  const sendMessage = useCallback(
    async (message, mode = "TEACH", codeContext = null) => {
      if (!userId || !sessionId || !message.trim()) return;
      setSending(true);
      setError(null);
      setMessages((prev) => [...prev, { role: "user", content: message }]);
      try {
        const data = await api.sendChat({ userId, sessionId, message, mode, codeContext });
        const ai = data.ai;
        setMessages((prev) => [...prev, { role: "assistant", content: ai }]);
        if (ai.code) setLastEditorCode(ai.code);
        if (ai.quiz) setLastQuiz(ai.quiz);
        if (ai.highlight_lines?.length) setHighlightLines(ai.highlight_lines);
        if (ai.curriculum_update || ai.progress_update) {
          await refreshProgressAndCurriculum(userId);
        }
        return ai;
      } catch (e) {
        setError(e.message || "The tutor didn't respond. Check your provider settings.");
      } finally {
        setSending(false);
      }
    },
    [userId, sessionId, refreshProgressAndCurriculum]
  );

  return {
    userId,
    sessionId,
    topic,
    messages,
    curriculum,
    progress,
    loading,
    sending,
    error,
    setError,
    lastEditorCode,
    setLastEditorCode,
    lastQuiz,
    setLastQuiz,
    highlightLines,
    sendMessage,
    refreshProgressAndCurriculum,
  };
}
