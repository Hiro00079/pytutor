
quiz_jsx = """export default function QuizOverlay({ quiz, onSubmit }) {
  if (!quiz) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🧠</span>
          <h3 className="text-lg font-semibold text-slate-800">Quiz Time</h3>
        </div>

        <p className="text-sm text-slate-700 leading-relaxed">{quiz.question}</p>

        <div className="space-y-2">
          {quiz.options.map((option, i) => (
            <button
              key={i}
              onClick={() => onSubmit(option)}
              className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all active:scale-[0.98]"
            >
              <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
"""

with open("pytutor/frontend/src/panels/QuizOverlay.jsx", "w") as f:
    f.write(quiz_jsx)

print("✅ QuizOverlay.jsx written")
