import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { callTool } from "../../bridge";
import { CopyButton } from "../../components/tool";
import { CodeBlock } from "../../components/ui/CodeBlock";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import type { YamlFormatInput } from "../../bindings/YamlFormatInput";
import type { YamlFormatOutput } from "../../bindings/YamlFormatOutput";

const TOOL_ID = "yaml-formatter";
const RUST_COMMAND = "tool_yaml_format";
const DEBOUNCE_MS = 300;

export default function YamlFormatterTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [inputValue, setInputValue] = useState("");
  useRestoreStringDraft(TOOL_ID, setInputValue);
  const [output, setOutput] = useState<YamlFormatOutput | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runFormat = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setOutput(null);
      return;
    }
    try {
      const payload: YamlFormatInput = { value: trimmed };
      const result = (await callTool(RUST_COMMAND, payload)) as YamlFormatOutput;
      setOutput(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e ?? "Format failed");
      setOutput({ result: "", lineCount: 0, charCount: 0, error: message });
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!inputValue.trim()) {
      setOutput(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      runFormat(inputValue);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, runFormat]);

  const handleFileUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result;
        if (typeof text === "string") {
          setInputValue(text);
          setDraft(text);
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [setDraft]
  );

  const handleDownload = useCallback((content: string) => {
    const blob = new Blob([content], { type: "application/x-yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName ? `${fileName.replace(/\.[^.]+$/, "")}.yaml` : "formatted.yaml";
    a.click();
    URL.revokeObjectURL(url);
  }, [fileName]);

  const handleClear = useCallback(() => {
    setInputValue("");
    setDraft("");
    setFileName(null);
    setOutput(null);
  }, [setDraft]);

  return (
    <div className="flex h-full flex-col bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="flex min-w-0 flex-1 flex-col border-b border-border-light dark:border-border-dark md:border-b-0 md:border-r">
          <div className="flex items-center justify-between border-b border-border-light bg-panel-light px-4 py-2 dark:border-border-dark dark:bg-panel-dark min-h-[41px]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{fileName ?? "INPUT"}</span>
              <label className="cursor-pointer rounded-lg border border-border-light bg-panel-light px-2.5 py-0.5 text-xs text-slate-500 transition-colors hover:text-slate-700 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400 dark:hover:text-slate-200">
                Upload file
                <input type="file" className="sr-only" accept=".yaml,.yml,text/yaml,text/plain" onChange={handleFileUpload} />
              </label>
            </div>
            {inputValue.trim() ? <span className="text-xs text-slate-600">{inputValue.length.toLocaleString()} chars</span> : null}
          </div>
          <textarea
            className="flex-1 w-full min-h-[180px] md:min-h-0 p-4 font-mono text-xs bg-transparent resize-none border-none focus:outline-none leading-relaxed placeholder:text-slate-500"
            value={inputValue}
            placeholder={`name: Alice\nage: 30\nskills:\n  - Rust\n  - TypeScript`}
            onChange={(e) => {
              setInputValue(e.target.value);
              setDraft(e.target.value);
            }}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border-light bg-panel-light px-4 py-2 dark:border-border-dark dark:bg-panel-dark min-h-[41px]">
            <span className="text-xs uppercase tracking-wider text-slate-500">OUTPUT (YAML)</span>
            {output ? <span className="text-xs text-slate-600">{output.lineCount.toLocaleString()} lines</span> : null}
          </div>
          <div className="custom-scrollbar min-h-0 flex-1 overflow-auto">
            {output?.result ? <CodeBlock language="yaml" code={output.result} className="h-full" /> : <div className="h-full flex items-center justify-center text-xs text-slate-500">Enter YAML on the left.</div>}
          </div>
          {output?.error ? <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">{output.error}</div> : null}
        </div>
      </div>
      <footer className="shrink-0 border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark px-4 py-3">
        <div className="flex items-center gap-2 ml-auto justify-end">
          {output?.result && !output.error ? <button type="button" onClick={() => handleDownload(output.result)} className="rounded-lg border border-border-light bg-panel-light px-3 py-1.5 text-xs text-slate-500 transition-colors hover:text-slate-700 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400 dark:hover:text-slate-200">Download .yaml</button> : null}
          <CopyButton value={output?.result && !output.error ? output.result : undefined} label="Copy" variant="primary" className="py-1.5 text-[11px] font-semibold uppercase tracking-wider" />
          <button type="button" onClick={handleClear} className="rounded-md border border-border-light bg-panel-light px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors hover:bg-slate-100 dark:border-border-dark dark:bg-panel-dark dark:hover:bg-white/5">Clear</button>
        </div>
      </footer>
    </div>
  );
}
