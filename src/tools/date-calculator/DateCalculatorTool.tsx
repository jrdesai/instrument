import { useMemo, useState } from "react";
import { CopyButton } from "../../components/tool/CopyButton";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";

interface DateDiff {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  totalWeeks: number;
  totalMonths: number;
  totalHours: number;
  daysUntilNextAnniversary: number | null;
  nextAnniversaryDate: string | null;
}

interface DurationResult {
  negative: boolean;
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  totalMinutes: number;
  totalHours: number;
  totalDays: number;
  iso: string;
  human: string;
}

interface AddSubResult {
  resultMs: number;
  iso: string;
  local: string;
  unix: number;
}

type CalcMode = "age" | "duration" | "add";

/** Today as YYYY-MM-DD in local time — avoids UTC shift. */
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** Returns "YYYY-MM-DDTHH:MM" in local time for datetime-local inputs. */
function localDateTimeStr(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function calcDateDiff(fromStr: string, toStr: string): DateDiff | null {
  if (!fromStr || !toStr) return null;

  const parseLocal = (s: string): Date | null => {
    const parts = s.split("-").map(Number);
    if (parts.length !== 3) return null;
    const [y, m, d] = parts;
    if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) return null;
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
    return date;
  };

  const from = parseLocal(fromStr);
  const to = parseLocal(toStr);
  if (!from || !to || from > to) return null;

  let years = to.getFullYear() - from.getFullYear();
  if (
    to.getMonth() < from.getMonth() ||
    (to.getMonth() === from.getMonth() && to.getDate() < from.getDate())
  ) {
    years -= 1;
  }

  let fy = from.getFullYear() + years;
  let fm = from.getMonth();
  const fd = from.getDate();

  let months = (to.getFullYear() - fy) * 12 + (to.getMonth() - fm);
  if (to.getDate() < fd) months -= 1;

  fm += months;
  fy += Math.floor(fm / 12);
  fm %= 12;
  const advanced = new Date(fy, fm, fd);
  const days = Math.round((to.getTime() - advanced.getTime()) / 86_400_000);

  const totalDays = Math.floor((to.getTime() - from.getTime()) / 86_400_000);
  const totalWeeks = Math.floor(totalDays / 7);
  const totalMonths = years * 12 + months;
  const totalHours = totalDays * 24;

  const origMonth = from.getMonth();
  const origDay = from.getDate();
  const toYear = to.getFullYear();
  let nextAnniv: Date | null = null;

  for (const yr of [toYear, toYear + 1, toYear + 2, toYear + 3, toYear + 4]) {
    const candidate = new Date(yr, origMonth, origDay);
    if (candidate.getMonth() === origMonth && candidate.getDate() === origDay && candidate >= to) {
      nextAnniv = candidate;
      break;
    }
  }

  return {
    years,
    months,
    days,
    totalDays,
    totalWeeks,
    totalMonths,
    totalHours,
    daysUntilNextAnniversary: nextAnniv
      ? Math.round((nextAnniv.getTime() - to.getTime()) / 86_400_000)
      : null,
    nextAnniversaryDate: nextAnniv
      ? nextAnniv.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null,
  };
}

function formatAge(d: DateDiff): string {
  const parts: string[] = [];
  if (d.years > 0) parts.push(`${d.years} ${d.years === 1 ? "year" : "years"}`);
  if (d.months > 0) parts.push(`${d.months} ${d.months === 1 ? "month" : "months"}`);
  if (d.days > 0 || parts.length === 0) parts.push(`${d.days} ${d.days === 1 ? "day" : "days"}`);
  return parts.join(", ");
}

