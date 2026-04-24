import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CopyButton } from "../tool";
import { getToolById } from "../../registry";
import type { Tool } from "../../registry";
import type { ChainStep } from "../../store";
import { useChainStore } from "../../store";
import { useChainExecution, type StepResult } from "../../hooks/useChainExecution";
import { StepPickerModal } from "../ui/StepPickerModal";

type UpdateStepFn = (
  chainId: string,
  stepId: string,
  updates: Partial<Pick<ChainStep, "outputField" | "config">>
) => void;

function outputPreview(piped: string | undefined): string {
  if (!piped) return "";
  const oneLine = piped.replace(/\s+/g, " ").trim();
  return oneLine.length > 72 ? `${oneLine.slice(0, 72)}…` : oneLine;
}

function ChainStepCard({
  chainId,
  chainStep,
  index,
  isFirst,
  isLast,
  tool,
  stepResult,
  moveStepUp,
  moveStepDown,
  removeStep,
  updateStep,
  chain,
}: {
  chainId: string;
  chainStep: ChainStep;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  tool: Tool | undefined;
  stepResult: StepResult | undefined;
  moveStepUp: (c: string, s: string) => void;
  moveStepDown: (c: string, s: string) => void;
  removeStep: (c: string, s: string) => void;
  updateStep: UpdateStepFn;
  chain: { id: string };
}) {
  const [expanded, setExpanded] = useState(true);
  const defaultedOutputField = useRef(false);

  useEffect(() => {
    if (!tool?.chainOutputFields?.length || defaultedOutputField.current) return;
    if (chainStep.outputField != null) {
      defaultedOutputField.current = true;
      return;
    }
    defaultedOutputField.current = true;
    updateStep(chainId, chainStep.id, {
      outputField: tool.chainOutputFields[0].key,
    });
  }, [tool, chainStep.id, chainStep.outputField, chainId, updateStep]);

  const status = stepResult?.status ?? "idle";
  const piped = stepResult?.pipedValue;

  const renderOutputArea = () => {
    if (status === "idle") {
      return (
        <p className="text-xs text-slate-400 dark:text-slate-500 px-4 py-3">
          Run the chain by typing in the input above.
        </p>
      );
    }
    if (status === "waiting") {
      return (
        <p className="text-xs text-slate-400 dark:text-slate-500 px-4 py-3">Waiting for previous step…</p>
      );
    }
    if (status === "running") {
      return (
        <div className="px-4 py-4 flex items-center gap-3">
          <div
            className="size-5 shrink-0 rounded-full border-2 border-slate-200 border-t-primary animate-spin dark:border-slate-700"
            aria-hidden
          />
          <span className="text-xs text-slate-500 dark:text-slate-400">Running…</span>
        </div>
      );
    }
    if (status === "error") {
      return (
        <div className="mx-4 my-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {stepResult?.error ?? "Error"}
        </div>
      );
    }
    return (
      <div className="px-4 py-3 space-y-3">
        {tool?.id === "jwt" && stepResult?.rawOutput && typeof stepResult.rawOutput === "object" ? (
          <div className="space-y-2 text-xs">
            {(
              [
                ["headerRaw", "Header"],
                ["payloadRaw", "Payload"],
                ["signatureRaw", "Signature"],
              ] as const
            ).map(([key, label]) => {
              const v = (stepResult.rawOutput as Record<string, string>)[key];
              if (!v) return null;
              return (
                <div key={key}>
                  <p className="font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</p>
                  <pre className="max-h-32 overflow-y-auto rounded border border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 p-2 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                    {v}
                  </pre>
                </div>
              );
            })}
          </div>
        ) : null}
        {piped ? (
          <pre className="max-h-48 overflow-y-auto rounded border border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 p-3 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-all">
            {piped}
          </pre>
        ) : tool?.id !== "jwt" ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">No output string for this step.</p>
        ) : null}
        {tool?.chainOutputFields && tool.chainOutputFields.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Pipe
            </span>
            <select
              className="text-xs rounded-md border border-border-light bg-white px-2 py-1 dark:border-border-dark dark:bg-panel-dark"
              value={chainStep.outputField ?? tool.chainOutputFields[0].key}
              onChange={(e) =>
                updateStep(chainId, chainStep.id, { outputField: e.target.value })
              }
            >
              {tool.chainOutputFields.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="flex justify-end">
          <CopyButton value={piped ?? ""} label="Copy" variant="outline" />
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-border-light bg-panel-light dark:border-border-dark dark:bg-panel-dark overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-border-dark">
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
        {!expanded && status === "success" && piped ? (
          <span className="flex-1 min-w-0 truncate text-xs font-mono text-slate-500 dark:text-slate-400 mr-2">
            {outputPreview(piped)}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 shrink-0"
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse step" : "Expand step"}
        >
          <span className="material-symbols-outlined text-[18px]">{expanded ? "expand_less" : "expand_more"}</span>
        </button>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => moveStepUp(chain.id, chainStep.id)}
            aria-label="Move step up"
            className={`flex size-8 items-center justify-center rounded-md text-slate-500 transition-colors dark:text-slate-400 ${
              isFirst ? "opacity-50" : "hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
          </button>
          <button
            type="button"
            disabled={isLast}
            onClick={() => moveStepDown(chain.id, chainStep.id)}
            aria-label="Move step down"
            className={`flex size-8 items-center justify-center rounded-md text-slate-500 transition-colors dark:text-slate-400 ${
              isLast ? "opacity-50" : "hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
          </button>
          <button
            type="button"
            onClick={() => removeStep(chain.id, chainStep.id)}
            aria-label="Remove step"
            className="flex size-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-red-400"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>

      {tool?.chainConfig && tool.chainConfig.length > 0 ? (
        <div className="flex flex-wrap items-end gap-3 px-4 py-3 border-b border-slate-100 dark:border-border-dark">
          {tool.chainConfig.map((field) => (
            <label key={field.key} className="flex flex-col gap-0.5 min-w-[6rem]">
              <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {field.label}
              </span>
              {field.type === "select" ? (
                <select
                  className="text-xs rounded-md border border-border-light bg-white px-2 py-1 dark:border-border-dark dark:bg-panel-dark max-w-[14rem]"
                  value={String(chainStep.config[field.key] ?? field.default)}
                  onChange={(e) =>
                    updateStep(chainId, chainStep.id, {
                      config: { ...chainStep.config, [field.key]: e.target.value },
                    })
                  }
                >
                  {field.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="text-xs rounded-md border border-border-light bg-white px-2 py-1 dark:border-border-dark dark:bg-panel-dark w-40 max-w-full font-mono"
                  placeholder={field.placeholder}
                  value={String(chainStep.config[field.key] ?? field.default)}
                  onChange={(e) =>
                    updateStep(chainId, chainStep.id, {
                      config: { ...chainStep.config, [field.key]: e.target.value },
                    })
                  }
                />
              )}
            </label>
          ))}
        </div>
      ) : null}

      {expanded ? renderOutputArea() : null}
    </div>
  );
}

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
  const updateStep = useChainStore((s) => s.updateStep);
  const chainInput = useChainStore((s) => (chainId ? s.chainInputs[chainId] ?? "" : ""));
  const setChainInput = useChainStore((s) => s.setChainInput);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const stepResults = useChainExecution(chain);

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
        <Link to="/chains" className="text-sm font-medium text-primary hover:underline">
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
          <>
            <div className="max-w-2xl mx-auto mb-6">
              <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1.5">
                Input
              </label>
              <textarea
                value={chainInput}
                onChange={(e) => setChainInput(chainId, e.target.value)}
                placeholder="Paste or type the value to process through the chain…"
                rows={5}
                className="w-full min-h-[100px] max-w-2xl mx-auto rounded-lg border border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark px-3 py-2 font-mono text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
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
                    <ChainStepCard
                      chainId={chainId}
                      chainStep={step}
                      index={index}
                      isFirst={isFirst}
                      isLast={isLast}
                      tool={tool}
                      stepResult={stepResults[step.id]}
                      moveStepUp={moveStepUp}
                      moveStepDown={moveStepDown}
                      removeStep={removeStep}
                      updateStep={updateStep}
                      chain={chain}
                    />
                  </div>
                );
              })}
            </div>
          </>
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
