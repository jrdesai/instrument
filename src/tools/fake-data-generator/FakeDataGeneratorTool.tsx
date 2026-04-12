import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { callTool } from "../../bridge";
import { CopyButton, PanelHeader } from "../../components/tool";
import { CodeBlock } from "../../components/ui/CodeBlock";
import { useDraftInput, useRestoreDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import type { FakeDataInput } from "../../bindings/FakeDataInput";
import type { FakeDataOutput } from "../../bindings/FakeDataOutput";

const RUST_COMMAND = "fake_data_process";
const TOOL_ID = "fake-data-generator";
const DEBOUNCE_MS = 300;
const HISTORY_DEBOUNCE_MS = 1500;

export const FIELD_TYPES = [
  {
    group: "Person",
    types: [
      { value: "full_name", label: "Full Name" },
      { value: "first_name", label: "First Name" },
      { value: "last_name", label: "Last Name" },
      { value: "email", label: "Email" },
      { value: "username", label: "Username" },
      { value: "phone", label: "Phone Number" },
    ],
  },
  {
    group: "Address",
    types: [
      { value: "street", label: "Street" },
      { value: "city", label: "City" },
      { value: "state", label: "State" },
      { value: "country", label: "Country" },
      { value: "country_code", label: "Country Code" },
      { value: "zip", label: "ZIP / Postal Code" },
      { value: "latitude", label: "Latitude" },
      { value: "longitude", label: "Longitude" },
    ],
  },
  {
    group: "Company",
    types: [
      { value: "company", label: "Company Name" },
      { value: "industry", label: "Industry" },
      { value: "job_title", label: "Job Title" },
      { value: "catch_phrase", label: "Catch Phrase" },
    ],
  },
  {
    group: "Internet",
    types: [
      { value: "domain", label: "Domain" },
      { value: "ipv4", label: "IP Address (v4)" },
      { value: "color", label: "Color (hex)" },
      { value: "user_agent", label: "User Agent" },
    ],
  },
  {
    group: "Text",
    types: [
      { value: "word", label: "Word" },
      { value: "sentence", label: "Sentence" },
      { value: "paragraph", label: "Paragraph" },
    ],
  },
  {
    group: "Numbers",
    types: [
      { value: "integer", label: "Integer" },
      { value: "float", label: "Float" },
      { value: "boolean", label: "Boolean" },
    ],
  },
  {
    group: "Other",
    types: [
      { value: "uuid", label: "UUID" },
      { value: "date", label: "Date" },
      { value: "datetime", label: "Date & Time" },
      { value: "timestamp", label: "Unix Timestamp" },
    ],
  },
  {
    group: "Custom",
    types: [
      { value: "custom_list", label: "Custom List" },
      { value: "counter", label: "Counter" },
    ],
  },
] as const;

const AUTO_NAMES: Record<string, string> = {
  full_name: "name",
  first_name: "firstName",
  last_name: "lastName",
  email: "email",
  username: "username",
  phone: "phone",
  street: "street",
  city: "city",
  state: "state",
  country: "country",
  country_code: "countryCode",
  zip: "zip",
  latitude: "lat",
  longitude: "lng",
  company: "company",
  industry: "industry",
  job_title: "jobTitle",
  catch_phrase: "catchPhrase",
  domain: "domain",
  ipv4: "ip",
  color: "color",
  user_agent: "userAgent",
  word: "word",
  sentence: "sentence",
  paragraph: "paragraph",
  integer: "number",
  float: "value",
  boolean: "active",
  uuid: "id",
  date: "date",
  datetime: "createdAt",
  timestamp: "timestamp",
  custom_list: "category",
  counter: "id",
};

interface FieldParams {
  min?: string;
  max?: string;
  decimals?: string;
  values?: string;
  start?: string;
  step?: string;
}

export interface SchemaField {
  id: string;
  name: string;
  fieldType: string;
  params: FieldParams;
}

type ToolDraft = { fields: SchemaField[]; count: number };

function createDefaultFields(): SchemaField[] {
  return [
    {
      id: crypto.randomUUID(),
      name: "id",
      fieldType: "counter",
      params: { start: "1", step: "1" },
    },
    {
      id: crypto.randomUUID(),
      name: "name",
      fieldType: "full_name",
      params: {},
    },
    {
      id: crypto.randomUUID(),
      name: "email",
      fieldType: "email",
      params: {},
    },
    {
      id: crypto.randomUUID(),
      name: "company",
      fieldType: "company",
      params: {},
    },
    {
      id: crypto.randomUUID(),
      name: "city",
      fieldType: "city",
      params: {},
    },
  ];
}

function isToolDraft(raw: unknown): raw is ToolDraft {
  if (typeof raw !== "object" || raw === null) return false;
  const o = raw as Record<string, unknown>;
  if (typeof o.count !== "number" || !Array.isArray(o.fields)) return false;
  return o.fields.every(
    (f) =>
      typeof f === "object" &&
      f !== null &&
      typeof (f as SchemaField).id === "string" &&
      typeof (f as SchemaField).name === "string" &&
      typeof (f as SchemaField).fieldType === "string" &&
      typeof (f as SchemaField).params === "object" &&
      (f as SchemaField).params !== null
  );
}

function normalizeRestoredFields(fields: SchemaField[]): SchemaField[] {
  return fields.map((f) => ({
    ...f,
    id: f.id?.length ? f.id : crypto.randomUUID(),
    params: f.params ?? {},
  }));
}

export function buildParams(
  fieldType: string,
  params: FieldParams
): Record<string, unknown> | null {
  switch (fieldType) {
    case "integer":
      if (!params.min && !params.max) return null;
      return {
        min: params.min ? parseInt(params.min, 10) : 1,
        max: params.max ? parseInt(params.max, 10) : 10000,
      };
    case "float":
      if (!params.min && !params.max) return null;
      return {
        min: params.min ? parseFloat(params.min) : 0,
        max: params.max ? parseFloat(params.max) : 1,
        decimals: params.decimals ? parseInt(params.decimals, 10) : 2,
      };
    case "custom_list": {
      const values = (params.values ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      return values.length > 0 ? { values } : null;
    }
    case "counter":
      return {
        start: params.start ? parseInt(params.start, 10) : 1,
        step: params.step ? parseInt(params.step, 10) : 1,
      };
    default:
      return null;
  }
}

function downloadJson(json: string) {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "fake-data.json";
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCsv(json: string) {
  try {
    const records = JSON.parse(json) as Record<string, unknown>[];
    if (!Array.isArray(records) || records.length === 0) return;
    const headers = Object.keys(records[0]);
    const escape = (v: unknown) => {
      const s = String(v ?? "");
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const rows = [
      headers.join(","),
      ...records.map((r) => headers.map((h) => escape(r[h])).join(",")),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fake-data.csv";
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    /* ignore */
  }
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center px-4">
      <span className="material-symbols-outlined text-[40px] text-slate-300 dark:text-slate-600">
        dataset
      </span>
      <p className="text-sm text-slate-400 dark:text-slate-600">
        Add fields with names to generate records
      </p>
    </div>
  );
}

function FakeDataGeneratorTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [fields, setFields] = useState<SchemaField[]>(() => createDefaultFields());
  const [count, setCount] = useState(10);
  const [output, setOutput] = useState<FakeDataOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  useRestoreDraft(TOOL_ID, (raw) => {
    if (!isToolDraft(raw)) return;
    setFields(normalizeRestoredFields(raw.fields));
    const c = Math.min(500, Math.max(1, Math.floor(raw.count)));
    setCount(Number.isFinite(c) ? c : 10);
  });

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setDraft({ fields, count });
    }, 400);
    return () => clearTimeout(t);
  }, [fields, count, setDraft]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const validFields = fields.filter((f) => f.name.trim().length > 0);
    if (validFields.length === 0) {
      setOutput(null);
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }

    debounceRef.current = setTimeout(() => {
      void (async () => {
        setIsLoading(true);
        const payload: FakeDataInput = {
          fields: validFields.map((f) => ({
            name: f.name.trim(),
            fieldType: f.fieldType,
            params: buildParams(f.fieldType, f.params),
          })),
          count,
        };
        try {
          const result = (await callTool(RUST_COMMAND, payload, {
            skipHistory: true,
          })) as FakeDataOutput;
          setOutput(result);
          if (!result.error) {
            if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
            historyDebounceRef.current = setTimeout(() => {
              addHistoryEntry(TOOL_ID, {
                input: payload,
                output: result,
                timestamp: Date.now(),
              });
              historyDebounceRef.current = null;
            }, HISTORY_DEBOUNCE_MS);
          }
        } catch (e) {
          const message =
            e instanceof Error ? e.message : String(e ?? "Generation failed");
          setOutput({ json: "", error: message });
        } finally {
          setIsLoading(false);
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fields, count, addHistoryEntry]);

  const updateField = useCallback((id: string, patch: Partial<SchemaField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  const updateParam = useCallback(
    (id: string, key: keyof FieldParams, value: string) => {
      setFields((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, params: { ...f.params, [key]: value } } : f
        )
      );
    },
    []
  );

  const changeFieldType = useCallback((id: string, newType: string) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const oldType = f.fieldType;
        const oldAuto = AUTO_NAMES[oldType];
        const newAuto = AUTO_NAMES[newType] ?? newType;
        const name =
          f.name === "" || (oldAuto !== undefined && f.name === oldAuto)
            ? newAuto
            : f.name;
        return {
          ...f,
          fieldType: newType,
          name,
          params: {},
        };
      })
    );
  }, []);

  const addField = useCallback(() => {
    setFields((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        fieldType: "uuid",
        params: {},
      },
    ]);
  }, []);

  const removeField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleCountChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const n = parseInt(e.target.value, 10);
    if (Number.isNaN(n)) {
      setCount(1);
      return;
    }
    setCount(Math.min(500, Math.max(1, n)));
  }, []);

  const hasJson = Boolean(output?.json && output.json.length > 0);
  const showDownloads = hasJson && !output?.error;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background-light font-display text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Schema */}
        <div className="flex min-h-[40vh] w-full shrink-0 flex-col border-b border-border-light dark:border-border-dark md:w-[45%] md:min-h-0 md:border-b-0 md:border-r">
          <PanelHeader
            label="Schema"
            meta={`${count} records max 500`}
            processing={isLoading}
            className="shrink-0 border-b border-border-light px-4 py-2 dark:border-border-dark"
          >
            <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="sr-only">Record count</span>
              <input
                type="number"
                min={1}
                max={500}
                value={count}
                onChange={handleCountChange}
                className="w-14 rounded border border-border-light bg-transparent px-1.5 py-0.5 font-mono text-xs text-slate-800 focus:border-primary focus:outline-none dark:border-border-dark dark:text-slate-200"
              />
            </label>
          </PanelHeader>
          <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
            {fields.map((field) => (
              <div
                key={field.id}
                className="rounded-lg border border-border-light bg-panel-light/50 dark:border-border-dark dark:bg-panel-dark/50"
              >
                <div className="flex items-center gap-2 p-2 pl-3 pr-2">
                  <input
                    type="text"
                    value={field.name}
                    onChange={(e) =>
                      updateField(field.id, { name: e.target.value })
                    }
                    placeholder="field name"
                    className="min-w-0 flex-1 rounded border border-border-light bg-transparent px-2 py-1 font-mono text-xs text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none dark:border-border-dark dark:text-slate-200"
                  />
                  <select
                    value={field.fieldType}
                    onChange={(e) => changeFieldType(field.id, e.target.value)}
                    className="max-w-[44%] shrink-0 rounded border border-border-light bg-background-light px-1 py-1 text-[11px] text-slate-700 focus:border-primary focus:outline-none dark:border-border-dark dark:bg-background-dark dark:text-slate-300 sm:text-xs"
                  >
                    {FIELD_TYPES.map((g) => (
                      <optgroup key={g.group} label={g.group}>
                        {g.types.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeField(field.id)}
                    className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                    aria-label="Remove field"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>
                {(field.fieldType === "integer" || field.fieldType === "float") && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-border-light/60 px-3 py-2 dark:border-border-dark/60">
                    <label className="text-[10px] text-slate-400">min</label>
                    <input
                      type="number"
                      value={field.params.min ?? ""}
                      onChange={(e) =>
                        updateParam(field.id, "min", e.target.value)
                      }
                      placeholder={field.fieldType === "float" ? "0" : "1"}
                      className="w-20 rounded border border-border-light bg-transparent px-2 py-0.5 font-mono text-xs text-slate-700 focus:border-primary focus:outline-none dark:border-border-dark dark:text-slate-300"
                    />
                    <label className="text-[10px] text-slate-400">max</label>
                    <input
                      type="number"
                      value={field.params.max ?? ""}
                      onChange={(e) =>
                        updateParam(field.id, "max", e.target.value)
                      }
                      placeholder={field.fieldType === "float" ? "1" : "10000"}
                      className="w-20 rounded border border-border-light bg-transparent px-2 py-0.5 font-mono text-xs text-slate-700 focus:border-primary focus:outline-none dark:border-border-dark dark:text-slate-300"
                    />
                    {field.fieldType === "float" && (
                      <>
                        <label className="text-[10px] text-slate-400">decimals</label>
                        <input
                          type="number"
                          min={0}
                          max={8}
                          value={field.params.decimals ?? ""}
                          onChange={(e) =>
                            updateParam(field.id, "decimals", e.target.value)
                          }
                          placeholder="2"
                          className="w-12 rounded border border-border-light bg-transparent px-2 py-0.5 font-mono text-xs text-slate-700 focus:border-primary focus:outline-none dark:border-border-dark dark:text-slate-300"
                        />
                      </>
                    )}
                  </div>
                )}
                {field.fieldType === "custom_list" && (
                  <div className="flex items-center gap-2 border-t border-border-light/60 px-3 py-2 dark:border-border-dark/60">
                    <label className="shrink-0 text-[10px] text-slate-400">values</label>
                    <input
                      type="text"
                      value={field.params.values ?? ""}
                      onChange={(e) =>
                        updateParam(field.id, "values", e.target.value)
                      }
                      placeholder="active, inactive, pending"
                      className="min-w-0 flex-1 rounded border border-border-light bg-transparent px-2 py-0.5 font-mono text-xs text-slate-700 placeholder:text-slate-400 focus:border-primary focus:outline-none dark:border-border-dark dark:text-slate-300"
                    />
                  </div>
                )}
                {field.fieldType === "counter" && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-border-light/60 px-3 py-2 dark:border-border-dark/60">
                    <label className="text-[10px] text-slate-400">start</label>
                    <input
                      type="number"
                      value={field.params.start ?? ""}
                      onChange={(e) =>
                        updateParam(field.id, "start", e.target.value)
                      }
                      placeholder="1"
                      className="w-16 rounded border border-border-light bg-transparent px-2 py-0.5 font-mono text-xs text-slate-700 focus:border-primary focus:outline-none dark:border-border-dark dark:text-slate-300"
                    />
                    <label className="text-[10px] text-slate-400">step</label>
                    <input
                      type="number"
                      value={field.params.step ?? ""}
                      onChange={(e) =>
                        updateParam(field.id, "step", e.target.value)
                      }
                      placeholder="1"
                      className="w-16 rounded border border-border-light bg-transparent px-2 py-0.5 font-mono text-xs text-slate-700 focus:border-primary focus:outline-none dark:border-border-dark dark:text-slate-300"
                    />
                  </div>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addField}
              className="self-start rounded-lg border border-border-light px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-primary hover:text-primary dark:border-border-dark dark:text-slate-400"
            >
              + Add field
            </button>
          </div>
        </div>

        {/* Output */}
        <div className="flex min-h-[40vh] min-w-0 flex-1 flex-col md:min-h-0">
          <div className="flex min-h-[41px] shrink-0 items-center justify-between border-b border-border-light bg-panel-light px-4 py-2 dark:border-border-dark dark:bg-panel-dark">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Output
            </span>
            <div className="flex items-center gap-2">
              {isLoading && (
                <span className="text-xs text-slate-400">Generating…</span>
              )}
              <CopyButton
                value={output?.json || undefined}
                label="Copy"
                variant="primary"
                className="py-0.5"
              />
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            {output?.error ? (
              <div className="p-4">
                <p className="text-sm text-red-600 dark:text-red-400">{output.error}</p>
              </div>
            ) : hasJson ? (
              <div className="flex min-h-0 flex-1 flex-col p-3">
                <CodeBlock
                  code={output!.json}
                  language="json"
                  maxHeight="100%"
                  showCopyButton={false}
                  className="min-h-0 flex-1"
                />
              </div>
            ) : (
              <EmptyState />
            )}
            {showDownloads && (
              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border-light bg-panel-light px-4 py-2 dark:border-border-dark dark:bg-panel-dark">
                <button
                  type="button"
                  onClick={() => downloadJson(output!.json)}
                  className="flex items-center gap-1.5 rounded-lg border border-border-light px-3 py-1 text-xs text-slate-600 transition-colors hover:text-primary dark:border-border-dark dark:text-slate-400"
                >
                  <span className="material-symbols-outlined text-[14px]">download</span>
                  JSON
                </button>
                <button
                  type="button"
                  onClick={() => downloadCsv(output!.json)}
                  className="flex items-center gap-1.5 rounded-lg border border-border-light px-3 py-1 text-xs text-slate-600 transition-colors hover:text-primary dark:border-border-dark dark:text-slate-400"
                >
                  <span className="material-symbols-outlined text-[14px]">download</span>
                  CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FakeDataGeneratorTool;
