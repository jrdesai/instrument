import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { callTool } from "../../bridge";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import type { CronInput } from "../../bindings/CronInput";
import type { CronOutput } from "../../bindings/CronOutput";

const RUST_COMMAND = "cron_process";
const TOOL_ID = "cron-parser";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;
const COPIED_DURATION_MS = 1500;
const NEXT_RUN_COUNT = 5;

// ─── Build tab types ──────────────────────────────────────────────────────────

type FieldMode =
  | "every"
  | "at"
  | "everyN"
  | "range"
  | "specific"
  | "weekdays"
  | "weekends";

type FieldType = "minutes" | "hours" | "dayOfMonth" | "month" | "dayOfWeek";

interface FieldValue {
  mode: FieldMode;
  single?: number;
  step?: number;
  from?: number;
  to?: number;
  /** Selected day values for dayOfWeek "specific" mode (0=Sun, 1=Mon … 6=Sat) */
  days?: number[];
}

interface FieldState {
  minutes: FieldValue;
  hours: FieldValue;
  dayOfMonth: FieldValue;
  month: FieldValue;
  dayOfWeek: FieldValue;
}

// ─── Build tab constants ──────────────────────────────────────────────────────

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Mon–Sun in display order; value = Unix cron day-of-week (0=Sun, 1=Mon … 6=Sat) */
const DOW_BUTTONS: { label: string; value: number }[] = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

const DEFAULT_FIELDS: FieldState = {
  minutes:    { mode: "every" },
  hours:      { mode: "every" },
  dayOfMonth: { mode: "every" },
  month:      { mode: "every" },
  dayOfWeek:  { mode: "every" },
};

interface Preset {
  label: string;
  fields: FieldState;
}

const PRESETS: Preset[] = [
  {
    label: "Every minute",
    fields: { ...DEFAULT_FIELDS },
  },
  {
    label: "Every hour",
    fields: {
      minutes:    { mode: "at", single: 0 },
      hours:      { mode: "every" },
      dayOfMonth: { mode: "every" },
      month:      { mode: "every" },
      dayOfWeek:  { mode: "every" },
    },
  },
  {
    label: "Every day at midnight",
    fields: {
      minutes:    { mode: "at", single: 0 },
      hours:      { mode: "at", single: 0 },
      dayOfMonth: { mode: "every" },
      month:      { mode: "every" },
      dayOfWeek:  { mode: "every" },
    },
  },
  {
    label: "Every weekday at 9am",
    fields: {
      minutes:    { mode: "at", single: 0 },
      hours:      { mode: "at", single: 9 },
      dayOfMonth: { mode: "every" },
      month:      { mode: "every" },
      dayOfWeek:  { mode: "weekdays" },
    },
  },
  {
    label: "Every Sunday at midnight",
    fields: {
      minutes:    { mode: "at", single: 0 },
      hours:      { mode: "at", single: 0 },
      dayOfMonth: { mode: "every" },
      month:      { mode: "every" },
      dayOfWeek:  { mode: "specific", days: [0] },
    },
  },
  {
    label: "First of every month",
    fields: {
      minutes:    { mode: "at", single: 0 },
      hours:      { mode: "at", single: 0 },
      dayOfMonth: { mode: "at", single: 1 },
      month:      { mode: "every" },
      dayOfWeek:  { mode: "every" },
    },
  },
];

const FIELD_MODES: Record<FieldType, { label: string; value: FieldMode }[]> = {
  minutes: [
    { label: "Every",   value: "every"  },
    { label: "At",      value: "at"     },
    { label: "Every N", value: "everyN" },
    { label: "Range",   value: "range"  },
  ],
  hours: [
    { label: "Every",   value: "every"  },
    { label: "At",      value: "at"     },
    { label: "Every N", value: "everyN" },
    { label: "Range",   value: "range"  },
  ],
  dayOfMonth: [
    { label: "Every",  value: "every" },
    { label: "On day", value: "at"    },
    { label: "Range",  value: "range" },
  ],
  month: [
    { label: "Every",    value: "every" },
    { label: "In month", value: "at"    },
    { label: "Range",    value: "range" },
  ],
  dayOfWeek: [
    { label: "Every",    value: "every"    },
    { label: "Specific", value: "specific" },
    { label: "Weekdays", value: "weekdays" },
    { label: "Weekends", value: "weekends" },
  ],
};

// ─── Expression assembly ──────────────────────────────────────────────────────

