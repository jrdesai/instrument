import { useCallback, useEffect, useRef, useState } from "react";
import { callTool } from "../../bridge";
import { CopyButton } from "../../components/tool";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import type { ExprEvalInput } from "../../bindings/ExprEvalInput";
import type { ExprEvalOutput } from "../../bindings/ExprEvalOutput";

const TOOL_ID = "expression-evaluator";
const RUST_COMMAND = "tool_expression_eval";
const DEBOUNCE_MS = 300;

function ExpressionEvaluatorTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [expression, setExpression] = useState("");
  useRestoreStringDraft(TOOL_ID, setExpression);
  const [output, setOutput] = useState<ExprEvalOutput | null>(null);
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

  const handleClear = useCallback(() => {
    setExpression("");
    setDraft("");
    setOutput(null);
  }, [setDraft]);

  const isEmpty = expression.trim() === "";

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div className="flex flex-1 min-h-0 w-full">
        {/* Left panel — expression input */}
        <div className="flex flex-col flex-1 min-w-0 border-r border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
            <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
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
            className="flex-1 w-full min-h-0 p-4 font-mono text-xs text-slate-700 dark:text-slate-300 bg-transparent resize-none border-none focus:outline-none leading-relaxed placeholder:text-slate-500"
            placeholder={"sqrt(2) + 3^2\npi * 2\nmin(10, 20) / max(3, 5)"}
            value={expression}
            onChange={(e) => {
              const v = e.target.value;
              setExpression(v);
              setDraft(v);
            }}
          />
        </div>

        {/* Right panel — result */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
            <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
              Result
            </span>
          </div>
          <div className="flex-1 min-h-0 overflow-auto custom-scrollbar bg-background-light dark:bg-background-dark flex items-center justify-center">
            {output?.success && output.result ? (
              <span className="font-mono text-2xl text-slate-900 dark:text-slate-100 select-all">
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
            <div className="px-4 py-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-t border-red-200 dark:border-red-900">
              {output.error}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="shrink-0 border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark px-4 py-3">
        <div className="flex items-center gap-6 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 ml-auto">
            <CopyButton
              value={
                output?.success && output.result ? output.result : undefined
              }
              label="Copy"
              variant="primary"
              className="py-1.5 text-[11px] font-semibold uppercase tracking-wider"
            />
            <button
              type="button"
              onClick={handleClear}
              disabled={isEmpty && !output}
              className="px-3 py-1.5 rounded-md border border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark text-[11px] font-semibold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
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

