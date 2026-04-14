import { useCallback, useEffect, useRef, useState } from "react";
import { callTool } from "../../bridge";
import { CopyButton, PanelHeader, ToolbarFooter } from "../../components/tool";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import type { CidrInput } from "../../bindings/CidrInput";
import type { CidrOutput } from "../../bindings/CidrOutput";

const TOOL_ID = "cidr-calculator";
const RUST_COMMAND = "cidr_calculate";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;

function CidrCalculatorTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [cidr, setCidr] = useState("");
  useRestoreStringDraft(TOOL_ID, setCidr);
  const [output, setOutput] = useState<CidrOutput | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const run = useCallback(
    async (value: string) => {
      if (!value.trim()) {
        setOutput(null);
        return;
      }
      const payload: CidrInput = { cidr: value.trim() };
      const result = (await callTool(RUST_COMMAND, payload, {
        skipHistory: true,
      })) as CidrOutput;
      setOutput(result);
      if (!result.error) {
        if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
        historyDebounceRef.current = setTimeout(() => {
          addHistoryEntry(TOOL_ID, {
            input: payload,
            output: result,
            timestamp: Date.now(),
          });
          historyDebounceRef.current = null;
        }, HISTORY_DEBOUNCE_MS);
      }
    },
    [addHistoryEntry]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      run(cidr);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [cidr, run]);

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

  const scopeLabel = (scope: string) => {
    if (scope === "ula") return "ULA (Private)";
    if (scope === "link-local") return "Link-Local";
    if (scope === "global-unicast") return "Global Unicast";
    return scope;
  };

  return (
    <div className="flex h-full flex-col bg-background-light font-display text-slate-100 dark:bg-background-dark">
      <PanelHeader label="CIDR Calculator" meta="IPv4/IPv6 subnet details" />
      <div className="border-b border-border-light p-4 dark:border-border-dark">
        <input
          value={cidr}
          onChange={(e) => {
            setCidr(e.target.value);
            setDraft(e.target.value);
          }}
          placeholder="e.g. 192.168.1.0/24"
          className="w-full rounded-lg border border-border-light bg-panel-light px-3 py-2 font-mono text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-dark dark:bg-panel-dark"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
        {!cidr.trim() && (
          <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
            Enter a CIDR to calculate subnet details.
          </div>
        )}
        {output?.error && <div className="p-6 text-sm text-red-400">{output.error}</div>}
        {output && !output.error && (
          <div className="border-t border-border-light px-4 py-4 dark:border-border-dark">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[
                { label: "Network Address", value: output.networkAddress },
                { label: "Broadcast Address", value: output.broadcastAddress ?? "" },
                { label: "Subnet Mask", value: output.subnetMask },
                { label: "Wildcard Mask", value: output.wildcardMask },
                { label: "First Host", value: output.firstHost ?? "" },
                { label: "Last Host", value: output.lastHost ?? "" },
                { label: "Total Hosts", value: String(output.totalHosts) },
                { label: "Usable Hosts", value: String(output.usableHosts) },
                { label: "Prefix Length", value: `/${output.prefixLength}` },
                { label: "IP Version", value: `IPv${output.ipVersion}` },
                { label: "IP Class", value: output.ipClass ?? "" },
                { label: "Binary Mask", value: output.binaryMask },
                { label: "Host Bits", value: String(output.hostBits) },
                { label: "Wildcard Bits", value: String(output.wildcardBits) },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="relative rounded-lg border border-border-light bg-panel-light p-2 text-xs dark:border-border-dark dark:bg-panel-dark"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {label}
                    </span>
                    <CopyButton
                      value={value || undefined}
                      variant="icon"
                      aria-label={`Copy ${label.toLowerCase()}`}
                    />
                  </div>
                  <div className="mt-0.5 break-all font-mono text-sm leading-snug text-slate-200">
                    {value || "—"}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <div className="flex gap-2 text-xs">
                {output.isPrivate && <span className="rounded bg-blue-500/20 px-2 py-1 text-blue-300">Private</span>}
                {output.isLoopback && <span className="rounded bg-slate-500/20 px-2 py-1 text-slate-300">Loopback</span>}
                {output.ipv6Scope && (
                  <span
                    className={`rounded px-2 py-1 text-xs ${
                      output.ipv6Scope === "global-unicast"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : output.ipv6Scope === "ula"
                          ? "bg-blue-500/20 text-blue-300"
                          : output.ipv6Scope === "link-local"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-slate-500/20 text-slate-300"
                    }`}
                  >
                    {scopeLabel(output.ipv6Scope)}
                  </span>
                )}
              </div>
            </div>
            {output.specialNote && (
              <div className="mx-4 mb-3 rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
                {output.specialNote}
              </div>
            )}
            {output.subnetSplit && (
              <div className="mt-2 border-t border-border-light px-4 py-3 dark:border-border-dark">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Subnet Split Preview (/{output.subnetSplit.subPrefix} - {output.subnetSplit.count} subnets)
                </p>
                <div className="space-y-1">
                  {output.subnetSplit.examples.map((example, i) => (
                    <div
                      key={`${example}-${i}`}
                      className="flex items-center justify-between rounded bg-panel-light px-3 py-1.5 dark:bg-panel-dark"
                    >
                      <span className="font-mono text-xs text-slate-300">{example}</span>
                      <CopyButton
                        value={example}
                        variant="icon"
                        aria-label="Copy subnet CIDR"
                      />
                    </div>
                  ))}
                  {output.subnetSplit.count > 4 && (
                    <p className="text-[10px] text-slate-500">
                      + {output.subnetSplit.count - 4} more subnets...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ToolbarFooter
        className="justify-end"
        groups={[
          {
            children: (
              <button
                type="button"
                onClick={() => {
                  setCidr("");
                  setDraft("");
                  setOutput(null);
                }}
                className="rounded-lg border border-border-light bg-panel-light px-3 py-1.5 text-xs text-slate-500 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400"
              >
                Clear
              </button>
            ),
          },
        ]}
      />
    </div>
  );
}

export default CidrCalculatorTool;
