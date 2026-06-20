import React, { useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import * as api from "../api.js";

export default function Codespace({ code, setCode, highlightLines, onReview, sending, panelActive }) {
  const editorRef = useRef(null);
  const decorationsRef = useRef([]);
  const [output, setOutput] = useState({ stdout: "", stderr: "", exitCode: null });
  const [running, setRunning] = useState(false);

  const onMount = (editor, monaco) => {
    editorRef.current = editor;
    applyHighlights(editor, monaco, highlightLines);
  };

  const applyHighlights = (editor, monaco, lines) => {
    if (!editor || !monaco) return;
    const decorations = (lines || []).map((line) => ({
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        className: "monaco-highlight-line",
        glyphMarginClassName: "monaco-highlight-glyph",
      },
    }));
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);
  };

  React.useEffect(() => {
    if (editorRef.current && window.monaco) {
      applyHighlights(editorRef.current, window.monaco, highlightLines);
    }
  }, [highlightLines]);

  const handleRun = async () => {
    setRunning(true);
    try {
      const result = await api.runCode(code);
      setOutput({ stdout: result.stdout, stderr: result.stderr, exitCode: result.exit_code });
    } catch (e) {
      setOutput({ stdout: "", stderr: e.message || "Couldn't run code — is the backend up?", exitCode: null });
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className={`relative flex flex-col overflow-hidden border-b border-hairline bg-panel ${panelActive ? "panel-active" : ""}`}>
      <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
        <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-mute">Codespace</h2>
        <div className="flex gap-2">
          <button
            onClick={() => onReview(code)}
            disabled={sending}
            className="rounded-md border border-hairline bg-raised px-3 py-1 font-mono text-[11px] text-mute transition hover:text-violet hover:border-violet/40 disabled:opacity-40"
          >
            Review
          </button>
          <button
            onClick={handleRun}
            disabled={running}
            className="rounded-md bg-teal px-3 py-1 font-mono text-[11px] font-medium text-void transition hover:brightness-110 disabled:opacity-40"
          >
            {running ? "Running…" : "▶ Run"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          defaultLanguage="python"
          theme="vs-dark"
          value={code}
          onChange={(val) => setCode(val ?? "")}
          onMount={onMount}
          options={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 12 },
          }}
        />
      </div>

      <div className="scrollbar-thin h-28 shrink-0 overflow-y-auto border-t border-hairline bg-void px-4 py-2 font-mono text-xs">
        {output.stdout && <pre className="whitespace-pre-wrap text-ink">{output.stdout}</pre>}
        {output.stderr && <pre className="whitespace-pre-wrap text-danger">{output.stderr}</pre>}
        {!output.stdout && !output.stderr && (
          <span className="text-mute">output console — press Run</span>
        )}
      </div>
    </section>
  );
}
