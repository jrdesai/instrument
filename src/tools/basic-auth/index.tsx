import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CopyButton } from "../../components/tool";
import { callTool } from "../../bridge";
import type { BasicAuthInput } from "../../bindings/BasicAuthInput";
import type { BasicAuthMode } from "../../bindings/BasicAuthMode";
import type { BasicAuthOutput } from "../../bindings/BasicAuthOutput";

const RUST_COMMAND = "tool_basic_auth";
const DEBOUNCE_MS = 150;

function OptionPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border-light text-slate-500 hover:bg-slate-100 dark:border-border-dark dark:text-slate-400 dark:hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

export default function BasicAuthTool() {
  const [mode, setMode] = useState<BasicAuthMode>("encode");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [headerInput, setHeaderInput] = useState("");
  const [output, setOutput] = useState<BasicAuthOutput | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runTool = useCallback(async (payload: BasicAuthInput) => {
    try {
      const result = (await callTool(RUST_COMMAND, payload, {
        skipHistory: true,
      })) as BasicAuthOutput;
      setOutput(result);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : e != null ? String(e) : "Request failed";
      setOutput({
        encoded: "",
        decodedUsername: "",
        decodedPassword: "",
        rawBase64: "",
        error: message,
      });
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (mode === "encode" && username === "" && password === "") {
        setOutput(null);
        debounceRef.current = null;
        return;
      }
      if (mode === "decode" && headerInput.trim() === "") {
        setOutput(null);
        debounceRef.current = null;
        return;
      }
      const payload: BasicAuthInput =
        mode === "encode"
          ? {
              mode: "encode",
              username,
              password,
              header: "",
            }
          : {
              mode: "decode",
              username: "",
              password: "",
              header: headerInput,
            };
      void runTool(payload);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [mode, username, password, headerInput, runTool]);

  const authHeaderLine =
    output && !output.error && output.encoded
      ? `Authorization: ${output.encoded}`
      : undefined;

  return (
    <div className="flex h-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
      <div className="shrink-0 border-b border-border-light px-4 py-3 dark:border-border-dark">
        <div className="flex flex-wrap gap-2">
          <OptionPill active={mode === "encode"} onClick={() => setMode("encode")}>
            Encode
          </OptionPill>
          <OptionPill active={mode === "decode"} onClick={() => setMode("decode")}>
            Decode
          </OptionPill>
        </div>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-auto p-4">
        {mode === "encode" ? (
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Username
                </div>
                <input
                  type="text"
                  className="w-full rounded-lg border border-border-light bg-panel-light px-3 py-2 text-sm dark:border-border-dark dark:bg-panel-dark"
                  value={username}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Password
                </div>
                <input
                  type="text"
                  className="w-full rounded-lg border border-border-light bg-panel-light px-3 py-2 text-sm dark:border-border-dark dark:bg-panel-dark"
                  value={password}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <div className="rounded-lg border border-border-light bg-panel-light p-4 dark:border-border-dark dark:bg-panel-dark">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Authorization header
                </span>
                <CopyButton
                  value={authHeaderLine}
                  label="Copy"
                  variant="primary"
                  className="py-1 text-[11px] font-semibold uppercase tracking-wider"
                />
              </div>
              <pre className="font-mono text-xs break-all text-slate-700 dark:text-slate-200">
                {output?.error
                  ? output.error
                  : authHeaderLine ?? "—"}
              </pre>
            </div>
            <div className="rounded-lg border border-border-light bg-panel-light p-4 dark:border-border-dark dark:bg-panel-dark">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Raw Base64
                </span>
                <CopyButton
                  value={output && !output.error ? output.rawBase64 : undefined}
                  label="Copy"
                  variant="outline"
                  className="py-1 text-[11px] font-semibold uppercase tracking-wider"
                />
              </div>
              <pre className="font-mono text-xs break-all text-slate-700 dark:text-slate-200">
                {output && !output.error ? output.rawBase64 || "—" : output?.error ? "—" : "—"}
              </pre>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Header value
              </div>
              <input
                type="text"
                className="w-full rounded-lg border border-border-light bg-panel-light px-3 py-2 font-mono text-sm dark:border-border-dark dark:bg-panel-dark"
                placeholder="Basic dXNlcjpwYXNz"
                value={headerInput}
                spellCheck={false}
                onChange={(e) => setHeaderInput(e.target.value)}
              />
            </div>
            {output?.error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                {output.error}
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border-light bg-panel-light p-4 dark:border-border-dark dark:bg-panel-dark">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Username
                  </span>
                  <CopyButton
                    value={output && !output.error ? output.decodedUsername : undefined}
                    label="Copy"
                    variant="outline"
                    className="py-1 text-[11px] font-semibold uppercase tracking-wider"
                  />
                </div>
                <div className="font-mono text-sm break-all text-slate-800 dark:text-slate-100">
                  {output && !output.error ? output.decodedUsername || "—" : "—"}
                </div>
              </div>
              <div className="rounded-lg border border-border-light bg-panel-light p-4 dark:border-border-dark dark:bg-panel-dark">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Password
                  </span>
                  <CopyButton
                    value={output && !output.error ? output.decodedPassword : undefined}
                    label="Copy"
                    variant="outline"
                    className="py-1 text-[11px] font-semibold uppercase tracking-wider"
                  />
                </div>
                <div className="font-mono text-sm break-all text-slate-800 dark:text-slate-100">
                  {output && !output.error ? output.decodedPassword || "—" : "—"}
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border-light bg-panel-light p-4 dark:border-border-dark dark:bg-panel-dark">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Raw Base64
                </span>
                <CopyButton
                  value={output && !output.error ? output.rawBase64 : undefined}
                  label="Copy"
                  variant="outline"
                  className="py-1 text-[11px] font-semibold uppercase tracking-wider"
                />
              </div>
              <pre className="font-mono text-xs break-all text-slate-700 dark:text-slate-200">
                {output && !output.error ? output.rawBase64 || "—" : "—"}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
