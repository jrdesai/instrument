import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { callTool } from "../../bridge";
import { CopyButton } from "../../components/tool/CopyButton";
import { extractErrorMessage } from "../../lib/extractErrorMessage";

const RUST_COMMAND = "tool_sri_generate";

type InputMode = "file" | "text";

interface SriInput {
  contentB64: string;
}

interface SriOutput {
  sha256: string;
  sha384: string;
  sha512: string;
  error?: string | null;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function textToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const exact = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
  return arrayBufferToBase64(exact);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function SriGeneratorTool() {
  const [mode, setMode] = useState<InputMode>("file");
  const [textInput, setTextInput] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [contentB64, setContentB64] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [output, setOutput] = useState<SriOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runSri = useCallback(async (nextB64: string) => {
    if (!nextB64) return;
    setIsLoading(true);
    setError(null);
    try {
      const payload: SriInput = { contentB64: nextB64 };
      const result = (await callTool(RUST_COMMAND, payload, {
        skipHistory: true,
      })) as SriOutput;
      if (result.error) {
        setError(result.error);
        return;
      }
      setOutput(result);
    } catch (e) {
      setError(extractErrorMessage(e, "Failed to generate SRI hashes"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!contentB64) return;
    void runSri(contentB64);
  }, [contentB64, runSri]);

  function handleClear() {
    setTextInput("");
    setFileName(null);
    setFileSize(null);
    setContentB64("");
    setError(null);
    setOutput(null);
    setIsLoading(false);
  }

  const handleFileBuffer = useCallback((buffer: ArrayBuffer, name: string, size: number) => {
    setMode("file");
    setFileName(name);
    setFileSize(size);
    setTextInput("");
    setError(null);
    setContentB64(arrayBufferToBase64(buffer));
  }, []);

  const handleFileUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (result instanceof ArrayBuffer) {
          handleFileBuffer(result, file.name, file.size);
        } else {
          setError("Failed to read file bytes.");
        }
      };
      reader.onerror = () => {
        setError("Failed to read file — it may be locked or unreadable.");
      };
      reader.readAsArrayBuffer(file);
      e.target.value = "";
    },
    [handleFileBuffer]
  );

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (result instanceof ArrayBuffer) {
        handleFileBuffer(result, file.name, file.size);
      } else {
        setError("Failed to read file bytes.");
      }
    };
    reader.onerror = () => {
      setError("Failed to read file — it may be locked or unreadable.");
    };
    reader.readAsArrayBuffer(file);
  }

  const scriptSnippet = useMemo(() => {
    const integrity = output?.sha384 || "";
    return `<script src="" integrity="${integrity}" crossorigin="anonymous"></script>`;
  }, [output?.sha384]);

  const styleSnippet = useMemo(() => {
    const integrity = output?.sha384 || "";
    return `<link rel="stylesheet" href="" integrity="${integrity}" crossorigin="anonymous">`;
  }, [output?.sha384]);

  const hashRows = [
    { label: "SHA-256", value: output?.sha256 ?? "", recommended: false },
    { label: "SHA-384", value: output?.sha384 ?? "", recommended: true },
    { label: "SHA-512", value: output?.sha512 ?? "", recommended: false },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-background-light font-display text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <div className="flex flex-wrap items-center gap-2 border-b border-border-light px-4 py-2 dark:border-border-dark">
        <button
          type="button"
          onClick={() => setMode("file")}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            mode === "file"
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border-light text-slate-500 hover:text-primary dark:border-border-dark"
          }`}
        >
          File
        </button>
        <button
          type="button"
          onClick={() => setMode("text")}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            mode === "text"
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border-light text-slate-500 hover:text-primary dark:border-border-dark"
          }`}
        >
          Text
        </button>
        <div className="ml-auto">
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:text-primary dark:text-slate-300"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {mode === "file" ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={handleDrop}
            className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
              isDragging
                ? "border-primary/50 bg-primary/5"
                : "border-border-light dark:border-border-dark"
            }`}
          >
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Drag and drop a file here, or browse to upload.
            </p>
            <label className="mt-3 inline-flex cursor-pointer items-center rounded-lg border border-border-light bg-panel-light px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:text-primary dark:border-border-dark dark:bg-panel-dark dark:text-slate-300">
              Browse
              <input type="file" className="sr-only" onChange={handleFileUpload} />
            </label>
            {fileName ? (
              <p className="mt-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                {fileName} {fileSize != null ? `(${formatFileSize(fileSize)})` : ""}
              </p>
            ) : null}
          </div>
        ) : (
          <div>
            <label
              htmlFor="sri-text-input"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              Asset Content
            </label>
            <textarea
              id="sri-text-input"
              value={textInput}
              onChange={(e) => {
                const next = e.target.value;
                setTextInput(next);
                setFileName(null);
                setFileSize(null);
                if (!next) {
                  setContentB64("");
                  return;
                }
                setContentB64(textToBase64(next));
              }}
              placeholder="Paste JavaScript, CSS, or any text content..."
              className="h-40 w-full resize-y rounded-lg border border-border-light bg-background-light p-3 font-mono text-sm outline-none focus:ring-1 focus:ring-primary dark:border-border-dark dark:bg-panel-dark"
            />
          </div>
        )}

        {error ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" aria-live="polite">
            {error}
          </p>
        ) : null}

        <section className="mt-4 rounded-xl border border-border-light dark:border-border-dark">
          <header className="border-b border-border-light px-4 py-2 text-sm font-semibold dark:border-border-dark">
            Integrity Hashes
          </header>
          <div className="space-y-2 p-3">
            {isLoading ? (
              <div className="rounded-lg border border-border-light p-3 text-sm text-slate-500 animate-pulse dark:border-border-dark dark:text-slate-400">
                Generating hashes...
              </div>
            ) : null}
            {hashRows.map((row) => (
              <div
                key={row.label}
                className={`flex flex-wrap items-center gap-2 rounded-lg border p-2 ${
                  row.recommended
                    ? "border-primary/40 bg-primary/5"
                    : "border-border-light dark:border-border-dark"
                }`}
              >
                <div className="w-24 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  {row.label} {row.recommended ? "★" : ""}
                </div>
                <code className="min-w-0 flex-1 break-all font-mono text-xs text-slate-700 dark:text-slate-300">
                  {row.value || "—"}
                </code>
                <CopyButton
                  value={row.value || undefined}
                  aria-label={`Copy ${row.label}`}
                  variant="icon"
                />
              </div>
            ))}
          </div>
        </section>

        <details className="mt-4 rounded-xl border border-border-light dark:border-border-dark" open>
          <summary className="cursor-pointer list-none border-b border-border-light px-4 py-2 text-sm font-semibold dark:border-border-dark">
            HTML snippets
          </summary>
          <div className="space-y-4 p-3">
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Script tag (SHA-384)
                </p>
                <CopyButton value={scriptSnippet} label="Copy" />
              </div>
              <code className="block break-all rounded-lg border border-border-light bg-background-light p-3 font-mono text-xs dark:border-border-dark dark:bg-panel-dark">
                {scriptSnippet}
              </code>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Stylesheet (SHA-384)
                </p>
                <CopyButton value={styleSnippet} label="Copy" />
              </div>
              <code className="block break-all rounded-lg border border-border-light bg-background-light p-3 font-mono text-xs dark:border-border-dark dark:bg-panel-dark">
                {styleSnippet}
              </code>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}

export default SriGeneratorTool;
