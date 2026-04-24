import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getToolById } from "../../registry";
import { useChainStore } from "../../store";
import { ConfirmButton } from "../ui/ConfirmButton";

function formatChainDate(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Today";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ChainsPage() {
  const navigate = useNavigate();
  const chains = useChainStore((s) => s.chains);
  const deleteChain = useChainStore((s) => s.deleteChain);
  const createChain = useChainStore((s) => s.createChain);
  const setActiveChainId = useChainStore((s) => s.setActiveChainId);

  const sortedChains = useMemo(
    () => [...chains].sort((a, b) => b.updatedAt - a.updatedAt),
    [chains]
  );

  function handleNewChain() {
    const chain = createChain();
    setActiveChainId(chain.id);
    navigate(`/chains/${chain.id}`);
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background-light dark:bg-background-dark">
      <header className="shrink-0 px-8 py-6 border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark flex items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold text-slate-800 dark:text-slate-100">Chains</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Combine tools into reusable pipelines · saved locally
          </p>
        </div>
        <button
          type="button"
          onClick={handleNewChain}
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          New chain
        </button>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {sortedChains.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[240px] gap-3 text-center px-8">
            <span
              className="material-symbols-outlined text-[40px] text-slate-300 dark:text-slate-600"
              aria-hidden
            >
              link
            </span>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No chains yet.</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              Combine tools into a pipeline to transform data step by step.
            </p>
            <button
              type="button"
              onClick={handleNewChain}
              className="mt-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              New chain
            </button>
          </div>
        ) : (
          <div className="px-8 py-6 space-y-2">
            {sortedChains.map((chain) => {
              const displaySteps = chain.steps.slice(0, 5);
              const overflow = chain.steps.length - displaySteps.length;

              return (
                <div
                  key={chain.id}
                  className="group relative flex flex-col gap-2 rounded-lg border border-border-light bg-panel-light p-4 transition-colors hover:border-primary/40 dark:border-border-dark dark:bg-panel-dark"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/chains/${chain.id}`)}
                    aria-label={`Open chain ${chain.name}`}
                    className="absolute inset-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  />
                  <div className="relative z-0 flex items-start justify-between gap-3 min-w-0">
                    <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate pr-2">
                      {chain.name}
                    </h2>
                    <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                      {formatChainDate(chain.updatedAt)}
                    </span>
                  </div>
                  <div className="relative z-0 flex items-center gap-2 min-w-0">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-1 text-slate-500 dark:text-slate-400">
                      {displaySteps.length === 0 ? (
                        <span className="text-xs italic text-slate-400 dark:text-slate-500">No steps</span>
                      ) : (
                        displaySteps.map((step, idx) => {
                          const tool = getToolById(step.toolId);
                          return (
                            <span key={step.id} className="inline-flex items-center gap-1">
                              {idx > 0 && (
                                <span
                                  className="text-[10px] text-slate-300 dark:text-slate-600 px-0.5"
                                  aria-hidden
                                >
                                  →
                                </span>
                              )}
                              <span
                                className="material-symbols-outlined text-[16px] text-slate-500 dark:text-slate-400"
                                aria-hidden
                              >
                                {tool?.icon ?? "help"}
                              </span>
                            </span>
                          );
                        })
                      )}
                      {overflow > 0 && (
                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 ml-1">
                          +{overflow} more
                        </span>
                      )}
                      <span className="ml-2 font-mono text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                        {chain.steps.length} step{chain.steps.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div
                      className="relative z-10 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <ConfirmButton
                        label="Delete"
                        confirmLabel="Yes, delete"
                        onConfirm={() => deleteChain(chain.id)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-red-400"
                        confirmClassName=""
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
