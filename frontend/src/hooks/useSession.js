
use_session_js = """import { useState, useEffect, useCallback } from "react";
import { startSession, sendChat as apiSendChat, runCode as apiRunCode } from "./api";

// useSession — Manages the entire learning session state
// Pattern: Custom Hook — extracts complex state logic into a reusable function

export function useSession() {
  const [userId, setUserId] = useState(1);       // Default user (will auto-create)
  const [sessionId, setSessionId] = useState(null);
  const [topic, setTopic] = useState("");
  const [messages, setMessages] = useState([]);   // Full conversation history
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");           // Monaco editor content
  const [output, setOutput] = useState("");       // Code execution output
  const [quiz, setQuiz] = useState(null);         // Current quiz (if any)
  const [progress, setProgress] = useState([]);   // Skill tracking
  const [curriculum, setCurriculum] = useState([]); // Topic list
  const [aiResponse, setAiResponse] = useState(null); // Last parsed AI response

  // Initialize: resume or create session on mount
  useEffect(() => {
    async function init() {
      try {
        const session = await startSession(userId);
        setSessionId(session.session_id);
        setTopic(session.topic);
        setMessages(session.messages);
        setProgress(session.progress || []);
      } catch (err) {
        console.error("Failed to start session:", err);
      }
    }
    init();
  }, [userId]);

  // Send a message to the AI
  const sendChat = useCallback(
    async (text) => {
      if (!sessionId || !text.trim()) return;
      setLoading(true);
      setQuiz(null); // Clear previous quiz

      try {
        // Optimistically add user message to UI
        const userMsg = { role: "user", content: text };
        setMessages((prev) => [...prev, userMsg]);

        // Call backend
        const res = await apiSendChat(userId, sessionId, text);
        setAiResponse(res);

        // Add AI message to history
        const aiMsg = { role: "assistant", content: res.message || "" };
        setMessages((prev) => [...prev, aiMsg]);

        // Handle AI actions
        if (res.code) setCode(res.code);
        if (res.quiz) setQuiz(res.quiz);
        if (res.progress_update) {
          setProgress((prev) => {
            const existing = prev.find((p) => p.topic_name === res.progress_update.topic);
            if (existing) {
              return prev.map((p) =>
                p.topic_name === res.progress_update.topic
                  ? { ...p, score: res.progress_update.score, status: res.progress_update.score >= 100 ? "completed" : "in_progress" }
                  : p
              );
            }
            return [...prev, { topic_name: res.progress_update.topic, score: res.progress_update.score, status: "in_progress" }];
          });
        }

        return res;
      } catch (err) {
        console.error("Chat error:", err);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${err.message}` },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [userId, sessionId]
  );

  // Run code in the editor
  const runCode = useCallback(async () => {
    if (!code.trim()) return;
    setOutput("Running...");
    try {
      const res = await apiRunCode(code);
      const out = res.stdout + (res.stderr ? `\\n[STDERR]\\n${res.stderr}` : "");
      setOutput(out || "(no output)");
    } catch (err) {
      setOutput(`Error: ${err.message}`);
    }
  }, [code]);

  // Submit quiz answer
  const submitQuiz = useCallback(
    async (answer) => {
      if (!quiz) return;
      const isCorrect = answer === quiz.correct;
      const feedback = isCorrect
        ? `Correct! ${quiz.explanation}`
        : `Not quite. The correct answer was ${quiz.correct}. ${quiz.explanation}`;

      // Send feedback to AI so it knows the result
      await sendChat(`I answered "${answer}". ${feedback}`);
      setQuiz(null);
    },
    [quiz, sendChat]
  );

  return {
    userId,
    sessionId,
    topic,
    messages,
    loading,
    code,
    setCode,
    output,
    quiz,
    progress,
    curriculum,
    aiResponse,
    sendChat,
    runCode,
    submitQuiz,
    setCurriculum,
  };
}
"""

with open("pytutor/frontend/src/hooks/useSession.js", "w") as f:
    f.write(use_session_js)

print("✅ useSession.js written")
