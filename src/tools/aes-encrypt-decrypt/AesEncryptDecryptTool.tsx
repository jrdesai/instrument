import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { callTool } from "../../bridge";
import type { AesInput } from "../../bindings/AesInput";
import type { AesOutput } from "../../bindings/AesOutput";

const RUST_COMMAND = "aes_process";
const DEBOUNCE_MS = 150;
const COPIED_DURATION_MS = 1500;

function AesEncryptDecryptTool() {
  const [input, setInput] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<"encrypt" | "decrypt">("encrypt");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leftPanelPercent, setLeftPanelPercent] = useState(50);
  const [copyLabel, setCopyLabel] = useState("Copy output");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runProcess = useCallback(
    async (text: string, pass: string, currentMode: typeof mode) => {
      if (pass === "") {
        setOutput("");
        setError(null);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const payload: AesInput = {
          text,
          passphrase: pass,
          mode: currentMode,
        };
        const result = (await callTool(RUST_COMMAND, payload, {
          skipHistory: true,
        })) as AesOutput;
        setOutput(result.result ?? "");
        setError(result.error ?? null);
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : typeof e === "string"
              ? e
              : e && typeof e === "object" && "message" in e
                ? String((e as { message: unknown }).message)
                : e != null
                  ? String(e)
                  : "Failed to run tool";
        setError(message);
        setOutput("");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runProcess(input, passphrase, mode);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, passphrase, mode, runProcess]);

  const handleClear = useCallback(() => {
    setInput("");
    setPassphrase("");
    setOutput("");
    setError(null);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopyLabel("Copied");
      setTimeout(() => setCopyLabel("Copy output"), COPIED_DURATION_MS);
    } catch {
      setCopyLabel("Copy failed");
      setTimeout(() => setCopyLabel("Copy output"), COPIED_DURATION_MS);
    }
  }, [output]);

  const lines = input.split("\n").length;
  const charCount = input.length;
  const byteCount = new TextEncoder().encode(input).length;

  const isDragging = useRef(false);
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
  }, []);
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const pct = (e.clientX / window.innerWidth) * 100;
      setLeftPanelPercent(Math.min(90, Math.max(10, pct)));
    };
    const up = () => {
      isDragging.current = false;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div className="flex flex-1 min-h-0">
        {/* Input panel */}
        <div
          className="flex flex-col border-r border-border-light dark:border-border-dark shrink-0"
          style={{ width: `${leftPanelPercent}%` }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark text-xs text-slate-500 dark:text-slate-400 shrink-0">
            <span>Lines: {lines}</span>
            <span>Chars: {charCount}</span>
            <span>Bytes: {byteCount}</span>
          </div>
          <textarea
            aria-label={
              mode === "encrypt" ? "Plaintext to encrypt" : "Hex ciphertext to decrypt"
            }
            className="flex-1 w-full p-4 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-mono text-sm resize-none outline-none focus:ring-0 border-0"
            placeholder={
              mode === "encrypt"
                ? "Enter text to encrypt…"
                : "Paste hex from this tool (salt + nonce + ciphertext)…"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
          />
        </div>

        <button
          type="button"
          aria-label="Resize panels"
          className="w-1 shrink-0 bg-border-light dark:bg-border-dark hover:bg-primary/50 transition-colors cursor-col-resize"
          onMouseDown={handleDividerMouseDown}
        />

        {/* Output panel */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark text-xs text-slate-500 dark:text-slate-400 shrink-0">
            <span>Output</span>
            {isLoading && <span className="text-primary">Processing…</span>}
          </div>
          <pre
            aria-live="polite"
            aria-label="AES output"
            className={`flex-1 p-4 overflow-auto font-mono text-sm whitespace-pre-wrap break-all ${
              error ? "text-red-400" : "text-slate-700 dark:text-slate-300"
            }`}
          >
            {error ? error : output || (isLoading ? "…" : "")}
          </pre>
        </div>
      </div>

      <footer className="shrink-0 border-t border-border-light bg-panel-light px-4 py-3 dark:border-border-dark dark:bg-panel-dark">
        {/* Three aligned columns: label row, control row, helper row (spacers mirror passphrase helper height). */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-nowrap sm:items-stretch sm:gap-4">
          <div
            className="flex flex-col gap-1 border-border-light pb-2 sm:border-r sm:pr-4 dark:border-border-dark sm:pb-0"
            role="group"
            aria-label="Mode"
          >
            <span className="h-4 text-xs font-medium uppercase leading-4 tracking-wider text-slate-600 dark:text-slate-400">
              Mode
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label="Encrypt mode"
                onClick={() => setMode("encrypt")}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  mode === "encrypt"
                    ? "bg-primary text-white"
                    : "text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
                }`}
              >
                Encrypt
              </button>
              <button
                type="button"
                aria-label="Decrypt mode"
                onClick={() => setMode("decrypt")}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  mode === "decrypt"
                    ? "bg-primary text-white"
                    : "text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
                }`}
              >
                Decrypt
              </button>
            </div>
            <p className="pointer-events-none select-none text-[11px] leading-snug text-transparent" aria-hidden>
              Your passphrase and data never leave this device.
            </p>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <label
              htmlFor="aes-passphrase"
              className="h-4 text-xs font-medium uppercase leading-4 tracking-wider text-slate-600 dark:text-slate-400"
            >
              Passphrase
            </label>
            <input
              id="aes-passphrase"
              type="password"
              autoComplete="off"
              className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-dark dark:bg-background-dark dark:text-slate-100"
              placeholder="Enter passphrase…"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
            />
            <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-500">
              Your passphrase and data never leave this device.
            </p>
          </div>

          <div
            className="flex flex-col gap-1 sm:ml-0 sm:shrink-0"
            role="group"
            aria-label="Actions"
          >
            <span className="h-4 text-xs font-medium uppercase leading-4 tracking-wider text-slate-600 dark:text-slate-400">
              Actions
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-label="Copy output to clipboard"
                onClick={handleCopy}
                disabled={!output}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copyLabel}
              </button>
              <button
                type="button"
                aria-label="Clear all fields"
                onClick={handleClear}
                className="rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Clear
              </button>
            </div>
            <p className="pointer-events-none select-none text-[11px] leading-snug text-transparent" aria-hidden>
              Your passphrase and data never leave this device.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AesEncryptDecryptTool;
