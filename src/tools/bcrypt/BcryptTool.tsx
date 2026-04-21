import { useCallback, useState } from "react";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { callTool } from "../../bridge";
import { CopyButton, PillButton } from "../../components/tool";
import { extractErrorMessage } from "../../lib/extractErrorMessage";
import type { BcryptInput } from "../../bindings/BcryptInput";
import type { BcryptOutput } from "../../bindings/BcryptOutput";

const RUST_COMMAND = "tool_bcrypt_process";
const COST_OPTIONS = [10, 11, 12, 13] as const;
type CostOption = (typeof COST_OPTIONS)[number];

function BcryptTool() {
  const [mode, setMode] = useState<"hash" | "verify">("hash");
  const [password, setPassword] = useState("");
  const [hashInput, setHashInput] = useState("");
  const [cost, setCost] = useState<CostOption>(12);
  const [result, setResult] = useState<BcryptOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRun =
    mode === "hash"
      ? password.length > 0
      : password.length > 0 && hashInput.length > 0;

  const handleRun = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    // Yield to the browser so React can flush the loading state before the
    // WASM call blocks the main thread (bcrypt is intentionally slow).
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    try {
      const payload: BcryptInput = {
        mode,
        password,
        cost,
        hash: hashInput,
      };
      const output = (await callTool(RUST_COMMAND, payload, {
        skipHistory: true,
      })) as BcryptOutput;
      if (output.error) {
        setError(output.error);
      } else {
        setResult(output);
      }
    } catch (e) {
      setError(
        extractErrorMessage(
          e,
          mode === "hash" ? "Hashing failed" : "Verification failed"
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [mode, password, cost, hashInput]);

  const handleModeChange = useCallback((next: "hash" | "verify") => {
    setMode(next);
    setResult(null);
    setError(null);
  }, []);

  const handleClear = useCallback(() => {
    setPassword("");
    setHashInput("");
    setResult(null);
    setError(null);
  }, []);

  const hasContent = result !== null || error !== null;

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      {/* Options toolbar */}
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3 px-4 py-3 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
        {/* Mode */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
            Mode
          </div>
          <div className="flex gap-1" role="group" aria-label="Mode">
            <PillButton
              active={mode === "hash"}
              onClick={() => handleModeChange("hash")}
            >
              Hash
            </PillButton>
            <PillButton
              active={mode === "verify"}
              onClick={() => handleModeChange("verify")}
            >
              Verify
            </PillButton>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px self-stretch bg-border-light dark:bg-border-dark" />

        {/* Cost factor — hash mode only */}
        {mode === "hash" && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
              Cost
            </div>
            <div className="flex gap-1" role="group" aria-label="Cost factor">
              {COST_OPTIONS.map((c) => (
                <PillButton
                  key={c}
                  active={cost === c}
                  onClick={() => setCost(c)}
                  aria-label={`Cost factor ${c}`}
                >
                  {c}
                </PillButton>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="ml-auto flex items-end gap-2">
          <button
            type="button"
            onClick={handleClear}
            disabled={!password && !hashInput && !hasContent}
            aria-label="Clear all fields"
            className="rounded-lg px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleRun}
            disabled={isLoading || !canRun}
            aria-label={mode === "hash" ? "Hash password" : "Verify password"}
            className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading
              ? mode === "hash"
                ? "Hashing…"
                : "Verifying…"
              : mode === "hash"
                ? "Hash"
                : "Verify"}
          </button>
        </div>
      </div>

      {/* Input fields */}
      <div className="px-4 pt-4 pb-3 space-y-3 shrink-0">
        <div>
          <label
            htmlFor="bcrypt-password"
            className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5"
          >
            Password
          </label>
          <input
            id="bcrypt-password"
            type="password"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canRun && !isLoading) void handleRun();
            }}
            placeholder="Enter password…"
            className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {mode === "verify" && (
          <div>
            <label
              htmlFor="bcrypt-hash-input"
              className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5"
            >
              Hash
            </label>
            <input
              id="bcrypt-hash-input"
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={hashInput}
              onChange={(e) => setHashInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canRun && !isLoading) void handleRun();
              }}
              placeholder="$2b$12$…"
              className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}
      </div>

      {/* Output / state area */}
      <div className="flex flex-1 flex-col min-h-0">
        {/* Error */}
        {error && (
          <div className="mx-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {mode === "hash" ? `Hashing with cost ${cost}…` : "Verifying…"}
              </p>
              {mode === "hash" && cost >= 12 && (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Higher cost factors take longer on web
                </p>
              )}
            </div>
          </div>
        )}

        {/* Hash result */}
        {!isLoading && !error && result?.hash && (
          <div className="mx-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Hash
              </span>
              <CopyButton value={result.hash} label="Copy" aria-label="Copy bcrypt hash" />
            </div>
            <textarea
              readOnly
              aria-label="Bcrypt hash output"
              value={result.hash}
              rows={2}
              className="w-full rounded-lg border border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark px-3 py-2 font-mono text-sm text-slate-700 dark:text-slate-300 resize-none focus:outline-none"
              spellCheck={false}
            />
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Store this hash in your database — never the original password. Each click produces a
              different hash due to the random salt.
            </p>
          </div>
        )}

        {/* Verify result */}
        {!isLoading && !error && typeof result?.matches === "boolean" && (
          <div className="flex flex-1 items-start justify-center pt-6">
            {result.matches ? (
              <div className="flex flex-col items-center gap-2 text-center">
                <CheckCircle className="h-10 w-10 text-green-500" />
                <p className="text-base font-semibold text-green-600 dark:text-green-400">
                  Password matches
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  The password is correct for this hash.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center">
                <XCircle className="h-10 w-10 text-red-500" />
                <p className="text-base font-semibold text-red-600 dark:text-red-400">
                  No match
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  The password does not match this hash.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && !result && (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-slate-400 text-center px-4">
              {mode === "hash"
                ? "Enter a password and click Hash to generate a bcrypt hash."
                : "Enter a password and a bcrypt hash, then click Verify."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default BcryptTool;
