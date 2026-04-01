import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { callTool } from "../../bridge";
import { CopyButton, PanelHeader, PillButton, ToolbarFooter } from "../../components/tool";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import type { EnvFileFormat } from "../../bindings/EnvFileFormat";
import type { EnvEntry } from "../../bindings/EnvEntry";
import type { EnvParseInput } from "../../bindings/EnvParseInput";
import type { EnvParseOutput } from "../../bindings/EnvParseOutput";

const TOOL_ID = "env-parser";
const RUST_COMMAND = "env_parse";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;

const FORMAT_LABELS: Record<EnvFileFormat, string> = {
  auto: "Auto",
  env: ".env",
  properties: ".properties",
  ini: ".ini",
};

const FORMAT_PLACEHOLDERS: Record<EnvFileFormat, string> = {
  auto: "Paste .env, .properties, or .ini content…",
  env: "Paste .env content…",
  properties: "Paste .properties content…",
  ini: "Paste .ini content…",
};

const EXT_TO_FORMAT: Partial<Record<string, EnvFileFormat>> = {
  env: "env",
  properties: "properties",
  ini: "ini",
  cfg: "ini",
};

function SectionRow({ name }: { name: string }) {
  return (
    <tr>
      <td
        colSpan={4}
        className="border-b border-border-light bg-slate-100/60 px-3 py-1.5 font-mono text-[11px] font-semibold text-slate-500 dark:border-border-dark dark:bg-slate-800/60 dark:text-slate-400"
      >
        [{name}]
      </td>
    </tr>
  );
}

