import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ALL_TAGS, CHAIN_TEMPLATES } from "../../data/chainTemplates";
import type { ChainTag, ChainTemplate } from "../../data/chainTemplates";
import { getToolById } from "../../registry";
import { useChainStore } from "../../store";
import { ConfirmButton } from "../ui/ConfirmButton";

const TAG_COLOURS: Record<ChainTag, string> = {
  security:
    "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  backend: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  frontend:
    "bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400",
  data: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  devops:
    "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

function formatChainDate(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Today";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function tagFilterLabel(tag: ChainTag): string {
  return tag.charAt(0).toUpperCase() + tag.slice(1);
}

function TemplateCard({
  template,
  onUse,
}: {
  template: ChainTemplate;
  onUse: (t: ChainTemplate) => void;
}) {
  const displaySteps = template.steps.slice(0, 3);

  return (
    <button
      type="button"
      onClick={() => onUse(template)}
      className="flex w-full flex-col gap-2 rounded-lg border border-border-light bg-panel-light p-4 text-left transition-colors hover:border-primary/40 cursor-pointer dark:border-border-dark dark:bg-panel-dark"
    >
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        {template.name}
      </span>
      <div className="flex flex-wrap gap-1">
        {template.tags.map((tag) => (
          <span
            key={tag}
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${TAG_COLOURS[tag]}`}
          >
            {tag}
          </span>
        ))}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
        {template.description}
      </p>
      <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1 text-slate-500 dark:text-slate-400">
        {displaySteps.map((step, idx) => {
          const tool = getToolById(step.toolId);
          return (
            <span key={`${template.id}-${step.toolId}-${idx}`} className="inline-flex items-center gap-1">
              {idx > 0 && (
                <span className="text-[14px] text-slate-300 dark:text-slate-600 px-0.5" aria-hidden>
                  →
                </span>
              )}
              <span
                className="material-symbols-outlined text-[14px] text-slate-500 dark:text-slate-400"
                aria-hidden
              >
                {tool?.icon ?? "help"}
              </span>
            </span>
          );
        })}
      </div>
      <div className="flex justify-end pt-1">
        <span className="text-xs font-medium text-primary hover:underline">Use template →</span>
      </div>
    </button>
  );
}

export function ChainsPage() {
  const navigate = useNavigate();
  const chains = useChainStore((s) => s.chains);
  const deleteChain = useChainStore((s) => s.deleteChain);
  const createChain = useChainStore((s) => s.createChain);
  const createChainFromTemplate = useChainStore((s) => s.createChainFromTemplate);
  const setActiveChainId = useChainStore((s) => s.setActiveChainId);

  const [activeTag, setActiveTag] = useState<ChainTag | null>(null);

  const sortedChains = useMemo(
    () => [...chains].sort((a, b) => b.updatedAt - a.updatedAt),
    [chains]
  );

  const filteredTemplates = useMemo(
    () =>
      activeTag ? CHAIN_TEMPLATES.filter((t) => t.tags.includes(activeTag)) : CHAIN_TEMPLATES,
    [activeTag]
  );

  function handleNewChain() {
    const chain = createChain();
    setActiveChainId(chain.id);
    navigate(`/chains/${chain.id}`);
  }

  function handleUseTemplate(template: ChainTemplate) {
    const chain = createChainFromTemplate(template);
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
          <div className="px-8 py-6 pb-10">
            <div className="-mx-1 flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              <button
                type="button"
                onClick={() => setActiveTag(null)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeTag === null
                    ? "bg-primary text-white"
                    : "border border-border-light bg-panel-light text-slate-500 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400"
                }`}
              >
                All
              </button>
              {ALL_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(tag)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    activeTag === tag
                      ? "bg-primary text-white"
                      : "border border-border-light bg-panel-light text-slate-500 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400"
                  }`}
                >
                  {tagFilterLabel(tag)}
                </button>
              ))}
            </div>

            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Start with a template or build from scratch
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filteredTemplates.map((template) => (
                <TemplateCard key={template.id} template={template} onUse={handleUseTemplate} />
              ))}
            </div>

            <div className="mt-8 flex flex-col items-center gap-3">
              <div className="flex w-full max-w-xs items-center gap-3">
                <div className="flex-1 border-t border-border-light dark:border-border-dark" />
                <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">or</span>
                <div className="flex-1 border-t border-border-light dark:border-border-dark" />
              </div>
              <button
                type="button"
                onClick={handleNewChain}
                className="text-sm text-slate-500 underline hover:text-slate-700 dark:hover:text-slate-300"
              >
                + Blank chain
              </button>
            </div>
          </div>
        ) : (
          <div className="px-8 py-6">
            <div className="space-y-2">
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
                          <span className="text-xs italic text-slate-400 dark:text-slate-500">
                            No steps
                          </span>
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

            <div className="flex items-center gap-3 mt-6 mb-4">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 shrink-0">
                Suggested chains
              </span>
              <div className="flex-1 border-t border-border-light dark:border-border-dark" />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CHAIN_TEMPLATES.map((template) => (
                <TemplateCard key={template.id} template={template} onUse={handleUseTemplate} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
