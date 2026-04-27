import { useCallback, useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { callTool } from "../../bridge";
import { CopyButton, PanelHeader } from "../../components/tool";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import type { IpInspectInput } from "../../bindings/IpInspectInput";
import type { IpInspectOutput } from "../../bindings/IpInspectOutput";

const TOOL_ID = "ip-inspector";
const RUST_COMMAND = "tool_ip_inspect";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;

function versionBadgeClass(version: string): string {
  const base =
    "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ";
  if (version === "IPv4") {
    return `${base} bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/40`;
  }
  if (version === "IPv6") {
    return `${base} bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/40`;
  }
  return base;
}

function typeBadgeClass(ipType: string): string {
  const base =
    "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ring-1 ";
  switch (ipType) {
    case "Public":
    case "Global unicast":
      return `${base} bg-emerald-500/15 text-emerald-300 ring-emerald-500/35`;
    case "Private":
    case "Unique local":
      return `${base} bg-amber-500/15 text-amber-200 ring-amber-500/35`;
    case "Loopback":
    case "Unspecified":
    case "Documentation":
    case "Reserved":
    case "Unknown":
      return `${base} bg-slate-500/20 text-slate-300 ring-slate-500/40`;
    case "Link-local":
    case "Shared / CGNAT":
      return `${base} bg-orange-500/15 text-orange-200 ring-orange-500/35`;
    case "Multicast":
      return `${base} bg-fuchsia-500/15 text-fuchsia-200 ring-fuchsia-500/35`;
    case "Broadcast":
      return `${base} bg-red-500/15 text-red-300 ring-red-500/40`;
    case "Teredo":
    case "6to4":
      return `${base} bg-indigo-500/15 text-indigo-200 ring-indigo-500/35`;
    case "IPv4-mapped":
      return `${base} bg-violet-500/15 text-violet-200 ring-violet-500/35`;
    default:
      return `${base} bg-slate-500/20 text-slate-300 ring-slate-500/40`;
  }
}

function DetailRow({
  label,
  value,
  copyable,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[6rem_1fr_2.25rem] items-baseline gap-x-3 border-b border-border-light py-3 last:border-b-0 dark:border-border-dark">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="min-w-0 break-all font-mono text-sm text-slate-200">{value}</div>
      <div className="flex justify-end">
        {copyable && <CopyButton value={value} variant="icon" aria-label={`Copy ${label}`} />}
      </div>
    </div>
  );
}

function IpInspectorTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [address, setAddress] = useState("");
  useRestoreStringDraft(TOOL_ID, setAddress);
  const [output, setOutput] = useState<IpInspectOutput | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runInspect = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        setOutput(null);
        setParseError(null);
        return;
      }
      const payload: IpInspectInput = { address: trimmed };
      const result = (await callTool(RUST_COMMAND, payload, {
        skipHistory: true,
      })) as IpInspectOutput;
      if (result.error) {
        setParseError(result.error);
        return;
      }
      setParseError(null);
      setOutput(result);
      if (result.version.length > 0) {
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

  const debouncedInspect = useDebouncedCallback(runInspect, DEBOUNCE_MS);

  useEffect(() => {
    debouncedInspect(address);
  }, [address, debouncedInspect]);

  useEffect(() => {
    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, []);

  const showResults = Boolean(output && !parseError && output.version);

  return (
    <div className="flex h-full flex-col bg-background-light font-display text-slate-100 dark:bg-background-dark">
      <PanelHeader label="IP Address Inspector" meta="IPv4 / IPv6 — offline classification" />
      <div className="border-b border-border-light p-4 dark:border-border-dark">
        <input
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            setDraft(e.target.value);
          }}
          placeholder="e.g. 192.168.1.1 or fe80::1"
          className="w-full rounded-lg border border-border-light bg-panel-light px-3 py-2 font-mono text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-dark dark:bg-panel-dark"
          spellCheck={false}
        />
        {parseError ? <p className="mt-2 text-sm text-red-400">{parseError}</p> : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
        {!address.trim() && (
          <div className="flex h-full min-h-[12rem] items-center justify-center px-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Enter an IPv4 or IPv6 address
          </div>
        )}

        {showResults && output && (
          <div className="border-t border-border-light px-4 py-4 dark:border-border-dark">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className={versionBadgeClass(output.version)}>{output.version}</span>
              <span className={typeBadgeClass(output.ipType)}>{output.ipType}</span>
            </div>
            <p className="mb-4 text-sm leading-relaxed text-slate-300 dark:text-slate-400">
              {output.description}
            </p>

            <div className="rounded-lg border border-border-light bg-panel-light dark:border-border-dark dark:bg-panel-dark">
              <div className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Details
              </div>
              <div className="px-3 pb-1">
                {output.version === "IPv4" && (
                  <>
                    <DetailRow label="Range" value={output.range ?? ""} copyable />
                    <DetailRow label="RFC" value={output.rfc ?? ""} />
                    <DetailRow label="Binary" value={output.binary ?? ""} copyable />
                    <DetailRow label="Hex" value={output.hex ?? ""} copyable />
                    <DetailRow
                      label="Decimal"
                      value={output.decimal != null ? String(output.decimal) : ""}
                      copyable
                    />
                  </>
                )}
                {output.version === "IPv6" && (
                  <>
                    <DetailRow label="Range" value={output.range ?? ""} copyable />
                    <DetailRow label="RFC" value={output.rfc ?? ""} />
                    <DetailRow label="Expanded" value={output.expanded ?? ""} copyable />
                    <DetailRow label="Compressed" value={output.compressed ?? ""} copyable />
                    {output.ipv4Mapped ? (
                      <DetailRow label="IPv4-mapped" value={output.ipv4Mapped} copyable />
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default IpInspectorTool;
