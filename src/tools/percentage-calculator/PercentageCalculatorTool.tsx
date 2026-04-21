import { useMemo, useState } from "react";
import { CopyButton } from "../../components/tool";

function fmt(n: number): string {
  return parseFloat(n.toPrecision(8)).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

type Row = { label: string; value: string; raw: number };

function calcRows(a: number, b: number, fa: string, fb: string): Row[] {
  const pctChangeRaw = a === 0 ? NaN : ((b - a) / Math.abs(a)) * 100;
  const pctChangeValue =
    a === 0
      ? "—"
      : (pctChangeRaw >= 0 ? "+" : "") + fmt(pctChangeRaw) + "%";

  return [
    {
      label: `${fa}% of ${fb}`,
      value: fmt((a / 100) * b),
      raw: (a / 100) * b,
    },
    {
      label: `${fb} + ${fa}%`,
      value: fmt(b + (a / 100) * b),
      raw: b + (a / 100) * b,
    },
    {
      label: `${fb} − ${fa}%`,
      value: fmt(b - (a / 100) * b),
      raw: b - (a / 100) * b,
    },
    {
      label: `% change ${fa} → ${fb}`,
      value: pctChangeValue,
      raw: pctChangeRaw,
    },
    {
      label: `${fa} is what % of ${fb}`,
      value: b !== 0 ? fmt((a / b) * 100) + "%" : "—",
      raw: b !== 0 ? (a / b) * 100 : NaN,
    },
    {
      label: `${fb} is what % of ${fa}`,
      value: a !== 0 ? fmt((b / a) * 100) + "%" : "—",
      raw: a !== 0 ? (b / a) * 100 : NaN,
    },
  ];
}

const inputCls =
  "w-full rounded-lg border border-border-light dark:border-border-dark bg-input-light dark:bg-input-dark pl-9 pr-3 py-2.5 text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-primary/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export default function PercentageCalculatorTool() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  const rows = useMemo(() => {
    const na = parseFloat(a);
    const nb = parseFloat(b);
    if (Number.isNaN(na) || Number.isNaN(nb)) return null;
    return calcRows(na, nb, a, b);
  }, [a, b]);

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Inputs with inline A / B prefix */}
      <div className="flex items-center justify-center gap-8 mt-6">
        {[
          { key: "a", val: a, set: setA, placeholder: "e.g. 15" },
          { key: "b", val: b, set: setB, placeholder: "e.g. 200" },
        ].map(({ key, val, set, placeholder }) => (
          <div key={key} className="relative w-44">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400 dark:text-slate-500 select-none pointer-events-none">
              {key.toUpperCase()}
            </span>
            <input
              type="number"
              value={val}
              onChange={(e) => set(e.target.value)}
              placeholder={placeholder}
              className={inputCls}
            />
          </div>
        ))}
      </div>

      {rows ? (
        <div className="flex flex-col divide-y divide-border-light dark:divide-border-dark rounded-lg border border-border-light dark:border-border-dark overflow-hidden">
          {rows.map((row) => {
            const isChange = row.label.startsWith("% change");
            const isPositive = isChange && row.raw > 0;
            const isNegative = isChange && row.raw < 0;
            return (
              <div
                key={row.label}
                className="flex items-center gap-4 px-5 py-3 bg-output-light dark:bg-output-dark"
              >
                <span className="flex-1 text-sm text-slate-500 dark:text-slate-400 truncate">
                  {row.label}
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`w-28 text-right text-base font-semibold tabular-nums ${
                      isPositive
                        ? "text-green-600 dark:text-green-400"
                        : isNegative
                          ? "text-red-500 dark:text-red-400"
                          : "text-slate-900 dark:text-slate-100"
                    }`}
                  >
                    {row.value}
                  </span>
                  <div className="w-16 flex justify-end">
                    {row.value !== "—" ? <CopyButton value={row.value} /> : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
          Enter values for A and B to see results.
        </div>
      )}
    </div>
  );
}
