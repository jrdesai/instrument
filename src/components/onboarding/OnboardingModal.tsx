import { useCallback, useEffect, useMemo, useState } from "react";
import { isWeb } from "../../bridge";
import { getToolById, tools, type Role, type Tool } from "../../registry";
import { LogoMark } from "../LogoMark";
import { usePreferenceStore, useToolStore } from "../../store";

const ROLE_TOOL_MAP: Record<Role, string[]> = {
  frontend: [
    "base64-encoder",
    "url-encoder",
    "html-entity",
    "html-formatter",
    "color-converter",
    "json-formatter",
    "regex-tester",
    "text-case-converter",
    "code-formatter",
    "markdown-editor",
    "word-counter",
  ],
  backend: [
    "jwt",
    "hash",
    "json-formatter",
    "uuid-generator",
    "sql-formatter",
    "yaml-formatter",
    "env-parser",
    "cidr-calculator",
    "json-schema-validator",
    "timestamp-converter",
  ],
  security: [
    "hash",
    "jwt",
    "aes-encrypt-decrypt",
    "password-generator",
    "cert-decoder",
    "totp-generator",
    "basic-auth",
    "passphrase-generator",
    "api-key-generator",
  ],
  devops: [
    "cidr-calculator",
    "env-parser",
    "yaml-formatter",
    "json-formatter",
    "timestamp-converter",
    "cron-parser",
    "uuid-generator",
    "chmod-calculator",
    "semver",
  ],
  data: [
    "csv-to-json",
    "json-formatter",
    "xml-formatter",
    "html-formatter",
    "yaml-formatter",
    "json-converter",
    "config-converter",
    "json-path",
    "text-diff",
  ],
  general: [
    "base64-encoder",
    "json-formatter",
    "timestamp-converter",
    "uuid-generator",
    "text-diff",
    "find-replace",
    "unit-converter",
    "url-encoder",
    "hash",
    "word-counter",
  ],
};

const ROLE_CARDS: { role: Role; label: string; icon: string }[] = [
  { role: "frontend", label: "Frontend", icon: "web" },
  { role: "backend", label: "Backend", icon: "dns" },
  { role: "security", label: "Security", icon: "lock" },
  { role: "devops", label: "DevOps", icon: "rocket_launch" },
  { role: "data", label: "Data", icon: "table_chart" },
  { role: "general", label: "General", icon: "handyman" },
];

const isMac =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent);
const SEARCH_SHORTCUT = isMac ? "⌘K" : "Ctrl+K";

function starterToolIds(roles: Role[]): string[] {
  const ids = new Set<string>();
  for (const role of roles) {
    for (const id of ROLE_TOOL_MAP[role] ?? []) {
      if (getToolById(id)) ids.add(id);
    }
  }
  return [...ids].sort((a, b) => {
    const ta = getToolById(a);
    const tb = getToolById(b);
    return (ta?.name ?? a).localeCompare(tb?.name ?? b);
  });
}

