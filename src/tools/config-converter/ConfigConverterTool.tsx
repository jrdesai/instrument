import React, { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { CopyButton, PanelHeader, ToolbarFooter } from "../../components/tool";
import { CodeBlock } from "../../components/ui/CodeBlock";
import { callTool } from "../../bridge";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useFileDrop } from "../../hooks/useFileDrop";
import type { ConfigConvertInput } from "../../bindings/ConfigConvertInput";
import type { ConfigConvertOutput } from "../../bindings/ConfigConvertOutput";
import type { ConfigFormat } from "../../bindings/ConfigFormat";

type IndentOption = 2 | 4;

const RUST_COMMAND = "tool_config_convert";
const DRAFT_TOOL_ID = "config-converter";

const FORMAT_ORDER: ConfigFormat[] = ["Json", "Yaml", "Toml"];

const EXT_TO_FORMAT: Record<string, ConfigFormat> = {
  json: "Json",
  yaml: "Yaml",
  yml: "Yaml",
  toml: "Toml",
};

const FORMAT_TO_EXT: Record<ConfigFormat, string> = {
  Json: "json",
  Yaml: "yaml",
  Toml: "toml",
};

const FORMAT_TO_MIME: Record<ConfigFormat, string> = {
  Json: "application/json",
  Yaml: "text/yaml",
  Toml: "text/plain",
};

function nextFormatAfter(f: ConfigFormat): ConfigFormat {
  const i = FORMAT_ORDER.indexOf(f);
  return FORMAT_ORDER[(i + 1) % FORMAT_ORDER.length];
}

function formatLabel(f: ConfigFormat): string {
  switch (f) {
    case "Json":
      return "JSON";
    case "Yaml":
      return "YAML";
    case "Toml":
      return "TOML";
    default:
      return f;
  }
}

function validityLabel(from: ConfigFormat, valid: boolean): string {
  const name = formatLabel(from);
  return valid ? `✓ Valid ${name}` : `✗ Invalid ${name}`;
}

