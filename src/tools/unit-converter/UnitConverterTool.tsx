import { useCallback, useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { callTool } from "../../bridge";
import { CopyButton, PanelHeader, ToolbarFooter } from "../../components/tool";
import { useHistoryStore } from "../../store";
import type { UnitCategory } from "../../bindings/UnitCategory";
import type { UnitConverterInput } from "../../bindings/UnitConverterInput";
import type { UnitConverterOutput } from "../../bindings/UnitConverterOutput";

const TOOL_ID = "unit-converter";
const RUST_COMMAND = "unit_convert";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;

const CATEGORIES: { label: string; value: UnitCategory }[] = [
  { label: "Data Size", value: "dataSize" },
  { label: "Time", value: "time" },
  { label: "Temperature", value: "temperature" },
  { label: "Length", value: "length" },
  { label: "Weight", value: "weight" },
  { label: "Speed", value: "speed" },
  { label: "Angle", value: "angle" },
  { label: "Frequency", value: "frequency" },
];

const CATEGORY_DEFAULT_UNIT: Record<UnitCategory, string> = {
  dataSize: "mb",
  time: "s",
  temperature: "c",
  length: "m",
  weight: "kg",
  speed: "kmh",
  angle: "deg",
  frequency: "mhz",
};

const CATEGORY_UNITS: Record<UnitCategory, { key: string; label: string }[]> = {
  dataSize: [
    { key: "bit", label: "Bit" },
    { key: "b", label: "Byte (B)" },
    { key: "kb", label: "Kilobyte (KB)" },
    { key: "mb", label: "Megabyte (MB)" },
    { key: "gb", label: "Gigabyte (GB)" },
    { key: "tb", label: "Terabyte (TB)" },
    { key: "pb", label: "Petabyte (PB)" },
    { key: "kib", label: "Kibibyte (KiB)" },
    { key: "mib", label: "Mebibyte (MiB)" },
    { key: "gib", label: "Gibibyte (GiB)" },
    { key: "tib", label: "Tebibyte (TiB)" },
  ],
  time: [
    { key: "ns", label: "Nanosecond (ns)" },
    { key: "us", label: "Microsecond (μs)" },
    { key: "ms", label: "Millisecond (ms)" },
    { key: "s", label: "Second (s)" },
    { key: "min", label: "Minute (min)" },
    { key: "h", label: "Hour (h)" },
    { key: "d", label: "Day (d)" },
    { key: "wk", label: "Week (wk)" },
    { key: "mo", label: "Month (mo)" },
    { key: "yr", label: "Year (yr)" },
  ],
  temperature: [
    { key: "c", label: "Celsius (°C)" },
    { key: "f", label: "Fahrenheit (°F)" },
    { key: "k", label: "Kelvin (K)" },
    { key: "r", label: "Rankine (°R)" },
  ],
  length: [
    { key: "mm", label: "Millimetre (mm)" },
    { key: "cm", label: "Centimetre (cm)" },
    { key: "m", label: "Metre (m)" },
    { key: "km", label: "Kilometre (km)" },
    { key: "in", label: "Inch (in)" },
    { key: "ft", label: "Foot (ft)" },
    { key: "yd", label: "Yard (yd)" },
    { key: "mi", label: "Mile (mi)" },
    { key: "nmi", label: "Nautical Mile (nmi)" },
  ],
  weight: [
    { key: "mg", label: "Milligram (mg)" },
    { key: "g", label: "Gram (g)" },
    { key: "kg", label: "Kilogram (kg)" },
    { key: "t", label: "Metric Ton (t)" },
    { key: "oz", label: "Ounce (oz)" },
    { key: "lb", label: "Pound (lb)" },
    { key: "st", label: "Stone (st)" },
  ],
  speed: [
    { key: "ms", label: "Metres/second (m/s)" },
    { key: "kmh", label: "Kilometres/hour (km/h)" },
    { key: "mph", label: "Miles/hour (mph)" },
    { key: "kn", label: "Knot (kn)" },
    { key: "fts", label: "Feet/second (ft/s)" },
    { key: "mach", label: "Mach" },
  ],
  angle: [
    { key: "deg", label: "Degree (°)" },
    { key: "rad", label: "Radian (rad)" },
    { key: "grad", label: "Gradian (grad)" },
    { key: "turn", label: "Turn" },
  ],
  frequency: [
    { key: "hz", label: "Hertz (Hz)" },
    { key: "khz", label: "Kilohertz (kHz)" },
    { key: "mhz", label: "Megahertz (MHz)" },
    { key: "ghz", label: "Gigahertz (GHz)" },
    { key: "thz", label: "Terahertz (THz)" },
  ],
};

function UnitConverterTool() {
  const [category, setCategory] = useState<UnitCategory>("dataSize");
  const [fromUnit, setFromUnit] = useState<string>("mb");
  const [inputValue, setInputValue] = useState<string>("1");
  const [output, setOutput] = useState<UnitConverterOutput | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const run = useCallback(
    async (val: string, cat: UnitCategory, unit: string) => {
      const num = parseFloat(val);
      if (val.trim() === "" || isNaN(num)) {
        setOutput(null);
        return;
      }
      const payload: UnitConverterInput = {
        value: num,
        fromUnit: unit,
        category: cat,
      };
      const result = (await callTool(RUST_COMMAND, payload, {
        skipHistory: true,
      })) as UnitConverterOutput;
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
      void run(inputValue, category, fromUnit);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, category, fromUnit, run]);

  const handleCategoryChange = (cat: UnitCategory) => {
    setCategory(cat);
    setFromUnit(CATEGORY_DEFAULT_UNIT[cat]);
  };

  const units = CATEGORY_UNITS[category];

  return (
    <div className="flex h-full flex-col bg-background-light font-display text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <PanelHeader
        label="Unit Converter"
        meta="Data size, time, temperature, length, weight, speed, angle, frequency"
      />

      <div className="no-scrollbar flex shrink-0 overflow-x-auto border-b border-border-light bg-panel-light dark:border-border-dark dark:bg-panel-dark">
        {CATEGORIES.map((cat) => {
          const active = category === cat.value;
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => handleCategoryChange(cat.value)}
              className={twMerge(
                "flex shrink-0 items-center justify-center whitespace-nowrap px-4 py-2.5 text-xs font-semibold transition-colors",
                active
                  ? "border-b-2 border-primary text-primary"
                  : "border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              )}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 border-b border-border-light bg-panel-light px-4 py-3 dark:border-border-dark dark:bg-panel-dark">
        <input
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter value…"
          className="w-48 rounded-lg border border-border-light bg-background-light px-3 py-2 font-mono text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-dark dark:bg-background-dark dark:text-slate-200"
          autoFocus
        />
        <select
          value={fromUnit}
          onChange={(e) => setFromUnit(e.target.value)}
          className="rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-dark dark:bg-background-dark dark:text-slate-200"
        >
          {units.map((u) => (
            <option key={u.key} value={u.key}>
              {u.label}
            </option>
          ))}
        </select>
        {output && !output.error && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {output.results.length} conversions
          </span>
        )}
        {output?.error && (
          <span className="text-xs text-red-400">{output.error}</span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto custom-scrollbar p-4">
        {!inputValue.trim() || isNaN(parseFloat(inputValue)) ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Enter a value and select a unit above to see all conversions.
          </div>
        ) : output?.error ? (
          <div className="text-sm text-red-400">{output.error}</div>
        ) : output ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {output.results.map((result) => {
              const isSource = result.unit === fromUnit;
              return (
                <div
                  key={result.unit}
                  className={`relative rounded-lg border p-3 transition-colors ${
                    isSource
                      ? "border-primary/40 bg-primary/5 dark:bg-primary/10"
                      : "border-border-light bg-panel-light dark:border-border-dark dark:bg-panel-dark"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {result.label}
                    </span>
                    <CopyButton
                      value={result.formatted}
                      variant="icon"
                      aria-label={`Copy ${result.label}`}
                    />
                  </div>
                  <div
                    className={`mt-1 break-all font-mono text-base font-semibold leading-snug ${
                      isSource
                        ? "text-primary"
                        : "text-slate-800 dark:text-slate-100"
                    }`}
                  >
                    {result.formatted}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      <ToolbarFooter
        groups={[
          {
            end: true,
            children: (
              <button
                type="button"
                onClick={() => {
                  setInputValue("1");
                  setFromUnit(CATEGORY_DEFAULT_UNIT[category]);
                  setOutput(null);
                }}
                className="rounded-lg border border-border-light bg-panel-light px-3 py-1.5 text-xs text-slate-500 transition-colors hover:text-slate-700 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400 dark:hover:text-slate-200"
              >
                Reset
              </button>
            ),
          },
        ]}
      />
    </div>
  );
}

export default UnitConverterTool;
