
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
