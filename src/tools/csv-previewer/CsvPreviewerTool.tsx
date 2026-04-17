import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useLocation } from "react-router-dom";
import { CopyButton, PillButton } from "../../components/tool";
import { callTool } from "../../bridge";
import { extractErrorMessage } from "../../lib/extractErrorMessage";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useFileDrop } from "../../hooks/useFileDrop";
import type { CsvPreviewInput } from "../../bindings/CsvPreviewInput";
import type { CsvPreviewOutput } from "../../bindings/CsvPreviewOutput";

const RUST_COMMAND = "tool_csv_preview";
const TOOL_ID = "csv-previewer";
const DEBOUNCE_MS = 200;

type Delimiter = "," | "\t" | "|" | ";";

function CsvPreviewerTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [inputValue, setInputValue] = useState("");
  useRestoreStringDraft(TOOL_ID, setInputValue);
  const [hasHeaders, setHasHeaders] = useState(true);
  const [delimiter, setDelimiter] = useState<Delimiter>(",");
  const [output, setOutput] = useState<CsvPreviewOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileDropError, setFileDropError] = useState<string | null>(null);
  const [leftPanelPercent, setLeftPanelPercent] = useState(40);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();

  // Accept CSV pasted in via navigation state from other tools (e.g. CSV↔JSON, Fake Data Generator)
  useEffect(() => {
    const state = location.state as { csv?: string; delimiter?: string } | null;
    if (state?.csv) {
      setInputValue(state.csv);
      setDraft(state.csv);
      if (state.delimiter) setDelimiter(state.delimiter as Delimiter);
      window.history.replaceState({}, "");
    }
  }, [location.state, setDraft]);

  const runPreview = useCallback(
    async (text: string, currentHasHeaders: boolean, currentDelimiter: Delimiter) => {
      if (text.trim() === "") {
        setOutput(null);
        return;
      }
      setIsLoading(true);
      try {
        const payload: CsvPreviewInput = {
          text,
          hasHeaders: currentHasHeaders,
          delimiter: currentDelimiter,
          maxRows: 1000,
        };
        const result = (await callTool(RUST_COMMAND, payload, {
          skipHistory: true,
        })) as CsvPreviewOutput;
        setOutput(result);
      } catch (e) {
        setOutput({
          headers: [],
          rows: [],
          totalRows: 0,
          truncated: false,
          error: extractErrorMessage(e, "Failed to parse CSV"),
        });
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runPreview(inputValue, hasHeaders, delimiter);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, hasHeaders, delimiter, runPreview]);

  const { isDragging, dropZoneProps } = useFileDrop({
    onFile: (text, filename) => {
      setFileDropError(null);
      setFileName(filename);
      setInputValue(text);
      setDraft(text);
    },
    onError: (msg) => setFileDropError(msg),
  });

  const handleFileUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileDropError(null);
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result;
        if (typeof text === "string") {
          setInputValue(text);
          setDraft(text);
        }
      };
      reader.onerror = () => {
        setFileDropError("Failed to read file — it may be locked or unreadable.");
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [setDraft]
  );

  const handleClear = useCallback(() => {
    setInputValue("");
    setDraft("");
    setFileName(null);
    setFileDropError(null);
    setOutput(null);
  }, [setDraft]);

  // Draggable divider
  const isDraggingDiv = useRef(false);
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingDiv.current = true;
  }, []);
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!isDraggingDiv.current) return;
      setLeftPanelPercent(Math.min(70, Math.max(20, (e.clientX / window.innerWidth) * 100)));
    };
    const up = () => {
      isDraggingDiv.current = false;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  // Derived display state
  const isEmpty = inputValue.trim() === "";
  const hasError = Boolean(output?.error);
  const hasData = output && !output.error && output.rows.length > 0;
  const displayHeaders =
    output && output.headers.length > 0
      ? output.headers
      : output && output.rows.length > 0
        ? output.rows[0].map((_, i) => `Col ${i + 1}`)
        : [];
  // When has_headers is false, all rows are data rows.
  // When has_headers is true, rows does NOT include the header row.
  const dataRows = output?.rows ?? [];

  const statsLabel =
    output && !output.error && output.totalRows > 0
      ? output.truncated
        ? `Showing ${output.rows.length.toLocaleString()} of ${output.totalRows.toLocaleString()} rows · ${displayHeaders.length} cols`
        : `${output.totalRows.toLocaleString()} ${output.totalRows === 1 ? "row" : "rows"} · ${displayHeaders.length} cols`
      : null;

  return (
    <div className="flex h-full flex-col bg-background-light font-display text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <div className="flex min-h-0 flex-1">
        {/* Input panel */}
        <div
          className="relative flex shrink-0 flex-col border-r border-border-light dark:border-border-dark"
          style={{ width: `${leftPanelPercent}%` }}
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
              <span className="text-sm font-medium text-primary/70">Drop CSV file to load</span>
            </div>
          )}
          {fileDropError && (
            <p className="shrink-0 border-b border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {fileDropError}
            </p>
          )}
          <div className="flex min-h-[41px] shrink-0 items-center justify-between gap-2 border-b border-border-light bg-panel-light px-3 py-2 text-xs dark:border-border-dark dark:bg-panel-dark">
            <div className="flex min-w-0 items-center gap-2">
              <span className="font-medium text-slate-600 dark:text-slate-300">
                {fileName ?? "Input"}
              </span>
              {fileName && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  aria-label="Clear file"
                >
                  ✕
                </button>
              )}
              <label className="cursor-pointer rounded-lg border border-border-light bg-panel-light px-2.5 py-0.5 text-slate-500 transition-colors hover:text-slate-700 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400 dark:hover:text-slate-200">
                Upload CSV
                <input
                  type="file"
                  className="sr-only"
                  accept=".csv,.tsv,text/csv,text/plain"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
            {!isEmpty && (
              <span className="tabular-nums text-slate-500 dark:text-slate-400">
                {inputValue.length.toLocaleString()} chars
              </span>
            )}
          </div>
          <textarea
            aria-label="CSV input"
            className="h-full w-full flex-1 resize-none border-0 bg-background-light p-4 font-mono text-xs leading-relaxed text-slate-900 outline-none focus:ring-0 dark:bg-background-dark dark:text-slate-100"
            placeholder={"name,email,age\nAlice,alice@example.com,30\nBob,bob@example.com,25"}
            value={inputValue}
            onChange={(e) => {
              const v = e.target.value;
              setFileDropError(null);
              setInputValue(v);
              setDraft(v);
            }}
            spellCheck={false}
          />
        </div>

        {/* Draggable divider */}
        <button
          type="button"
          aria-label="Resize panels"
          className="w-1 shrink-0 cursor-col-resize bg-slate-200 transition-colors hover:bg-primary/50 dark:bg-slate-700"
          onMouseDown={handleDividerMouseDown}
        />

        {/* Output panel — table */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-[41px] shrink-0 items-center justify-between border-b border-border-light bg-panel-light px-3 py-2 text-xs dark:border-border-dark dark:bg-panel-dark">
            <span className="font-medium text-slate-600 dark:text-slate-300">Preview</span>
            <span className="text-slate-500 dark:text-slate-400">
              {isLoading ? (
                <span className="animate-pulse text-primary">Parsing…</span>
              ) : (
                statsLabel
              )}
            </span>
          </div>

          {hasData ? (
            <div className="custom-scrollbar flex-1 overflow-auto">
              <table className="w-max min-w-full border-collapse font-mono text-xs">
                <thead className="sticky top-0 z-10 bg-panel-light dark:bg-panel-dark">
                  <tr className="border-b-2 border-border-light dark:border-border-dark">
                    <th
                      scope="col"
                      className="w-10 select-none border-r border-border-light px-2 py-1.5 text-right font-normal text-slate-400 dark:border-border-dark dark:text-slate-600"
                    >
                      #
                    </th>
                    {displayHeaders.map((h, i) => (
                      <th
                        key={`h-${i}-${h.slice(0, 24)}`}
                        scope="col"
                        className="whitespace-nowrap border-r border-border-light px-3 py-1.5 text-left font-semibold text-slate-700 last:border-r-0 dark:border-border-dark dark:text-slate-300"
                        title={h.length > 30 ? h : undefined}
                      >
                        <span className="block max-w-[200px] truncate">{h}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataRows.map((row, rowIdx) => (
                    <tr
                      key={`r-${rowIdx}-${row[0]?.slice(0, 12) ?? ""}`}
                      className={`border-b border-border-light dark:border-border-dark ${
                        rowIdx % 2 === 0
                          ? "bg-background-light dark:bg-background-dark"
                          : "bg-slate-50 dark:bg-slate-900/40"
                      } hover:bg-primary/5 dark:hover:bg-primary/5`}
                    >
                      <td className="w-10 select-none border-r border-border-light px-2 py-1.5 text-right tabular-nums text-slate-400 dark:border-border-dark dark:text-slate-600">
                        {rowIdx + 1}
                      </td>
                      {row.map((cell, colIdx) => (
                        <td
                          key={`c-${rowIdx}-${colIdx}`}
                          className="border-r border-border-light px-3 py-1.5 text-slate-700 last:border-r-0 dark:border-border-dark dark:text-slate-300"
                          title={cell.length > 40 ? cell : undefined}
                        >
                          <span className="block max-w-[240px] truncate">{cell}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {output!.truncated && (
                <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                  Preview limited to {output!.rows.length.toLocaleString()} rows —{" "}
                  {(output!.totalRows - output!.rows.length).toLocaleString()} rows not shown.
                </div>
              )}
            </div>
          ) : hasError ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <p className="text-center font-mono text-sm text-red-500 dark:text-red-400">
                {output!.error}
              </p>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <span className="text-sm text-slate-400">
                {isEmpty ? "Paste CSV on the left to preview as a table" : "Output will appear here"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="flex shrink-0 flex-wrap items-center gap-4 border-t border-border-light bg-panel-light px-4 py-2 dark:border-border-dark dark:bg-panel-dark">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            aria-label="First row is header"
            checked={hasHeaders}
            onChange={(e) => setHasHeaders(e.target.checked)}
            className="rounded border-border-light bg-background-light text-primary focus:ring-primary dark:border-border-dark dark:bg-background-dark"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">First row is header</span>
        </label>

        <div className="flex items-center gap-1" role="group" aria-label="Delimiter">
          <PillButton active={delimiter === ","} onClick={() => setDelimiter(",")}>
            CSV
          </PillButton>
          <PillButton active={delimiter === "\t"} onClick={() => setDelimiter("\t")}>
            TSV
          </PillButton>
          <PillButton active={delimiter === "|"} onClick={() => setDelimiter("|")}>
            Pipe
          </PillButton>
          <PillButton active={delimiter === ";"} onClick={() => setDelimiter(";")}>
            Semi
          </PillButton>
        </div>

        <button
          type="button"
          aria-label="Clear input and output"
          onClick={handleClear}
          disabled={isEmpty}
          className="rounded-lg px-3 py-1 text-sm text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Clear
        </button>

        <div className="ml-auto">
          <CopyButton
            value={inputValue || undefined}
            label="Copy CSV"
            variant="primary"
            className="py-1"
            aria-label="Copy raw CSV to clipboard"
          />
        </div>
      </footer>
    </div>
  );
}

export default CsvPreviewerTool;