function assembleField(f: FieldValue): string {
  switch (f.mode) {
    case "every":  return "*";
    case "at":     return String(f.single ?? 0);
    case "everyN": return `*/${f.step ?? 1}`;
    case "range":  return `${f.from ?? 0}-${f.to ?? 0}`;
    default:       return "*";
  }
}

function assembleDow(f: FieldValue): string {
  switch (f.mode) {
    case "every":    return "*";
    case "weekdays": return "1-5";
    case "weekends": return "0,6";
    case "specific": {
      const days = f.days ?? [];
      if (days.length === 0 || days.length === 7) return "*";
      return days.slice().sort((a, b) => a - b).join(",");
    }
    default: return "*";
  }
}

function assembleExpression(fields: FieldState): string {
  return [
    assembleField(fields.minutes),
    assembleField(fields.hours),
    assembleField(fields.dayOfMonth),
    assembleField(fields.month),
    assembleDow(fields.dayOfWeek),
  ].join(" ");
}

/** Returns the default FieldValue when switching to a given mode for a field type. */
function defaultForMode(mode: FieldMode, ft: FieldType): FieldValue {
  const numericMin = ft === "dayOfMonth" || ft === "month" ? 1 : 0;
  const rangeMax   = ft === "hours" ? 12 : ft === "dayOfMonth" ? 15 : ft === "month" ? 6 : 30;
  switch (mode) {
    case "every":    return { mode: "every" };
    case "at":       return { mode: "at",     single: numericMin };
    case "everyN":   return { mode: "everyN", step: 1 };
    case "range":    return { mode: "range",  from: numericMin, to: rangeMax };
    case "specific": return { mode: "specific", days: [] };
    case "weekdays": return { mode: "weekdays" };
    case "weekends": return { mode: "weekends" };
  }
}

// ─── Shared output section ────────────────────────────────────────────────────

interface OutputSectionProps {
  expression: string;
  output: CronOutput | null;
  emptyHint?: string;
}

