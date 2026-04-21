import { useMemo, useState } from "react";
import { CopyButton } from "../../components/tool";

const ROMAN_TABLE: [number, string][] = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

function toRoman(n: number): string {
  let result = "";
  let x = n;
  for (const [value, numeral] of ROMAN_TABLE) {
    while (x >= value) {
      result += numeral;
      x -= value;
    }
  }
  return result;
}

const ROMAN_VALUES: Record<string, number> = {
  I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000,
};

function toArabic(s: string): number | null {
  const upper = s.toUpperCase().trim();
  if (!upper || !/^[IVXLCDM]+$/.test(upper)) return null;
  let total = 0;
  for (let i = 0; i < upper.length; i++) {
    const curr = ROMAN_VALUES[upper[i]] ?? 0;
    const next = ROMAN_VALUES[upper[i + 1]] ?? 0;
    total += curr < next ? -curr : curr;
  }
  if (toRoman(total) !== upper) return null;
  return total;
}

function breakdown(n: number): { numeral: string; value: number }[] {
  const parts: { numeral: string; value: number }[] = [];
  let x = n;
  for (const [value, numeral] of ROMAN_TABLE) {
    while (x >= value) {
      const last = parts[parts.length - 1];
      if (last && last.numeral === numeral) {
        last.value += value;
      } else {
        parts.push({ numeral, value });
      }
      x -= value;
    }
  }
  return parts;
}

type RomanResult =
  | { error: string }
  | { arabic: number; roman: string; parts: { numeral: string; value: number }[] };

const inputCls =
  "w-44 rounded-lg border border-border-light dark:border-border-dark bg-input-light dark:bg-input-dark px-3 py-3 text-2xl text-center font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-primary/40";

export default function RomanNumeralsTool() {
  const [arabic, setArabic] = useState("");
  const [roman, setRoman] = useState("");
  const [activeField, setActiveField] = useState<"arabic" | "roman">("arabic");

  const result = useMemo((): RomanResult | null => {
    if (activeField === "arabic") {
      if (!arabic.trim()) return null;
      const n = parseInt(arabic, 10);
      if (Number.isNaN(n) || n < 1 || n > 3999)
        return { error: "Enter a number between 1 and 3,999" };
      return { arabic: n, roman: toRoman(n), parts: breakdown(n) };
    }
    if (!roman.trim()) return null;
    const n = toArabic(roman);
    if (n === null) return { error: "Invalid Roman numeral" };
    return { arabic: n, roman: roman.toUpperCase(), parts: breakdown(n) };
  }, [arabic, roman, activeField]);

  function handleArabicChange(val: string) {
    setArabic(val);
    setActiveField("arabic");
    const n = parseInt(val, 10);
    setRoman(!Number.isNaN(n) && n >= 1 && n <= 3999 ? toRoman(n) : "");
  }

  function handleRomanChange(val: string) {
    setRoman(val);
    setActiveField("roman");
    const n = toArabic(val);
    setArabic(n !== null ? String(n) : "");
  }

  const hasResult = result && !("error" in result);

  return (
    <div className="flex flex-col items-center gap-10 pt-12">
      {/* Inputs */}
      <div className="flex items-end gap-5">
        {/* Number */}
        <div className="flex flex-col items-center gap-2">
          <label className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Number
          </label>
          <input
            type="number"
            value={arabic}
            onChange={(e) => handleArabicChange(e.target.value)}
            placeholder="1–3999"
            className={`${inputCls} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
          />
          <div className="h-7 flex items-center">
            {hasResult && arabic && (
              <CopyButton value={arabic} />
            )}
          </div>
        </div>

        {/* Equals */}
        <span className="text-2xl text-slate-300 dark:text-slate-600 mb-9">=</span>

        {/* Roman */}
        <div className="flex flex-col items-center gap-2">
          <label className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Roman
          </label>
          <input
            type="text"
            value={roman}
            onChange={(e) => handleRomanChange(e.target.value)}
            placeholder="e.g. XIV"
            spellCheck={false}
            className={inputCls}
          />
          <div className="h-7 flex items-center">
            {hasResult && roman && (
              <CopyButton value={roman} />
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {result && "error" in result && (
        <p className="text-sm text-red-500 dark:text-red-400">{result.error}</p>
      )}

      {/* Breakdown */}
      {hasResult && result.parts.length > 0 && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Breakdown
          </p>
          <div className="flex flex-wrap justify-center items-center gap-1">
            {result.parts.map((part, i) => (
              <div key={`${part.numeral}-${i}`} className="flex items-center gap-1">
                <div className="flex flex-col items-center px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-border-light dark:border-border-dark min-w-[56px]">
                  <span className="text-lg font-semibold font-mono text-slate-900 dark:text-slate-100 leading-tight">
                    {part.numeral}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {part.value.toLocaleString()}
                  </span>
                </div>
                {i < result.parts.length - 1 && (
                  <span className="text-slate-300 dark:text-slate-600 text-sm font-medium">+</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