function EntryRow({
  entry,
  isDuplicate,
}: {
  entry: EnvEntry;
  isDuplicate: boolean;
}) {
  if (entry.isComment) {
    return (
      <tr className="border-b border-border-light/40 dark:border-border-dark/40">
        <td className="px-3 py-1.5 font-mono text-[11px] text-slate-500">{entry.lineNumber}</td>
        <td colSpan={3} className="px-3 py-1.5 font-mono text-[11px] italic text-slate-500 dark:text-slate-500">
          {entry.key}
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border-light/60 hover:bg-slate-50 dark:border-border-dark/60 dark:hover:bg-slate-800/30">
      <td className="px-3 py-1.5 font-mono text-[11px] text-slate-400">{entry.lineNumber}</td>
      <td className="px-3 py-1.5 font-mono text-xs text-slate-700 dark:text-slate-200">{entry.key}</td>
      <td className="max-w-xs break-all px-3 py-1.5 font-mono text-xs text-slate-600 dark:text-slate-300">
        {entry.value || <span className="italic text-slate-400">empty</span>}
      </td>
      <td className="px-3 py-1.5">
        <div className="flex flex-wrap gap-1">
          {entry.isEmptyValue && (
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-600 dark:text-amber-400">
              empty
            </span>
          )}
          {isDuplicate && (
            <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] text-red-600 dark:text-red-400">
              duplicate
            </span>
          )}
          {entry.isQuoted && (
            <span className="rounded bg-slate-500/15 px-1.5 py-0.5 text-[10px] text-slate-500 dark:text-slate-400">
              quoted
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

function EnvParserTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [content, setContent] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [format, setFormat] = useState<EnvFileFormat>("auto");
  const [maskValues, setMaskValues] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<"all" | "error" | "warning">("all");
  const [output, setOutput] = useState<EnvParseOutput | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);
  useRestoreStringDraft(TOOL_ID, setContent);

  const handleFileUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileName(file.name);
      const ext = file.name.startsWith(".")
        ? file.name.slice(1).toLowerCase()
        : (file.name.split(".").pop()?.toLowerCase() ?? "");
      const detected = EXT_TO_FORMAT[ext];
      if (detected) setFormat(detected);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result;
        if (typeof text === "string") {
          setContent(text);
          setDraft(text);
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [setDraft]
  );

  const run = useCallback(
    async (currentContent: string, currentFormat: EnvFileFormat, currentMask: boolean) => {
      if (!currentContent.trim()) {
        setOutput(null);
        return;
      }
      const payload: EnvParseInput = {
        content: currentContent,
        format: currentFormat,
        maskValues: currentMask,
      };
      const result = (await callTool(RUST_COMMAND, payload, {
        skipHistory: true,
      })) as EnvParseOutput;
      setOutput(result);

      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
      historyDebounceRef.current = setTimeout(() => {
        addHistoryEntry(TOOL_ID, { input: payload, output: result, timestamp: Date.now() });
        historyDebounceRef.current = null;
      }, HISTORY_DEBOUNCE_MS);
    },
    [addHistoryEntry]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      run(content, format, maskValues);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [content, format, maskValues, run]);

  const detectedLabel =
    output && format === "auto"
      ? `Detected: ${FORMAT_LABELS[output.detectedFormat]}`
      : null;

  const metaLabel = output
    ? [
        `${output.totalVars} vars`,
        output.emptyVars > 0 && `${output.emptyVars} empty`,
        output.duplicateKeys.length > 0 && `${output.duplicateKeys.length} duplicate`,
        detectedLabel,
      ]
        .filter(Boolean)
        .join(" · ")
    : "No output";

  const visibleIssues =
    output?.issues.filter(
      (i) => severityFilter === "all" || i.severity === severityFilter
    ) ?? [];

  return (
    <div className="flex h-full flex-col bg-background-light font-display text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <div className="flex min-h-0 flex-1">
        {/* Left — input */}
        <div className="flex min-w-0 flex-1 flex-col border-r border-border-light dark:border-border-dark">
          <PanelHeader
            label=""
            children={
              <>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {fileName ?? "Input"}
                </span>
                {fileName ? (
                  <button
                    type="button"
                    onClick={() => {
                      setFileName(null);
                      setContent("");
                      setDraft("");
                    }}
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
                    accept=".env,.properties,.ini,.cfg"
                    onChange={handleFileUpload}
                  />
                </label>
              </>
            }
          />
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setDraft(e.target.value);
            }}
            placeholder={FORMAT_PLACEHOLDERS[format]}
            className="min-h-0 flex-1 resize-none bg-transparent p-4 font-mono text-xs text-slate-700 placeholder:text-slate-500 focus:outline-none dark:text-slate-300"
          />
        </div>

        {/* Right — parsed output */}
        <div className="flex min-w-0 flex-1 flex-col">
          <PanelHeader label="Parsed Entries" meta={metaLabel} />
          <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
            {!content.trim() && (
              <div className="p-4 text-sm text-slate-500">
                Paste content on the left to parse.
              </div>
            )}
            {output && (
              <>
                <table className="w-full text-xs">
                  <thead className="sticky top-0 border-b border-border-light bg-panel-light dark:border-border-dark dark:bg-panel-dark">
                    <tr className="text-slate-500">
                      <th className="px-3 py-2 text-left font-medium">Line</th>
                      <th className="px-3 py-2 text-left font-medium">Key</th>
                      <th className="px-3 py-2 text-left font-medium">Value</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {output.entries.map((entry, i) => {
                      if (entry.isSection) {
                        return <SectionRow key={`section-${i}`} name={entry.key} />;
                      }
                      return (
                        <EntryRow
                          key={`${entry.lineNumber}-${i}`}
                          entry={entry}
                          isDuplicate={output.duplicateKeys.includes(entry.key)}
                        />
                      );
                    })}
                  </tbody>
                </table>

                {output.issues.length > 0 && (
                  <div className="space-y-1.5 border-t border-border-light p-3 dark:border-border-dark">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Issues
                    </p>
                    <div className="flex items-center gap-1.5 px-0 pt-1">
                      {(["all", "error", "warning"] as const).map((s) => {
                        const count =
                          s === "all"
                            ? output.issues.length
                            : output.issues.filter((i) => i.severity === s).length;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setSeverityFilter(s)}
                            className={`rounded px-2 py-0.5 text-[10px] font-medium capitalize transition-colors ${
                              severityFilter === s
                                ? s === "error"
                                  ? "bg-red-500/20 text-red-400"
                                  : s === "warning"
                                    ? "bg-amber-500/20 text-amber-400"
                                    : "bg-slate-500/20 text-slate-300"
                                : "text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            {s} ({count})
                          </button>
                        );
                      })}
                    </div>
                    {visibleIssues.map((issue, i) => (
                      <div
                        key={`${issue.lineNumber}-${i}`}
                        className={`rounded border px-3 py-2 text-xs ${
                          issue.severity === "error"
                            ? "border-red-500/20 bg-red-500/5 text-red-500 dark:text-red-400"
                            : "border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        <span className="mr-2 font-mono">L{issue.lineNumber}</span>
                        {issue.message}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <ToolbarFooter
        groups={[
          {
            label: "Format",
            children: (
              <>
                {(["auto", "env", "properties", "ini"] as EnvFileFormat[]).map((f) => (
                  <PillButton key={f} active={format === f} onClick={() => setFormat(f)}>
                    {FORMAT_LABELS[f]}
                  </PillButton>
                ))}
              </>
            ),
          },
          {
            label: "Options",
            children: (
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={maskValues}
                  onChange={(e) => setMaskValues(e.target.checked)}
                  className="h-3 w-3 accent-primary"
                />
                Mask secrets
              </label>
            ),
          },
          {
            label: "Export",
            children: (
              <>
                <CopyButton
                  value={output?.asJson || undefined}
                  label="Copy JSON"
                  variant="outline"
                />
                <CopyButton
                  value={output?.normalizedEnv || undefined}
                  label="Copy .env"
                  variant="outline"
                />
              </>
            ),
          },
          {
            end: true,
            children: (
              <button
                type="button"
                onClick={() => {
                  setContent("");
                  setFileName(null);
                  setDraft("");
                  setOutput(null);
                }}
                className="rounded-lg border border-border-light bg-panel-light px-3 py-1.5 text-xs text-slate-500 transition-colors hover:text-slate-700 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400 dark:hover:text-slate-200"
              >
                Clear
              </button>
            ),
          },
        ]}
      />
    </div>
  );
}

export default EnvParserTool;
