import React, { useEffect, useState } from "react";
import "./App.css";
const CELL_LABELS = [
  "Polished / Formal",
  "Polished / Neutral",
  "Polished / Casual",
  "Friendly / Formal",
  "Friendly / Neutral",
  "Friendly / Casual",
  "Playful / Formal",
  "Playful / Neutral",
  "Playful / Casual",
];

export default function App() {
  const [text, setText] = useState("Type your text here...");
  const [originalText, setOriginalText] = useState("");
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [loadingCell, setLoadingCell] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    const saved = localStorage.getItem("tone_tool_state");
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setText(s.text || "");
        setOriginalText(s.originalText || "");
        setUndoStack(s.undo || []);
        setRedoStack(s.redo || []);
      } catch (e) {
        console.warn(e);
      }
    } else setOriginalText(text);
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "tone_tool_state",
      JSON.stringify({ text, originalText, undo: undoStack, redo: redoStack })
    );
  }, [text, originalText, undoStack, redoStack]);
  const applyTone = async (cellId) => {
    if (loadingCell !== null) return;
    setError(null);
    setLoadingCell(cellId);
    setUndoStack((s) => [...s, text].slice(-50));
    setRedoStack([]);
    try {
      const res = await fetch("/api/tone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, cellId }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Bad response");
      setText(data.text);
    } catch (err) {
      setError(err.message || "Request failed");
      setUndoStack((s) => {
        const copy = [...s];
        copy.pop();
        return copy;
      });
    } finally {
      setLoadingCell(null);
    }
  };
  const undo = () => {
    if (!undoStack.length) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, text].slice(-50));
    setUndoStack((s) => s.slice(0, s.length - 1));
    setText(prev);
  };
  const redo = () => {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((s) => [...s, text].slice(-50));
    setRedoStack((r) => r.slice(0, r.length - 1));
    setText(next);
  };
  const reset = () => {
    setUndoStack((s) => [...s, text].slice(-50));
    setRedoStack([]);
    setText(originalText || "");
  };
  return (
    <div className="app">
      <div className="editor">
        <textarea value={text} onChange={(e) => setText(e.target.value)} />
        <div className="controls">
          <button onClick={undo} disabled={!undoStack.length}>
            Undo
          </button>
          <button onClick={redo} disabled={!redoStack.length}>
            Redo
          </button>
          <button onClick={reset}>Reset</button>
        </div>
        {error && <div className="error">{error}</div>}
      </div>
      <div className="picker">
        <div className="grid">
          {CELL_LABELS.map((label, idx) => (
            <button
              key={idx}
              className={`cell ${loadingCell === idx ? "loading" : ""}`}
              onClick={() => applyTone(idx)}
              disabled={loadingCell !== null}
            >
              <div className="labelTop">{label.split("/")[0]}</div>
              <div className="labelBottom">{label.split("/")[1]}</div>
              {loadingCell === idx && <div className="small">Processing…</div>}
            </button>
          ))}
        </div>
        <div className="hint">
          Click a tone cell to rewrite. Undo/Redo supported. Results cached
          server-side.
        </div>
      </div>
    </div>
  );
}
