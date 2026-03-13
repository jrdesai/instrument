import { useCallback, useEffect, useRef, useState } from "react";
import { callTool } from "../../bridge";

const RUST_COMMAND = "tool_expression_eval";
const DEBOUNCE_MS = 300;
const COPIED_DURATION_MS = 1500;

interface ExprEvalInput {
  expression: string;
}

interface ExprEvalOutput {
  result: string;
  success: boolean;
  error?: string | null;
}

function ExpressionEvaluatorTool() {
  const [expression, setExpression] = useState("");
  const [output, setOutput] = useState<ExprEvalOutput | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runEval = useCallback(async (expr: string) => {
    const trimmed = expr.trim();
    if (trimmed === "") {
      setOutput(null);
      return;
    }
    try {
      const payload: ExprEvalInput = { expression: trimmed };
      const result = (await callTool(RUST_COMMAND, payload)) as ExprEvalOutput;
      setOutput(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e ?? "Eval failed");
      setOutput({ result: "", success: false, error: message });
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = expression.trim();
    if (trimmed === "") {
      setOutput(null);
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }
    debounceRef.current = setTimeout(() => {
      runEval(expression);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [expression, runEval]);

  const handleCopy = useCallback(async () => {
    if (!output?.result) return;
    try {
      await navigator.clipboard.writeText(output.result);
      setCopyLabel("Copied");
      setTimeout(() => setCopyLabel("Copy"), COPIED_DURATION_MS);
    } catch {
      /* ignore */
    }
  }, [output]);

  const handleClear = useCallback(() => {
    setExpression("");
    setOutput(null);
  }, []);

  const isEmpty = expression.trim() === "";

  return (
    <div className="flex flex-col h-full bg-background-dark text-slate-100 font-display">
      <div className="flex flex-1 min-h-0 w-full">
        {/* Left panel — expression input */}
        <div className="flex flex-col flex-1 min-w-0 border-r border-border-dark">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border-dark bg-panel-dark shrink-0">
            <span className="text-slate-400 text-xs uppercase tracking-wider">
              Expression
            </span>
            {!isEmpty && (
              <span className="text-slate-600 text-xs">
                {expression.length.toLocaleString()} chars
              </span>
            )}
          </div>
          <textarea
            aria-label="Expression input"
            className="flex-1 w-full min-h-0 p-4 font-mono text-xs text-slate-300 bg-transparent resize-none border-none focus:outline-none leading-relaxed placeholder:text-slate-500"
            placeholder={"sqrt(2) + 3^2\npi * 2\nmin(10, 20) / max(3, 5)"}
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
          />
        </div>

        {/* Right panel — result */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border-dark bg-panel-dark shrink-0">
            <span className="text-slate-400 text-xs uppercase tracking-wider">
              Result
            </span>
          </div>
          <div className="flex-1 min-h-0 overflow-auto custom-scrollbar bg-background-dark flex items-center justify-center">
            {output?.success && output.result ? (
              <span className="font-mono text-2xl text-slate-100 select-all">
                {output.result}
              </span>
            ) : (
              <span className="text-xs text-slate-500 px-4">
                {isEmpty
                  ? "Enter an expression to evaluate."
                  : output
                    ? output.error ?? ""
                    : "Evaluating..."}
              </span>
            )}
          </div>
          {output?.error && (
            <div className="px-4 py-2 text-xs text-red-400 bg-red-950/40 border-t border-red-900">
              {output.error}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="shrink-0 border-t border-border-dark bg-panel-dark px-4 py-3">
        <div className="flex items-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!output?.result}
              className="px-3 py-1.5 rounded-md border border-border-dark bg-panel-dark text-[11px] font-semibold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
            >
              {copyLabel}
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={isEmpty && !output}
              className="px-3 py-1.5 rounded-md border border-border-dark bg-panel-dark text-[11px] font-semibold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default ExpressionEvaluatorTool;

