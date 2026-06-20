import React, { useRef, useState } from "react";

function ResourceBadge({ resource }) {
  const icon = { article: "📄", video: "▶", docs: "📚", other: "🔗" }[resource.type] || "🔗";
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-raised px-3 py-1 font-mono text-[11px] text-mute transition hover:text-teal hover:border-teal/40"
    >
      <span>{icon}</span>
      {resource.label}
    </a>
  );
}

function QuizCard({ quiz, onAnswer, answered }) {
  const [selected, setSelected] = useState(null);

  const pick = (opt) => {
    if (answered) return;
    setSelected(opt);
    onAnswer(opt);
  };

  return (
    <div className="rounded-lg border border-violet/30 bg-violet-dim/10 p-4">
      <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-violet">Quiz</p>
      <p className="mb-3 text-sm text-ink">{quiz.question}</p>
      <div className="grid gap-2">
        {quiz.options.map((opt) => {
          const isCorrect = answered && opt === quiz.correct;
          const isWrongPick = answered && selected === opt && opt !== quiz.correct;
          return (
            <button
              key={opt}
              onClick={() => pick(opt)}
              disabled={answered}
              className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                isCorrect
                  ? "border-teal bg-teal/10 text-teal"
                  : isWrongPick
                  ? "border-danger bg-danger/10 text-danger"
                  : "border-hairline bg-raised text-ink hover:border-amber/40"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {answered && quiz.explanation && (
        <p className="mt-3 border-t border-hairline pt-3 text-xs text-mute">{quiz.explanation}</p>
      )}
    </div>
  );
}

function MessageBubble({ msg, onAnswerQuiz, answeredQuizzes }) {
  if (msg.role === "user") {
    return (
      <div className="ml-8 rounded-lg border border-hairline bg-raised px-4 py-2.5 text-sm text-ink">
        {msg.content}
      </div>
    );
  }
  const ai = msg.content;
  return (
    <div className="mr-8 space-y-3">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 h-5 w-5 shrink-0 rounded bg-gradient-to-br from-amber to-teal" />
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{ai.message}</p>
      </div>
      {ai.quiz && (
        <QuizCard
          quiz={ai.quiz}
          answered={answeredQuizzes.has(ai.quiz.question)}
          onAnswer={(opt) => onAnswerQuiz(ai.quiz, opt)}
        />
      )}
      {ai.resources?.length > 0 && (
        <div className="flex flex-wrap gap-2 pl-7">
          {ai.resources.map((r, i) => (
            <ResourceBadge key={i} resource={r} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TeachingPanel({ messages, sending, error, onSend, panelActive }) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef(null);
  const firedScrollRef = useRef(false);
  const [answeredQuizzes, setAnsweredQuizzes] = useState(new Set());

  const handleScroll = (e) => {
    const el = e.target;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    if (nearBottom && !firedScrollRef.current && !sending && messages.length > 0) {
      firedScrollRef.current = true;
      onSend("Let's continue — teach me the next concept.", "TEACH");
      setTimeout(() => (firedScrollRef.current = false), 4000);
    }
  };

  const handleAnswerQuiz = (quiz, opt) => {
    setAnsweredQuizzes((prev) => new Set(prev).add(quiz.question));
    const correct = opt === quiz.correct;
    onSend(
      `I answered "${opt}" — that is ${correct ? "correct" : "incorrect"}. ${
        correct ? "" : `The correct answer was "${quiz.correct}".`
      }`,
      "QUIZ"
    );
  };

  const submitQuestion = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    onSend(draft, "EXPLAIN");
    setDraft("");
  };

  return (
    <section className={`relative flex flex-col overflow-hidden border-b border-r border-hairline bg-panel ${panelActive ? "panel-active" : ""}`}>
      <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
        <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-mute">
          Teaching
        </h2>
        <span className="font-mono text-[10px] text-mute">scroll to advance</span>
      </div>

      <div ref={scrollRef} onScroll={handleScroll} className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !sending && (
          <p className="text-sm text-mute">
            Say hi below to start your first lesson — the tutor will pick the first curriculum topic.
          </p>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} msg={m} onAnswerQuiz={handleAnswerQuiz} answeredQuizzes={answeredQuizzes} />
        ))}
        {sending && (
          <div className="mr-8 flex items-center gap-2 text-xs text-mute">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber" />
            tutor is thinking…
          </div>
        )}
        {error && (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}
      </div>

      <form onSubmit={submitQuestion} className="flex gap-2 border-t border-hairline p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask a question, or type 'go' to start…"
          className="flex-1 rounded-md border border-hairline bg-raised px-3 py-2 text-sm text-ink placeholder:text-mute focus:border-amber/50"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded-md bg-amber px-4 py-2 text-sm font-medium text-void transition hover:brightness-110 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </section>
  );
}