function OnboardingToolRow({
  tool,
  selected,
  onToggle,
}: {
  tool: Tool;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-border-dark/50"
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? "border-primary bg-primary" : "border-slate-300 dark:border-slate-600"
        }`}
        aria-hidden
      >
        {selected ? (
          <span className="material-symbols-outlined text-[12px] text-white">check</span>
        ) : null}
      </span>
      <span
        className="material-symbols-outlined shrink-0 text-[18px] text-slate-400"
        aria-hidden
      >
        {tool.icon}
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium text-slate-800 dark:text-slate-100">
        {tool.name}
      </span>
      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:bg-border-dark">
        {tool.displayCategory}
      </span>
    </button>
  );
}

function ProgressDots({ step }: { step: number }) {
  const activeIdx = step - 1;
  return (
    <div className="flex justify-center gap-2 pt-6">
      {[0, 1, 2, 3].map((i) => {
        const done = i < activeIdx;
        const current = i === activeIdx;
        return (
          <span
            key={i}
            className={`h-2 w-2 rounded-full ${
              done
                ? "bg-primary/40"
                : current
                  ? "bg-primary"
                  : "bg-slate-200 dark:bg-border-dark"
            }`}
          />
        );
      })}
    </div>
  );
}

export function OnboardingModal() {
  const onboardingComplete = usePreferenceStore((s) => s.onboardingComplete);
  const setOnboardingComplete = usePreferenceStore((s) => s.setOnboardingComplete);
  const setSelectedRoles = usePreferenceStore((s) => s.setSelectedRoles);

  const [step, setStep] = useState(1);
  const [pickedRoles, setPickedRoles] = useState<Role[]>([]);
  const [selectedToolIds, setSelectedToolIds] = useState<Set<string>>(new Set());
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    if (step === 3) {
      setSelectedToolIds(new Set(starterToolIds(pickedRoles)));
      setShowMore(false);
    }
  }, [step, pickedRoles]);

  const toggleRole = useCallback((role: Role) => {
    setPickedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }, []);

  const toggleTool = useCallback((id: string) => {
    setSelectedToolIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toolsForStep3 = useMemo(() => {
    const ids = starterToolIds(pickedRoles);
    return ids.map((id) => getToolById(id)).filter((t): t is Tool => t !== undefined);
  }, [pickedRoles]);

  const starterIdSet = useMemo(
    () => new Set(starterToolIds(pickedRoles)),
    [pickedRoles]
  );

  const groupedRemainingTools = useMemo(() => {
    const remaining = tools.filter(
      (t) =>
        t.implemented &&
        (!isWeb || t.platforms.includes("web")) &&
        !starterIdSet.has(t.id)
    );
    const grouped = remaining.reduce<Record<string, Tool[]>>((acc, tool) => {
      const cat = tool.displayCategory;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(tool);
      return acc;
    }, {});
    for (const list of Object.values(grouped)) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [starterIdSet]);

  const finishSkip = useCallback(() => {
    setOnboardingComplete(true);
  }, [setOnboardingComplete]);

  const handleStep3Done = useCallback(() => {
    setSelectedRoles(pickedRoles);
    const { favouriteToolIds, toggleFavourite } = useToolStore.getState();
    for (const id of selectedToolIds) {
      const tool = getToolById(id);
      if (!tool) continue;
      if (!favouriteToolIds.includes(tool.id)) {
        toggleFavourite(tool);
      }
    }
    setStep(4);
  }, [pickedRoles, selectedToolIds, setSelectedRoles]);

  const handleStep4Finish = useCallback(() => {
    setOnboardingComplete(true);
  }, [setOnboardingComplete]);

  if (onboardingComplete) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-panel-light shadow-2xl dark:bg-panel-dark">
        <div key={step} className="animate-fade-in-up">
          {step === 1 ? (
            <>
              <div className="flex flex-col items-center gap-4 bg-gradient-to-br from-primary/5 to-primary/15 px-8 py-12 dark:from-primary/10 dark:to-primary/20">
                <LogoMark className="h-16 w-16 rounded-2xl text-2xl" />
              </div>
              <div className="flex flex-col items-center gap-6 px-8 py-8 text-center">
                <h1
                  id="onboarding-title"
                  className="text-2xl font-bold text-slate-900 dark:text-slate-100"
                >
                  Welcome to Instrument
                </h1>
                <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">
                  Privacy-first developer tools. Everything runs locally on your device — always.
                </p>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-xl bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary/90"
                >
                  Get started →
                </button>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <ProgressDots step={2} />
              <div className="px-8 pb-2 pt-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  What kind of developer are you?
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  We&apos;ll set up your tools based on your answer. You can change this later.
                </p>
                <div className="mt-6 grid w-full grid-cols-2 gap-3">
                  {ROLE_CARDS.map(({ role, label, icon }) => {
                    const selected = pickedRoles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleRole(role)}
                        className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-4 transition-all hover:border-primary/40 hover:bg-primary/5 ${
                          selected
                            ? "border-2 border-primary bg-primary/10 dark:bg-primary/20"
                            : "border border-border-light dark:border-border-dark"
                        }`}
                      >
                        {selected ? (
                          <span
                            className="material-symbols-outlined absolute right-2 top-2 text-[16px] text-primary"
                            aria-hidden
                          >
                            check_circle
                          </span>
                        ) : null}
                        <span
                          className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-[28px] dark:bg-border-dark"
                          aria-hidden
                        >
                          <span className="material-symbols-outlined text-[28px] text-slate-600 dark:text-slate-300">
                            {icon}
                          </span>
                        </span>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border-light px-8 py-6 dark:border-border-dark">
                <button
                  type="button"
                  onClick={finishSkip}
                  className="cursor-pointer text-sm text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
                >
                  Skip
                </button>
                <button
                  type="button"
                  disabled={pickedRoles.length === 0}
                  onClick={() => setStep(3)}
                  className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continue →
                </button>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <ProgressDots step={3} />
              <div className="px-8 pb-2 pt-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Here are your starter tools.
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Pre-selected based on your role. Add or remove as needed.
                </p>
                <div className="mt-4 max-h-64 overflow-y-auto rounded-xl border border-border-light dark:border-border-dark custom-scrollbar">
                  {toolsForStep3.map((tool) => (
                    <OnboardingToolRow
                      key={tool.id}
                      tool={tool}
                      selected={selectedToolIds.has(tool.id)}
                      onToggle={() => toggleTool(tool.id)}
                    />
                  ))}
                  {groupedRemainingTools.length > 0 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowMore((prev) => !prev)}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
                      >
                        <span className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px]" aria-hidden>
                            add_circle
                          </span>
                          Add more tools
                        </span>
                        <span
                          className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${
                            showMore ? "rotate-180" : ""
                          }`}
                          aria-hidden
                        >
                          expand_more
                        </span>
                      </button>
                      {showMore ? (
                        <div className="mt-1 border-t border-border-light pt-2 dark:border-border-dark">
                          {groupedRemainingTools.map(([category, catTools]) => (
                            <div key={category}>
                              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {category}
                              </div>
                              {catTools.map((tool) => (
                                <OnboardingToolRow
                                  key={tool.id}
                                  tool={tool}
                                  selected={selectedToolIds.has(tool.id)}
                                  onToggle={() => toggleTool(tool.id)}
                                />
                              ))}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  {selectedToolIds.size} tool{selectedToolIds.size === 1 ? "" : "s"} selected
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-border-light px-8 py-6 dark:border-border-dark">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Back
                </button>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={finishSkip}
                    className="cursor-pointer text-sm text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    onClick={handleStep3Done}
                    className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                  >
                    Done →
                  </button>
                </div>
              </div>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <ProgressDots step={4} />
              <div className="flex flex-col items-center gap-6 px-8 py-8 text-center">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-500 dark:bg-green-900/30 dark:text-green-400"
                  aria-hidden
                >
                  <span className="material-symbols-outlined text-4xl">check</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  You&apos;re all set.
                </h2>
                <div className="flex w-full flex-col gap-3 text-left">
                  <div className="flex items-start gap-3 rounded-xl border border-border-light bg-slate-50 p-4 dark:border-border-dark dark:bg-border-dark/50">
                    <span className="material-symbols-outlined shrink-0 text-[20px] text-amber-500">
                      lightbulb
                    </span>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Press {SEARCH_SHORTCUT} to search all tools instantly.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl border border-border-light bg-slate-50 p-4 dark:border-border-dark dark:bg-border-dark/50">
                    <span className="material-symbols-outlined shrink-0 text-[20px] text-amber-500">
                      star
                    </span>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Your favourite tools appear on the dashboard.
                    </p>
                  </div>
                </div>
                {isWeb ? (
                  <p className="text-xs text-slate-400">
                    Preferences saved in this browser.
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={handleStep4Finish}
                  className="w-full rounded-xl bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary/90"
                >
                  Start using Instrument
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
