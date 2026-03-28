import { useCallback, useState } from "react";
import { JwtBuildPane } from "./JwtBuildPane";
import { JwtDecodePane } from "./JwtDecodePane";

export default function JwtTool() {
  const [tab, setTab] = useState<"decode" | "build">("decode");

  const openDecodeTab = useCallback(() => {
    setTab("decode");
  }, []);

  return (
    <div className="flex h-full flex-col bg-background-light dark:bg-background-dark">
      <div className="flex shrink-0 gap-1 border-b border-slate-200 dark:border-border-dark px-4 pt-3">
        {(["decode", "build"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-t-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "border-b-2 border-primary bg-primary/10 text-primary"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {t === "decode" ? "Decode" : "Build"}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {tab === "decode" ? (
          <JwtDecodePane />
        ) : (
          <JwtBuildPane onOpenInDecodeTab={openDecodeTab} />
        )}
      </div>
    </div>
  );
}