function calcDuration(startStr: string, endStr: string): DurationResult | null {
  if (!startStr || !endStr) return null;
  const start = new Date(startStr).getTime();
  const end = new Date(endStr).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;

  const negative = end < start;
  const totalMs = Math.abs(end - start);
  const totalSeconds = Math.floor(totalMs / 1_000);
  const totalMinutes = Math.floor(totalMs / 60_000);
  const totalHours = Math.floor(totalMs / 3_600_000);
  const totalDays = Math.floor(totalMs / 86_400_000);

  const days = totalDays;
  const hours = Math.floor((totalMs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1_000);

  const datePart = days > 0 ? `${days}D` : "";
  const hPart = hours > 0 ? `${hours}H` : "";
  const mPart = minutes > 0 ? `${minutes}M` : "";
  const sPart = seconds > 0 ? `${seconds}S` : "";
  const timePart = hPart || mPart || sPart ? `T${hPart}${mPart}${sPart}` : "";
  const iso = totalMs === 0 ? "PT0S" : `P${datePart}${timePart}`;

  const humanParts: string[] = [];
  if (days > 0) humanParts.push(`${days} ${days === 1 ? "day" : "days"}`);
  if (hours > 0) humanParts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  if (minutes > 0) humanParts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
  if (seconds > 0) humanParts.push(`${seconds} ${seconds === 1 ? "second" : "seconds"}`);
  const human = humanParts.length > 0 ? humanParts.join(", ") : "0 seconds";

  return {
    negative,
    totalMs,
    days,
    hours,
    minutes,
    seconds,
    totalSeconds,
    totalMinutes,
    totalHours,
    totalDays,
    iso,
    human,
  };
}

function calcAddSub(
  baseDtStr: string,
  op: "add" | "subtract",
  dDays: number,
  dHours: number,
  dMinutes: number,
  dSeconds: number
): AddSubResult | null {
  if (!baseDtStr) return null;
  const base = new Date(baseDtStr).getTime();
  if (Number.isNaN(base)) return null;

  const deltaMs = (dDays * 86_400 + dHours * 3_600 + dMinutes * 60 + dSeconds) * 1_000;
  const resultMs = op === "add" ? base + deltaMs : base - deltaMs;
  const d = new Date(resultMs);

  return {
    resultMs,
    iso: d.toISOString().replace(/\.\d{3}Z$/, "Z"),
    local: d.toLocaleString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    unix: Math.floor(resultMs / 1_000),
  };
}

function OptionPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border-light bg-transparent text-slate-500 hover:text-primary dark:border-border-dark"
      }`}
    >
      {children}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
      {children}
    </p>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border-light bg-panel-light px-4 py-3 dark:border-border-dark dark:bg-panel-dark">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {label}
      </span>
      <span className="font-mono text-lg font-bold text-slate-800 dark:text-slate-100">{value}</span>
    </div>
  );
}

const TOOL_ID = "date-calculator";

function DateCalculatorTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [mode, setMode] = useState<CalcMode>("age");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState(todayStr);
  useRestoreStringDraft(TOOL_ID, setFromDate);

  const [startDt, setStartDt] = useState(() => localDateTimeStr(Date.now() - 3_600_000));
  const [endDt, setEndDt] = useState(() => localDateTimeStr(Date.now()));

  const [baseDt, setBaseDt] = useState(() => localDateTimeStr(Date.now()));
  const [addSubOp, setAddSubOp] = useState<"add" | "subtract">("add");
  const [dDays, setDDays] = useState(0);
  const [dHours, setDHours] = useState(1);
  const [dMinutes, setDMinutes] = useState(0);
  const [dSeconds, setDSeconds] = useState(0);

  const isAgeError = fromDate !== "" && toDate !== "" && fromDate > toDate;
  const ageDiff = useMemo(
    () => (!isAgeError ? calcDateDiff(fromDate, toDate) : null),
    [fromDate, toDate, isAgeError]
  );
  const ageString = ageDiff ? formatAge(ageDiff) : null;
  const durationRes = useMemo(() => calcDuration(startDt, endDt), [startDt, endDt]);
  const addSubRes = useMemo(
    () => calcAddSub(baseDt, addSubOp, dDays, dHours, dMinutes, dSeconds),
    [baseDt, addSubOp, dDays, dHours, dMinutes, dSeconds]
  );

  function handleAgeFromChange(v: string) {
    setFromDate(v);
    setDraft(v);
  }
  function handleAgeSwap() {
    setFromDate(toDate);
    setDraft(toDate);
    setToDate(fromDate);
  }
  function handleDurationSwap() {
    setStartDt(endDt);
    setEndDt(startDt);
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background-light font-display text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <div className="shrink-0 border-b border-border-light bg-panel-light px-4 py-3 dark:border-border-dark dark:bg-panel-dark">
        <div className="flex items-center gap-2">
          <OptionPill active={mode === "age"} onClick={() => setMode("age")}>
            Age
          </OptionPill>
          <OptionPill active={mode === "duration"} onClick={() => setMode("duration")}>
            Duration
          </OptionPill>
          <OptionPill active={mode === "add"} onClick={() => setMode("add")}>
            Add / Subtract
          </OptionPill>
        </div>
      </div>

      <div className="shrink-0 p-4">
        <div className="flex flex-col gap-4">
          {mode === "age" && (
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1.5">
                <SectionLabel>From</SectionLabel>
                <input
                  id="dc-from"
                  type="date"
                  value={fromDate}
                  onChange={(e) => handleAgeFromChange(e.target.value)}
                  className="rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm dark:border-border-dark dark:bg-background-dark"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <SectionLabel>To</SectionLabel>
                <input
                  id="dc-to"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm dark:border-border-dark dark:bg-background-dark"
                />
              </div>
              <button
                type="button"
                onClick={handleAgeSwap}
                aria-label="Swap dates"
                className="self-end rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm text-slate-500 transition-colors hover:text-primary dark:border-border-dark dark:bg-background-dark dark:text-slate-400"
              >
                ↔ Swap
              </button>
            </div>
          )}

          {mode === "duration" && (
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex min-w-[180px] flex-1 flex-col gap-1">
                <SectionLabel>Start</SectionLabel>
                <input
                  type="datetime-local"
                  value={startDt}
                  onChange={(e) => setStartDt(e.target.value)}
                  className="rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm dark:border-border-dark dark:bg-panel-dark dark:text-slate-100"
                />
              </div>
              <div className="flex min-w-[180px] flex-1 flex-col gap-1">
                <SectionLabel>End</SectionLabel>
                <input
                  type="datetime-local"
                  value={endDt}
                  onChange={(e) => setEndDt(e.target.value)}
                  className="rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm dark:border-border-dark dark:bg-panel-dark dark:text-slate-100"
                />
              </div>
              <button
                type="button"
                onClick={handleDurationSwap}
                aria-label="Swap start and end"
                className="self-end rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm text-slate-500 transition-colors hover:text-primary dark:border-border-dark dark:bg-background-dark dark:text-slate-400"
              >
                <span className="material-symbols-outlined align-middle text-[18px] leading-none">
                  swap_horiz
                </span>
              </button>
            </div>
          )}

          {mode === "add" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex min-w-[180px] flex-1 flex-col gap-1">
                  <SectionLabel>Base datetime</SectionLabel>
                  <input
                    type="datetime-local"
                    value={baseDt}
                    onChange={(e) => setBaseDt(e.target.value)}
                    className="rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm dark:border-border-dark dark:bg-panel-dark dark:text-slate-100"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <SectionLabel>Operation</SectionLabel>
                  <div className="flex gap-1">
                    <OptionPill active={addSubOp === "add"} onClick={() => setAddSubOp("add")}>
                      Add
                    </OptionPill>
                    <OptionPill
                      active={addSubOp === "subtract"}
                      onClick={() => setAddSubOp("subtract")}
                    >
                      Subtract
                    </OptionPill>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="flex flex-col gap-1">
                  <SectionLabel>Days</SectionLabel>
                  <input
                    type="number"
                    min={0}
                    value={dDays}
                    onChange={(e) => setDDays(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-16 rounded-lg border border-border-light px-2 py-2 text-center text-sm dark:border-border-dark dark:bg-panel-dark dark:text-slate-100"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <SectionLabel>Hours</SectionLabel>
                  <input
                    type="number"
                    min={0}
                    value={dHours}
                    onChange={(e) => setDHours(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-16 rounded-lg border border-border-light px-2 py-2 text-center text-sm dark:border-border-dark dark:bg-panel-dark dark:text-slate-100"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <SectionLabel>Minutes</SectionLabel>
                  <input
                    type="number"
                    min={0}
                    value={dMinutes}
                    onChange={(e) =>
                      setDMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))
                    }
                    className="w-16 rounded-lg border border-border-light px-2 py-2 text-center text-sm dark:border-border-dark dark:bg-panel-dark dark:text-slate-100"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <SectionLabel>Seconds</SectionLabel>
                  <input
                    type="number"
                    min={0}
                    value={dSeconds}
                    onChange={(e) =>
                      setDSeconds(Math.max(0, parseInt(e.target.value, 10) || 0))
                    }
                    className="w-16 rounded-lg border border-border-light px-2 py-2 text-center text-sm dark:border-border-dark dark:bg-panel-dark dark:text-slate-100"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 p-4">
          <div className="rounded-xl border border-border-light bg-panel-light p-6 dark:border-border-dark dark:bg-panel-dark">
            {mode === "age" &&
              (isAgeError ? (
                <p className="text-sm font-medium text-red-500 dark:text-red-400">
                  Start date must be before end date
                </p>
              ) : ageString ? (
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                      {ageString}
                    </span>
                    <CopyButton value={ageString} aria-label="Copy age" />
                  </div>
                  {(ageDiff!.years > 0 || ageDiff!.months > 0) && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      or {ageDiff!.totalDays.toLocaleString()} days
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Enter a start date to calculate age or difference
                </p>
              ))}

            {mode === "duration" &&
              (durationRes ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-2xl font-bold leading-snug ${
                        durationRes.negative
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-slate-900 dark:text-slate-100"
                      }`}
                    >
                      {durationRes.negative ? "−\u202F" : ""}
                      {durationRes.human}
                    </p>
                    <CopyButton value={durationRes.human} aria-label="Copy duration" />
                  </div>
                  {durationRes.negative && (
                    <p className="text-xs text-amber-500 dark:text-amber-400">
                      End is before start — showing absolute duration.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Enter datetimes above to calculate duration
                </p>
              ))}

            {mode === "add" &&
              (addSubRes ? (
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {addSubRes.local}
                    </p>
                    <p className="mt-1 font-mono text-sm text-slate-500 dark:text-slate-400">
                      {addSubRes.iso}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                      Unix: {addSubRes.unix.toLocaleString()}
                    </p>
                  </div>
                  <CopyButton value={addSubRes.iso} aria-label="Copy result datetime" />
                </div>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Enter a base datetime above
                </p>
              ))}
          </div>

          {mode === "age" && ageDiff && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Total Days" value={ageDiff.totalDays.toLocaleString()} />
              <StatCard label="Total Weeks" value={ageDiff.totalWeeks.toLocaleString()} />
              <StatCard label="Total Months" value={ageDiff.totalMonths.toLocaleString()} />
              <StatCard label="Total Hours" value={ageDiff.totalHours.toLocaleString()} />
            </div>
          )}

          {mode === "duration" && durationRes && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Total Seconds" value={durationRes.totalSeconds.toLocaleString()} />
              <StatCard label="Total Minutes" value={durationRes.totalMinutes.toLocaleString()} />
              <StatCard label="Total Hours" value={durationRes.totalHours.toLocaleString()} />
              <StatCard label="Total Days" value={durationRes.totalDays.toLocaleString()} />
            </div>
          )}

          {mode === "age" && ageDiff?.nextAnniversaryDate && (
            <div className="rounded-xl border border-border-light bg-panel-light px-4 py-3 dark:border-border-dark dark:bg-panel-dark">
              {ageDiff.daysUntilNextAnniversary === 0 ? (
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  🎉 Today is the anniversary!
                </p>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Next anniversary in{" "}
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {ageDiff.daysUntilNextAnniversary === 1
                      ? "1 day"
                      : `${ageDiff.daysUntilNextAnniversary?.toLocaleString()} days`}
                  </span>{" "}
                  · {ageDiff.nextAnniversaryDate}
                </p>
              )}
            </div>
          )}

          {mode === "duration" && durationRes && (
            <div className="flex items-center justify-between rounded-lg border border-border-light px-4 py-3 dark:border-border-dark">
              <div className="flex flex-col gap-0.5">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  ISO 8601 Duration
                </p>
                <code className="font-mono text-sm text-slate-700 dark:text-slate-300">
                  {durationRes.iso}
                </code>
              </div>
              <CopyButton value={durationRes.iso} aria-label="Copy ISO 8601 duration" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DateCalculatorTool;