function OutputSection({ expression, output, emptyHint }: OutputSectionProps) {
  const isEmpty = expression.trim() === "";
  return (
    <>
      {/* Status + description */}
      <div className="shrink-0 px-4 py-3 border-b border-border-light dark:border-border-dark space-y-2">
        {!isEmpty && output && (
          <>
            <div className="flex items-center gap-2 text-sm">
              {output.isValid ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Valid</span>
              ) : (
                <>
                  <span className="text-red-600 dark:text-red-400 font-medium">Invalid</span>
                  {output.error && (
                    <span className="text-red-600/90 dark:text-red-400/90 text-xs font-mono">
                      {output.error}
                    </span>
                  )}
                </>
              )}
            </div>
            {output.isValid && output.description && (
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <span className="text-slate-500 dark:text-slate-500 mr-1">Description:</span>
                {output.description}
              </p>
            )}
          </>
        )}
        {isEmpty && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {emptyHint ?? "Enter a 5-field cron expression (UTC). Results update as you type."}
          </p>
        )}
      </div>

      {/* Next runs */}
      <div className="flex-1 min-h-0 px-4 py-3">
        {!isEmpty && output?.isValid && output.nextRuns.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Next {output.nextRuns.length} runs (UTC)
            </h3>
            <ol className="list-decimal list-inside space-y-1.5 font-mono text-sm text-slate-800 dark:text-slate-200">
              {output.nextRuns.map((run, i) => (
                <li key={`${run}-${i}`} className="break-all">
                  {run}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Segmented control ────────────────────────────────────────────────────────

interface SegmentedControlProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}

function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  return (
    <div className="flex rounded-md overflow-hidden border border-border-light dark:border-border-dark w-fit">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap border-r last:border-r-0 border-border-light dark:border-border-dark ${
            value === opt.value
              ? "bg-primary text-white"
              : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Number input ─────────────────────────────────────────────────────────────

interface NumInputProps {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  label?: string;
}

function NumInput({ value, onChange, min, max, label }: NumInputProps) {
  return (
    <input
      type="number"
      aria-label={label}
      value={value}
      min={min}
      max={max}
      onChange={(e) => {
        const n = parseInt(e.target.value, 10);
        if (!isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
      }}
      className="w-16 px-2 py-1 font-mono text-sm border border-border-light dark:border-border-dark rounded-md bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-primary"
    />
  );
}

// ─── Month select ─────────────────────────────────────────────────────────────

interface MonthSelectProps {
  value: number;
  onChange: (v: number) => void;
  label?: string;
}

function MonthSelect({ value, onChange, label }: MonthSelectProps) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10))}
      className="px-2 py-1 font-mono text-sm border border-border-light dark:border-border-dark rounded-md bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-primary"
    >
      {MONTHS.map((name, i) => (
        <option key={name} value={i + 1}>{name}</option>
      ))}
    </select>
  );
}

// ─── Field row ────────────────────────────────────────────────────────────────

interface FieldRowProps {
  label: string;
  field: FieldValue;
  onChange: (f: FieldValue) => void;
  fieldType: FieldType;
}

function FieldRow({ label, field, onChange, fieldType }: FieldRowProps) {
  const modes = FIELD_MODES[fieldType];

  const handleModeChange = (raw: string) => {
    onChange(defaultForMode(raw as FieldMode, fieldType));
  };

  // Value input — rendered conditionally based on mode × fieldType
  let valueInput: ReactNode = null;

  if (field.mode === "at") {
    if (fieldType === "month") {
      valueInput = (
        <MonthSelect
          value={field.single ?? 1}
          onChange={(v) => onChange({ ...field, single: v })}
          label="Month"
        />
      );
    } else {
      const [min, max] =
        fieldType === "minutes"    ? [0, 59]  :
        fieldType === "hours"      ? [0, 23]  : [1, 31];
      valueInput = (
        <NumInput
          value={field.single ?? min}
          onChange={(v) => onChange({ ...field, single: v })}
          min={min}
          max={max}
          label={label}
        />
      );
    }
  }

  if (field.mode === "everyN") {
    const [min, max, unit] =
      fieldType === "minutes" ? [1, 59, "minutes"] : [1, 23, "hours"];
    valueInput = (
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-400">Every</span>
        <NumInput
          value={field.step ?? 1}
          onChange={(v) => onChange({ ...field, step: v })}
          min={min}
          max={max}
          label={`${label} step`}
        />
        <span className="text-xs text-slate-500 dark:text-slate-400">{unit}</span>
      </div>
    );
  }

  if (field.mode === "range") {
    if (fieldType === "month") {
      valueInput = (
        <div className="flex items-center gap-2">
          <MonthSelect
            value={field.from ?? 1}
            onChange={(v) => onChange({ ...field, from: v })}
            label="From month"
          />
          <span className="text-xs text-slate-500 dark:text-slate-400">to</span>
          <MonthSelect
            value={field.to ?? 1}
            onChange={(v) => onChange({ ...field, to: v })}
            label="To month"
          />
        </div>
      );
    } else {
      const [min, max] =
        fieldType === "minutes"    ? [0, 59]  :
        fieldType === "hours"      ? [0, 23]  : [1, 31];
      valueInput = (
        <div className="flex items-center gap-2">
          <NumInput
            value={field.from ?? min}
            onChange={(v) => onChange({ ...field, from: v })}
            min={min}
            max={max}
            label={`${label} from`}
          />
          <span className="text-xs text-slate-500 dark:text-slate-400">to</span>
          <NumInput
            value={field.to ?? min}
            onChange={(v) => onChange({ ...field, to: v })}
            min={min}
            max={max}
            label={`${label} to`}
          />
        </div>
      );
    }
  }

  if (field.mode === "specific" && fieldType === "dayOfWeek") {
    valueInput = (
      <div className="flex flex-wrap gap-1">
        {DOW_BUTTONS.map((day) => {
          const selected = (field.days ?? []).includes(day.value);
          return (
            <button
              key={day.value}
              type="button"
              onClick={() => {
                const current = field.days ?? [];
                const newDays = selected
                  ? current.filter((d) => d !== day.value)
                  : [...current, day.value];
                onChange({ ...field, days: newDays });
              }}
              className={`px-2.5 py-0.5 text-xs font-medium rounded-full border transition-colors ${
                selected
                  ? "bg-primary text-white border-primary"
                  : "border-border-light dark:border-border-dark text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
              }`}
            >
              {day.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border-light dark:border-border-dark last:border-0">
      <span className="w-28 shrink-0 text-sm text-slate-600 dark:text-slate-400 pt-1.5">
        {label}
      </span>
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <SegmentedControl
          options={modes}
          value={field.mode}
          onChange={handleModeChange}
        />
        {valueInput}
      </div>
    </div>
  );
}

// ─── Build tab ────────────────────────────────────────────────────────────────

function BuildTab() {
  const [fields, setFields]       = useState<FieldState>(DEFAULT_FIELDS);
  const [output, setOutput]       = useState<CronOutput | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy");
  const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry           = useHistoryStore((s) => s.addHistoryEntry);

  const expression = assembleExpression(fields);

  const runProcess = useCallback(
    async (expr: string) => {
      try {
        const payload: CronInput = { expression: expr, count: NEXT_RUN_COUNT };
        const result = (await callTool(RUST_COMMAND, payload, {
          skipHistory: true,
        })) as CronOutput;
        setOutput(result);
        if (result.isValid) {
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
        const message = e instanceof Error ? e.message : String(e ?? "Cron parse failed");
        setOutput({ isValid: false, description: "", nextRuns: [], error: message });
      }
    },
    [addHistoryEntry]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runProcess(expression);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [expression, runProcess]);

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(expression);
      setCopyLabel("Copied");
      setTimeout(() => setCopyLabel("Copy"), COPIED_DURATION_MS);
    } catch {
      setCopyLabel("Failed");
      setTimeout(() => setCopyLabel("Copy"), COPIED_DURATION_MS);
    }
  }, [expression]);

  const setField = useCallback((key: keyof FieldState, value: FieldValue) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  }, []);

  const exprParts = expression.split(" ");
  const FIELD_LABELS = ["min", "hr", "dom", "mo", "dow"];

  return (
    <div className="flex flex-col">
      {/* Presets */}
      <div className="shrink-0 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark px-4 py-3">
        <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Presets
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setFields(preset.fields)}
              className="px-2.5 py-1 text-xs font-medium rounded-full border border-border-light dark:border-border-dark text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors whitespace-nowrap"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Field selectors */}
      <div className="shrink-0 border-b border-border-light dark:border-border-dark px-4 pt-1">
        <FieldRow
          label="Minutes"
          field={fields.minutes}
          onChange={(v) => setField("minutes", v)}
          fieldType="minutes"
        />
        <FieldRow
          label="Hours"
          field={fields.hours}
          onChange={(v) => setField("hours", v)}
          fieldType="hours"
        />
        <FieldRow
          label="Day of month"
          field={fields.dayOfMonth}
          onChange={(v) => setField("dayOfMonth", v)}
          fieldType="dayOfMonth"
        />
        <FieldRow
          label="Month"
          field={fields.month}
          onChange={(v) => setField("month", v)}
          fieldType="month"
        />
        <FieldRow
          label="Day of week"
          field={fields.dayOfWeek}
          onChange={(v) => setField("dayOfWeek", v)}
          fieldType="dayOfWeek"
        />
      </div>

      {/* Live expression output */}
      <div className="shrink-0 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark px-4 py-3">
        <div className="border border-border-light dark:border-border-dark rounded-md bg-background-light dark:bg-background-dark px-3 py-2 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex font-mono text-base text-slate-800 dark:text-slate-200">
              {exprParts.map((part, i) => (
                <span
                  key={`expr-${i}`}
                  style={{ minWidth: `${Math.max(part.length + 1, 4)}ch` }}
                >
                  {part}
                </span>
              ))}
            </div>
            <div className="flex mt-1">
              {FIELD_LABELS.map((lbl, i) => (
                <span
                  key={lbl}
                  style={{
                    minWidth: `${Math.max((exprParts[i]?.length ?? 0) + 1, 4)}ch`,
                  }}
                  className="text-xs text-slate-400 dark:text-slate-500 font-mono"
                >
                  {lbl}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 px-2 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
          >
            {copyLabel}
          </button>
        </div>
      </div>

      {/* Shared output section */}
      <OutputSection expression={expression} output={output} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function CronParserTool() {
  const [activeTab, setActiveTab] = useState<"parse" | "build">("parse");

  // Parse tab state
  const { setDraft } = useDraftInput(TOOL_ID);
  const [expression, setExpression] = useState("");
  useRestoreStringDraft(TOOL_ID, setExpression);
  const [output, setOutput]               = useState<CronOutput | null>(null);
  const [copyExprLabel, setCopyExprLabel] = useState("Copy expression");
  const [cheatOpen, setCheatOpen]         = useState(false);
  const debounceRef                       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef                = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry                   = useHistoryStore((s) => s.addHistoryEntry);

  const runProcess = useCallback(
    async (expr: string) => {
      const trimmed = expr.trim();
      if (trimmed === "") {
        setOutput(null);
        return;
      }
      try {
        const payload: CronInput = {
          expression: trimmed,
          count: NEXT_RUN_COUNT,
        };
        const result = (await callTool(RUST_COMMAND, payload, {
          skipHistory: true,
        })) as CronOutput;
        setOutput(result);
        if (result.isValid) {
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
          e instanceof Error ? e.message : String(e ?? "Cron parse failed");
        setOutput({
          isValid: false,
          description: "",
          nextRuns: [],
          error: message,
        });
      }
    },
    [addHistoryEntry]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = expression.trim();
    if (trimmed === "") {
      setOutput(null);
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }
    debounceRef.current = setTimeout(() => {
      void runProcess(expression);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [expression, runProcess]);

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

  const handleCopyExpression = useCallback(async () => {
    const text = expression.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyExprLabel("Copied");
      setTimeout(() => setCopyExprLabel("Copy expression"), COPIED_DURATION_MS);
    } catch {
      setCopyExprLabel("Copy failed");
      setTimeout(() => setCopyExprLabel("Copy expression"), COPIED_DURATION_MS);
    }
  }, [expression]);

  const isEmpty = expression.trim() === "";

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      {/* Tab bar */}
      <div className="shrink-0 flex border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark">
        {(["parse", "build"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {tab === "parse" ? "Parse" : "Build"}
          </button>
        ))}
      </div>

      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {/* ── Parse tab ── */}
        {activeTab === "parse" && (
          <>
            {/* Expression input */}
            <div className="shrink-0 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border-light dark:border-border-dark">
                <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  Cron expression
                </span>
                <div className="flex items-center gap-2">
                  {!isEmpty && (
                    <span className="text-slate-600 dark:text-slate-400 text-xs">
                      {expression.length} chars
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleCopyExpression}
                    disabled={isEmpty}
                    className="px-2 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {copyExprLabel}
                  </button>
                </div>
              </div>
              <textarea
                aria-label="Cron expression"
                className="w-full min-h-[100px] max-h-[200px] p-4 font-mono text-sm text-slate-800 dark:text-slate-200 bg-background-light dark:bg-background-dark resize-y outline-none focus:ring-0 border-0 placeholder:text-slate-500"
                placeholder="e.g. 0 0 * * *  (every day at midnight UTC)"
                spellCheck={false}
                value={expression}
                onChange={(e) => {
                  const v = e.target.value;
                  setExpression(v);
                  setDraft(v);
                }}
              />
            </div>

            {/* Quick reference */}
            <div className="shrink-0 border-b border-border-light dark:border-border-dark">
              <button
                type="button"
                onClick={() => setCheatOpen((o) => !o)}
                className="w-full flex items-center justify-between px-4 py-2 text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <span>Cron quick reference</span>
                <span className="material-symbols-outlined text-base" aria-hidden>
                  {cheatOpen ? "expand_less" : "expand_more"}
                </span>
              </button>
              {cheatOpen && (
                <div className="px-4 pb-3 text-xs text-slate-600 dark:text-slate-400 font-mono space-y-1 border-t border-border-light dark:border-border-dark bg-panel-light/50 dark:bg-panel-dark/30">
                  <p className="pt-2 text-slate-500 dark:text-slate-500 not-italic font-sans">
                    Use standard{" "}
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      5-field Unix cron
                    </span>{" "}
                    (minute first). A leading{" "}
                    <span className="font-mono text-primary">0</span> second is added for parsing.
                  </p>
                  <p className="text-slate-500 dark:text-slate-500 not-italic font-sans">
                    Field order:{" "}
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      minute · hour · day-of-month · month · day-of-week
                    </span>
                  </p>
                  <p>
                    <span className="text-primary">*</span> any value
                  </p>
                  <p>
                    <span className="text-primary">*/5</span> every 5 units (in minute
                    field → every 5 minutes)
                  </p>
                  <p>
                    <span className="text-primary">1-5</span> range
                  </p>
                  <p>
                    <span className="text-primary">1,3</span> list
                  </p>
                </div>
              )}
            </div>

            {/* Output */}
            <OutputSection expression={expression} output={output} />
          </>
        )}

        {/* ── Build tab ── */}
        {activeTab === "build" && <BuildTab />}
      </div>
    </div>
  );
}

export default CronParserTool;