const ConfigConverterTool: React.FC = () => {
  const { setDraft } = useDraftInput(DRAFT_TOOL_ID);
  const [input, setInput] = useState("");
  useRestoreStringDraft(DRAFT_TOOL_ID, setInput);
  const [from, setFrom] = useState<ConfigFormat>("Yaml");
  const [to, setTo] = useState<ConfigFormat>("Json");
  const [indent, setIndent] = useState<IndentOption>(2);
  const [sortKeys, setSortKeys] = useState(false);
  const [output, setOutput] = useState<ConfigConvertOutput | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileDropError, setFileDropError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const hasInput = input.trim().length > 0;
  const showJsonOptions = to === "Json";

  const runProcess = useCallback(
    async (
      value: string,
      payload: Omit<ConfigConvertInput, "value">,
      skipHistory: boolean
    ) => {
      if (!value.trim()) {
        setOutput(null);
        setIsProcessing(false);
        return;
      }

      setIsProcessing(true);
      try {
        const full: ConfigConvertInput = { value, ...payload };
        const result = (await callTool(RUST_COMMAND, full, {
          skipHistory,
        })) as ConfigConvertOutput;
        setOutput(result);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Config convert failed", err);
        setOutput({
          result: "",
          isValidInput: false,
          error: err instanceof Error ? err.message : "Unknown error",
          errorLine: null,
          errorColumn: null,
          lineCount: 0,
          charCount: 0,
        });
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  const debouncedProcess = useMemo(() => {
    let timeout: number | undefined;
    return (
      nextInput: string,
      payload: Omit<ConfigConvertInput, "value">
    ) => {
      if (timeout !== undefined) {
        window.clearTimeout(timeout);
      }
      timeout = window.setTimeout(() => {
        void runProcess(nextInput, payload, true);
      }, 150);
    };
  }, [runProcess]);

  useEffect(() => {
    debouncedProcess(input, { from, to, indent, sortKeys });
  }, [input, from, to, indent, sortKeys, debouncedProcess]);

  const handleDownload = useCallback((content: string, downloadName: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadName;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const { isDragging, dropZoneProps } = useFileDrop({
    onFile: (text, filename) => {
      setFileDropError(null);
      const ext = filename.split(".").pop()?.toLowerCase() ?? "";
      setFileName(filename.replace(/\.[^.]+$/, ""));
      const detected = EXT_TO_FORMAT[ext];
      if (detected) {
        setFrom(detected);
        setTo((prevTo) => (prevTo === detected ? nextFormatAfter(detected) : prevTo));
      }
      setInput(text);
      setDraft(text);
    },
    onError: (msg) => setFileDropError(msg),
  });

  const handleFileUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileDropError(null);
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      setFileName(file.name.replace(/\.[^.]+$/, ""));
      const detected = EXT_TO_FORMAT[ext];
      if (detected) {
        setFrom(detected);
        setTo((prevTo) => (prevTo === detected ? nextFormatAfter(detected) : prevTo));
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        setInput(text);
        setDraft(text);
      };
      reader.onerror = () => {
        setFileDropError("Failed to read file — it may be locked or unreadable.");
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [setDraft]
  );

  const handleChangeInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setFileDropError(null);
    setInput(v);
    setDraft(v);
  };

  const handleBlurInput = () => {
    if (!input.trim()) return;
    void runProcess(input, { from, to, indent, sortKeys }, false);
  };

  const handleFromChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const f = e.target.value as ConfigFormat;
    setFrom(f);
    if (f === to) {
      setTo(nextFormatAfter(f));
    }
  };

  const handleToChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const t = e.target.value as ConfigFormat;
    if (t === from) {
      setTo(nextFormatAfter(from));
    } else {
      setTo(t);
    }
  };

  const handleSwap = () => {
    setFileDropError(null);
    setFrom(to);
    setTo(from);
    if (output?.isValidInput && output.result) {
      setInput(output.result);
      setDraft(output.result);
    }
  };

  const handleClear = () => {
    setInput("");
    setDraft("");
    setFileName(null);
    setFileDropError(null);
    setOutput(null);
  };

  const effectiveOutput = output;
  const isValid = !!effectiveOutput && effectiveOutput.isValidInput;

  const outputLanguage =
    to === "Json" ? "json" : to === "Yaml" ? "yaml" : "toml";

  const selectClass =
    "text-xs rounded-full border border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark px-2 py-0.5 text-slate-600 dark:text-slate-300 cursor-pointer max-w-[7.5rem] outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

  const indentPillClass = (value: IndentOption) =>
    [
      "px-2 py-0.5 rounded-full text-xs cursor-pointer transition-colors",
      indent === value
        ? "bg-primary/10 text-primary border border-primary/30"
        : "bg-panel-light dark:bg-panel-dark text-slate-500 dark:text-slate-400 border border-border-light dark:border-border-dark hover:bg-slate-200 dark:hover:bg-panel-light/40",
    ].join(" ");

  const inputPlaceholder = `Paste ${formatLabel(from)} here…`;

  return (
    <div className="flex flex-col h-full w-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div className="flex-1 flex flex-col min-h-0 border border-border-light dark:border-border-dark rounded-lg overflow-hidden bg-panel-light/60 dark:bg-panel-dark/60">
      {/* Two-panel row */}
      <div className="flex-1 flex flex-row min-h-0">
        <div
          className="relative flex flex-col w-1/2 border-r border-border-light dark:border-border-dark bg-panel-light/60 dark:bg-panel-dark/60"
          {...dropZoneProps}
        >
          {isDragging && (
            <div
              className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/50 bg-primary/5"
              aria-hidden
            >
              <span className="material-symbols-outlined text-[32px] text-primary/60">
                upload_file
              </span>
              <span className="text-sm font-medium text-primary/70">Drop file to load</span>
            </div>
          )}
          {fileDropError ? (
            <p className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-1.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {fileDropError}
            </p>
          ) : null}
          <PanelHeader
            className="border-border-light/80 bg-panel-light/80 dark:border-border-dark dark:bg-panel-dark/80"
            prependChildren
            label={fileName ?? "Input"}
            meta={`${input.length.toLocaleString()} chars`}
          >
            <select
              aria-label="Input format"
              className={selectClass}
              value={from}
              onChange={handleFromChange}
            >
              <option value="Json">JSON</option>
              <option value="Yaml">YAML</option>
              <option value="Toml">TOML</option>
            </select>
            {fileName ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ✕
              </button>
            ) : null}
            <label className="cursor-pointer rounded-lg border border-border-light bg-panel-light px-2.5 py-1 text-xs text-slate-500 transition-colors hover:text-slate-700 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400 dark:hover:text-slate-200">
              Upload file
              <input
                type="file"
                className="sr-only"
                accept=".json,.yaml,.yml,.toml"
                onChange={handleFileUpload}
              />
            </label>
          </PanelHeader>
          <textarea
            className="flex-1 w-full resize-none border-none outline-none bg-transparent font-mono text-xs text-slate-700 dark:text-slate-300 p-4 leading-relaxed"
            placeholder={inputPlaceholder}
            spellCheck={false}
            value={input}
            onChange={handleChangeInput}
            onBlur={handleBlurInput}
          />
        </div>

        <div className="flex flex-col w-1/2 bg-panel-light/40 dark:bg-panel-dark/40">
          <PanelHeader
            className="border-border-light/80 bg-panel-light/80 dark:border-border-dark dark:bg-panel-dark/80"
            prependChildren
            label="Output"
            meta={
              isValid && effectiveOutput
                ? `${effectiveOutput.lineCount.toLocaleString()} lines · ${effectiveOutput.charCount.toLocaleString()} chars`
                : undefined
            }
            badge={
              hasInput && effectiveOutput
                ? {
                    text: validityLabel(from, isValid),
                    variant: isValid ? "success" : "error",
                  }
                : undefined
            }
            suffix={
              isProcessing ? (
                <span className="text-xs text-slate-500">Processing…</span>
              ) : null
            }
          >
            <select
              aria-label="Output format"
              className={selectClass}
              value={to}
              onChange={handleToChange}
            >
              <option value="Json">JSON</option>
              <option value="Yaml">YAML</option>
              <option value="Toml">TOML</option>
            </select>
          </PanelHeader>

          <div className="flex-1 min-h-0">
            {!hasInput && (
              <div className="h-full flex flex-col items-center justify-center text-center px-8">
                <p className="text-slate-600 text-sm mb-2">
                  Paste {formatLabel(from)} on the left to convert to{" "}
                  {formatLabel(to)}.
                </p>
              </div>
            )}

            {hasInput && effectiveOutput && isValid && effectiveOutput.result && (
              <CodeBlock
                code={effectiveOutput.result}
                language={outputLanguage}
                maxHeight="100%"
                showCopyButton
              />
            )}

            {hasInput && effectiveOutput && isValid && !effectiveOutput.result && (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm px-4">
                Empty result.
              </div>
            )}

            {hasInput && effectiveOutput && !isValid && (
              <div className="h-full overflow-auto">
                <div className="p-4 text-red-400 text-sm font-mono space-y-1">
                  {effectiveOutput.error && (
                    <div>
                      {effectiveOutput.errorLine != null &&
                      effectiveOutput.errorColumn != null ? (
                        <span>
                          Line {effectiveOutput.errorLine}, Column{" "}
                          {effectiveOutput.errorColumn}: {effectiveOutput.error}
                        </span>
                      ) : (
                        <span>{effectiveOutput.error}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark/70 px-4 py-2 text-[11px] text-slate-500">
            <span className="font-semibold tracking-wide uppercase text-[10px]">
              Formats
            </span>
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-600 leading-relaxed">
              JSON for APIs and JS; YAML for Kubernetes and CI; TOML for Cargo and
              config files. Round-trips may change key order or representation.
            </p>
          </div>
        </div>
      </div>{/* end two-panel row */}

      <ToolbarFooter
        className="items-center px-4 py-2 text-xs text-slate-400"
        groups={[
          {
            children: (
              <button
                type="button"
                onClick={handleSwap}
                className="rounded-full border border-border-light bg-panel-light px-2 py-0.5 text-xs text-slate-600 transition-colors hover:bg-slate-200 dark:border-border-dark dark:bg-panel-dark dark:text-slate-300 dark:hover:bg-panel-light/40"
                title="Swap input/output formats (and move output text to input when valid)"
              >
                ⇄ Swap
              </button>
            ),
          },
          ...(showJsonOptions
            ? [
                {
                  label: "Indent",
                  children: (
                    <>
                      <button
                        type="button"
                        className={indentPillClass(2)}
                        onClick={() => setIndent(2)}
                      >
                        2 spaces
                      </button>
                      <button
                        type="button"
                        className={indentPillClass(4)}
                        onClick={() => setIndent(4)}
                      >
                        4 spaces
                      </button>
                    </>
                  ),
                },
                {
                  label: "Options",
                  children: (
                    <button
                      type="button"
                      onClick={() => setSortKeys((v) => !v)}
                      className={[
                        "rounded-full border px-2 py-0.5 text-xs transition-colors",
                        sortKeys
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border-light bg-panel-light text-slate-500 hover:bg-slate-200 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400 dark:hover:bg-panel-light/40",
                      ].join(" ")}
                    >
                      {sortKeys ? "Sort keys: on" : "Sort keys: off"}
                    </button>
                  ),
                },
              ]
            : []),
          {
            end: true,
            children: (
              <>
                {isValid && effectiveOutput?.result ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        handleDownload(
                          effectiveOutput.result,
                          fileName
                            ? `${fileName}.${FORMAT_TO_EXT[to] ?? "txt"}`
                            : `converted.${FORMAT_TO_EXT[to] ?? "txt"}`,
                          FORMAT_TO_MIME[to] ?? "text/plain"
                        )
                      }
                      className="rounded-lg border border-border-light bg-panel-light px-3 py-1 text-xs text-slate-500 transition-colors hover:text-slate-700 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      Download .{FORMAT_TO_EXT[to] ?? "txt"}
                    </button>
                    <CopyButton
                      value={effectiveOutput.result}
                      label="Copy"
                      variant="primary"
                      className="rounded-md bg-primary/90 px-3 py-1 text-xs hover:bg-primary"
                    />
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-md border border-border-light bg-panel-light px-3 py-1 text-xs text-slate-700 transition-colors hover:bg-slate-200 dark:border-border-dark dark:bg-panel-dark dark:text-slate-300 dark:hover:bg-panel-light/60"
                >
                  Clear
                </button>
              </>
            ),
          },
        ]}
      />
      </div>{/* end bordered container */}
    </div>
  );
};

export default ConfigConverterTool;
