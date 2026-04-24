import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getToolById } from "../../registry";
import { useChainStore } from "../../store";
import { StepPickerModal } from "../ui/StepPickerModal";

export function ChainEditPage() {
  const { chainId } = useParams<{ chainId: string }>();
  const chain = useChainStore((s) =>
    chainId ? s.chains.find((c) => c.id === chainId) : undefined
  );
  const setActiveChainId = useChainStore((s) => s.setActiveChainId);
  const renameChain = useChainStore((s) => s.renameChain);
  const addStep = useChainStore((s) => s.addStep);
  const removeStep = useChainStore((s) => s.removeStep);
  const moveStepUp = useChainStore((s) => s.moveStepUp);
  const moveStepDown = useChainStore((s) => s.moveStepDown);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!chainId) return;
    setActiveChainId(chainId);
    return () => setActiveChainId(null);
  }, [chainId, setActiveChainId]);

  const beginEditName = useCallback(() => {
    if (!chain) return;
    setDraftName(chain.name);
    setEditingName(true);
    requestAnimationFrame(() => nameInputRef.current?.focus());
  }, [chain]);

  const commitName = useCallback(() => {
    if (!chain || !chainId) return;
    const trimmed = draftName.trim();
    if (!trimmed) {
      setDraftName(chain.name);
    } else {
      renameChain(chainId, trimmed);
    }
    setEditingName(false);
  }, [chain, chainId, draftName, renameChain]);

  const cancelEditName = useCallback(() => {
    if (chain) setDraftName(chain.name);
    setEditingName(false);
  }, [chain]);

  useEffect(() => {
    if (chain && !editingName) setDraftName(chain.name);
  }, [chain, chain?.name, editingName]);

  if (!chainId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">Chain not found.</p>
        <Link
          to="/chains"
          className="text-sm font-medium text-primary hover:underline"
        >
          Back to Chains
        </Link>
      </div>
    );
  }

  if (!chain) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">Chain not found.</p>
        <Link to="/chains" className="text-sm font-medium text-primary hover:underline">
          Back to Chains
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background-light dark:bg-background-dark">
      <header className="shrink-0 px-8 py-4 border-b border-border-light dark:border-border-dark flex flex-wrap items-center gap-2 min-h-[3.5rem]">
        <Link
          to="/chains"
          className="text-sm text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors shrink-0"
        >
          ← Chains
        </Link>
        <span className="text-slate-300 dark:text-slate-600" aria-hidden>
          /
        </span>
        <div className="min-w-0 flex-1">
          {editingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitName();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  cancelEditName();
                }
              }}
              className="w-full max-w-xl rounded-md border border-border-light bg-white px-2 py-1 text-base font-semibold text-slate-900 outline-none focus:border-primary/50 dark:border-border-dark dark:bg-panel-dark dark:text-slate-100"
              aria-label="Chain name"
            />
          ) : (
            <button
              type="button"
              onClick={beginEditName}
              className="text-left text-base font-semibold text-slate-800 dark:text-slate-100 truncate max-w-full hover:text-primary transition-colors"
            >
              {chain.name}
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6">
        {chain.steps.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[200px] gap-3 text-center">
            <span
              className="material-symbols-outlined text-[40px] text-slate-300 dark:text-slate-600"
              aria-hidden
            >
              conversion_path
            </span>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Add your first step.</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              Use the search below to find a tool to start your chain.
            </p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-0">
            {chain.steps.map((step, index) => {
              const tool = getToolById(step.toolId);
              const isFirst = index === 0;
              const isLast = index === chain.steps.length - 1;

              return (
                <div key={step.id}>
                  {index > 0 && (
                    <div className="flex justify-center py-1 text-slate-300 dark:text-slate-600 text-sm select-none">
                      ↓
                    </div>
                  )}
                  <div className="rounded-lg border border-border-light bg-panel-light dark:border-border-dark dark:bg-panel-dark overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-border-dark">
                      <span className="font-mono text-xs text-slate-400 dark:text-slate-500 w-5 shrink-0">
                        {index + 1}
                      </span>
                      <span
                        className="material-symbols-outlined text-[18px] text-slate-500 dark:text-slate-400 shrink-0"
                        aria-hidden
                      >
                        {tool?.icon ?? "help"}
                      </span>
                      <span className="flex-1 min-w-0 text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {tool?.name ?? "Tool not found"}
                      </span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => moveStepUp(chain.id, step.id)}
                          aria-label="Move step up"
                          className={`flex size-8 items-center justify-center rounded-md text-slate-500 transition-colors dark:text-slate-400 ${
                            isFirst
                              ? "opacity-50"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                        </button>
                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => moveStepDown(chain.id, step.id)}
                          aria-label="Move step down"
                          className={`flex size-8 items-center justify-center rounded-md text-slate-500 transition-colors dark:text-slate-400 ${
                            isLast
                              ? "opacity-50"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeStep(chain.id, step.id)}
                          aria-label="Remove step"
                          className="flex size-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-red-400"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 px-4 py-3">
                      Output and config will appear here when execution is added.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="max-w-2xl mx-auto pt-8 pb-4">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-primary/50 hover:text-primary dark:border-slate-600 dark:text-slate-300 dark:hover:border-primary/50 dark:hover:text-primary"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              add
            </span>
            Add step
          </button>
        </div>
      </div>

      <StepPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        existingToolIds={chain.steps.map((s) => s.toolId)}
        onSelect={(tool) => {
          addStep(chain.id, tool.id);
        }}
      />
    </div>
  );
}
