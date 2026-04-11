import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { twMerge } from "tailwind-merge";
import { callTool } from "../../bridge";
import { useDraftInput, useRestoreDraft } from "../../hooks/useDraftInput";
import { useFileDrop } from "../../hooks/useFileDrop";

const RUST_COMMAND = "tool_json_schema_validate";
const TOOL_ID = "json-schema-validator";
const DEBOUNCE_MS = 300;

type Draft = "draft7" | "2019-09" | "2020-12";

interface ValidationIssue {
  instancePath: string;
  message: string;
  schemaPath: string;
}

interface ValidateOutput {
  valid: boolean;
  errorCount: number;
  issues: ValidationIssue[];
  parseError?: string | null;
}

const DRAFT_OPTIONS: { label: string; value: Draft }[] = [
  { label: "Draft 7", value: "draft7" },
  { label: "2019-09", value: "2019-09" },
  { label: "2020-12", value: "2020-12" },
];

const panelHeaderClass =
  "flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0";

function JsonSchemaValidatorTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [document, setDocument] = useState("");
  const [schema, setSchema] = useState("");
  const [selectedDraft, setSelectedDraft] = useState<Draft>("draft7");
  const [output, setOutput] = useState<ValidateOutput | null>(null);
  const [documentFileDropError, setDocumentFileDropError] = useState<string | null>(null);
  const [schemaFileDropError, setSchemaFileDropError] = useState<string | null>(null);

  useRestoreDraft(TOOL_ID, (raw) => {
    const v = raw as { document?: string; schema?: string; draft?: Draft };
    if (typeof v?.document === "string") setDocument(v.document);
    if (typeof v?.schema === "string") setSchema(v.schema);
    if (v?.draft) setSelectedDraft(v.draft);
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runValidate = useCallback(
    async (doc: string, sch: string, draft: Draft) => {
      if (doc.trim() === "" && sch.trim() === "") {
        setOutput(null);
        return;
      }
      try {
        const result = (await callTool(RUST_COMMAND, {
          document: doc,
          schema: sch,
          draft,
        })) as ValidateOutput;
        setOutput(result);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e ?? "");
        setOutput({ valid: false, errorCount: 0, issues: [], parseError: msg });
      }
    },
    []
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runValidate(document, schema, selectedDraft);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [document, schema, selectedDraft, runValidate]);

  const handleClear = useCallback(() => {
    setDocument("");
    setSchema("");
    setDocumentFileDropError(null);
    setSchemaFileDropError(null);
    setOutput(null);
    setDraft({ document: "", schema: "", draft: selectedDraft });
  }, [selectedDraft, setDraft]);

  const { isDragging: isDocDragging, dropZoneProps: docDropZoneProps } = useFileDrop({
    onFile: (text) => {
      setDocumentFileDropError(null);
      setDocument(text);
      setDraft({ document: text, schema, draft: selectedDraft });
    },
    onError: (msg) => setDocumentFileDropError(msg),
  });

  const { isDragging: isSchemaDragging, dropZoneProps: schemaDropZoneProps } = useFileDrop({
    onFile: (text) => {
      setSchemaFileDropError(null);
      setSchema(text);
      setDraft({ document, schema: text, draft: selectedDraft });
    },
    onError: (msg) => setSchemaFileDropError(msg),
  });

  const handleDocumentUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setDocumentFileDropError(null);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        setDocument(text);
        setDraft({ document: text, schema, draft: selectedDraft });
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [schema, selectedDraft, setDraft]
  );

  const handleSchemaUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setSchemaFileDropError(null);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        setSchema(text);
        setDraft({ document, schema: text, draft: selectedDraft });
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [document, selectedDraft, setDraft]
  );

  const isEmpty = document.trim() === "" && schema.trim() === "";

  return (
    <div className="flex h-full flex-col bg-background-light font-display text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <div className="flex shrink-0 items-center gap-2 border-b border-border-light bg-panel-light px-4 py-2 dark:border-border-dark dark:bg-panel-dark">
        <span className="mr-1 text-xs text-slate-500 dark:text-slate-400">
          Draft
        </span>
        {DRAFT_OPTIONS.map((opt) => {
          const active = selectedDraft === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setSelectedDraft(opt.value);
                setDraft({ document, schema, draft: opt.value });
              }}
              className={twMerge(
                "rounded-md px-3 py-1 text-xs transition-colors",
                active
                  ? "bg-primary font-semibold text-white"
                  : "border border-border-light font-medium text-slate-600 hover:border-primary hover:text-primary dark:border-border-dark dark:text-slate-400"
              )}
            >
              {opt.label}
            </button>
          );
        })}
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleClear}
          className="rounded-md border border-border-light px-3 py-1 text-xs text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-800 dark:border-border-dark dark:hover:border-slate-500 dark:hover:text-slate-200"
        >
          Clear
        </button>
      </div>

      <div className="flex flex-col md:flex-row min-h-0 flex-1 border-b border-border-light dark:border-border-dark">
        <div
          className="relative flex min-w-0 flex-1 flex-col border-b md:border-b-0 md:border-r border-border-light dark:border-border-dark"
          {...docDropZoneProps}
        >
          {isDocDragging && (
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
          {documentFileDropError ? (
            <p className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-1.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {documentFileDropError}
            </p>
          ) : null}
          <div className={panelHeaderClass}>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Document
            </span>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer text-[10px] text-slate-500 transition-colors hover:text-primary">
                Upload
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleDocumentUpload}
                />
              </label>
              <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {document.length.toLocaleString()} chars
              </span>
            </div>
          </div>
          <textarea
            aria-label="JSON Document"
            className="min-h-[180px] md:min-h-0 w-full flex-1 resize-none border-none bg-transparent p-4 font-mono text-xs leading-relaxed text-slate-700 placeholder:text-slate-500 focus:outline-none dark:text-slate-300"
            placeholder={`Paste JSON document here…\n\nExample:\n{\n  "name": "Alice",\n  "age": 30\n}`}
            value={document}
            onChange={(e) => {
              const value = e.target.value;
              setDocumentFileDropError(null);
              setDocument(value);
              setDraft({ document: value, schema, draft: selectedDraft });
            }}
            spellCheck={false}
          />
        </div>

        <div className="relative flex min-w-0 flex-1 flex-col" {...schemaDropZoneProps}>
          {isSchemaDragging && (
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
          {schemaFileDropError ? (
            <p className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-1.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {schemaFileDropError}
            </p>
          ) : null}
          <div className={panelHeaderClass}>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Schema
            </span>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer text-[10px] text-slate-500 transition-colors hover:text-primary">
                Upload
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleSchemaUpload}
                />
              </label>
              <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {schema.length.toLocaleString()} chars
              </span>
            </div>
          </div>
          <textarea
            aria-label="JSON Schema"
            className="min-h-[180px] md:min-h-0 w-full flex-1 resize-none border-none bg-transparent p-4 font-mono text-xs leading-relaxed text-slate-700 placeholder:text-slate-500 focus:outline-none dark:text-slate-300"
            placeholder={`Paste JSON Schema here…\n\nExample:\n{\n  "$schema": "http://json-schema.org/draft-07/schema#",\n  "type": "object",\n  "required": ["name"],\n  "properties": {\n    "name": { "type": "string" },\n    "age": { "type": "integer", "minimum": 0 }\n  }\n}`}
            value={schema}
            onChange={(e) => {
              const value = e.target.value;
              setSchemaFileDropError(null);
              setSchema(value);
              setDraft({ document, schema: value, draft: selectedDraft });
            }}
            spellCheck={false}
          />
        </div>
      </div>

      <div className="custom-scrollbar h-[220px] shrink-0 overflow-y-auto bg-panel-light dark:bg-panel-dark">
        {isEmpty && (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Paste a JSON document and schema above to validate
          </div>
        )}

        {!isEmpty && output === null && (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Validating…
          </div>
        )}

        {output?.parseError && (
          <div className="flex items-start gap-3 p-4">
            <span className="material-symbols-outlined mt-0.5 shrink-0 text-base text-red-400">
              error
            </span>
            <p className="font-mono text-xs text-red-400">{output.parseError}</p>
          </div>
        )}

        {output && !output.parseError && output.valid && (
          <div className="flex items-center gap-2 p-4">
            <span className="material-symbols-outlined text-xl text-emerald-400">
              check_circle
            </span>
            <span className="text-sm font-semibold text-emerald-400">
              Document is valid
            </span>
          </div>
        )}

        {output &&
          !output.parseError &&
          !output.valid &&
          output.issues.length > 0 && (
            <div className="flex flex-col">
              <div className="sticky top-0 flex items-center gap-2 border-b border-border-light bg-panel-light px-4 py-2.5 dark:border-border-dark dark:bg-panel-dark">
                <span className="material-symbols-outlined text-base text-red-400">
                  cancel
                </span>
                <span className="text-sm font-semibold text-red-400">
                  {output.errorCount} error{output.errorCount !== 1 ? "s" : ""}{" "}
                  found
                </span>
              </div>
              <div className="divide-y divide-border-light dark:divide-border-dark">
                {output.issues.map((issue, i) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 text-xs text-red-400">
                        ✗
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {issue.instancePath || "(root)"}
                        </p>
                        <p className="mt-0.5 text-xs text-red-400">
                          {issue.message}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[10px] text-slate-500">
                          Schema: {issue.schemaPath}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        {output &&
          !output.parseError &&
          !output.valid &&
          output.issues.length === 0 && (
            <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">
              Validation failed with no detailed issues (check inputs).
            </div>
          )}
      </div>
    </div>
  );
}

export default JsonSchemaValidatorTool;
