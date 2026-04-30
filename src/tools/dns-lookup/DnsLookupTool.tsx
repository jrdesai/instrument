import { useCallback, useState } from "react";
import { callTool } from "../../bridge";
import { CopyButton, PanelHeader, PillButton } from "../../components/tool";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import type { DnsLookupInput } from "../../bindings/DnsLookupInput";
import type { DnsLookupOutput } from "../../bindings/DnsLookupOutput";

const TOOL_ID = "dns-lookup";
const RUST_COMMAND = "tool_dns_lookup";
const RECORD_TYPES = ["A", "AAAA", "MX", "TXT", "CNAME", "NS"] as const;
type RecordType = (typeof RECORD_TYPES)[number];

function DnsLookupTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [domain, setDomain] = useState("");
  useRestoreStringDraft(TOOL_ID, setDomain);
  const [recordType, setRecordType] = useState<RecordType>("A");
  const [output, setOutput] = useState<DnsLookupOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const runLookup = useCallback(
    async (d: string, rt: RecordType) => {
      const trimmed = d.trim();
      if (!trimmed) return;
      setIsLoading(true);
      setOutput(null);
      try {
        const payload: DnsLookupInput = { domain: trimmed, recordType: rt };
        const result = (await callTool(RUST_COMMAND, payload, {
          skipHistory: true,
        })) as DnsLookupOutput;
        setOutput(result);
        if (!result.error && result.records.length > 0) {
          addHistoryEntry(TOOL_ID, {
            input: payload,
            output: result,
            timestamp: Date.now(),
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [addHistoryEntry]
  );

  const handleRecordTypeChange = useCallback(
    (rt: RecordType) => {
      setRecordType(rt);
      if (domain.trim()) {
        void runLookup(domain, rt);
      }
    },
    [domain, runLookup]
  );

  const handleClear = useCallback(() => {
    setDomain("");
    setDraft("");
    setOutput(null);
    setIsLoading(false);
    setRecordType("A");
  }, [setDraft]);

  return (
    <div className="flex h-full flex-col bg-background-light font-display text-slate-100 dark:bg-background-dark">
      <PanelHeader
        label="DNS Lookup"
        meta={
          output && !output.error
            ? `${output.recordType} · ${output.records.length} records`
            : "System resolver"
        }
      />

      <div className="border-b border-border-light px-4 py-3 dark:border-border-dark">
        <div className="flex flex-col gap-3">
          <input
            value={domain}
            onChange={(e) => {
              setDomain(e.target.value);
              setDraft(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void runLookup(domain, recordType);
              }
            }}
            placeholder="example.com"
            spellCheck={false}
            className="w-full rounded-lg border border-border-light bg-panel-light px-3 py-2 font-mono text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-dark dark:bg-panel-dark"
          />
          <div className="flex flex-wrap items-center gap-1">
            {RECORD_TYPES.map((rt) => (
              <PillButton
                key={rt}
                active={recordType === rt}
                onClick={() => handleRecordTypeChange(rt)}
                size="sm"
                shape="full"
              >
                {rt}
              </PillButton>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="ml-auto rounded-lg border border-border-light bg-panel-light px-3 py-1 text-xs text-slate-500 transition-colors hover:text-slate-200 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
        {isLoading && (
          <div className="flex items-center justify-center py-16 text-sm text-slate-500">
            <span className="animate-pulse">Resolving…</span>
          </div>
        )}

        {!isLoading && output?.error && (
          <p className="px-4 py-3 font-mono text-sm text-red-400">{output.error}</p>
        )}

        {!isLoading && output && !output.error && output.records.length === 0 && (
          <p className="px-4 py-3 text-sm text-slate-500">
            No {output.recordType} records found.
          </p>
        )}

        {!isLoading && output && !output.error && output.records.length > 0 && (
          <div className="divide-y divide-border-light dark:divide-border-dark">
            {output.records.map((record, i) => (
              <div key={`${record.value}-${i}`} className="flex items-baseline gap-4 px-4 py-3">
                {record.priority != null && (
                  <span className="w-8 shrink-0 text-right font-mono text-xs text-slate-500">
                    {record.priority}
                  </span>
                )}
                <span className="min-w-0 flex-1 break-all font-mono text-sm text-slate-200">
                  {record.value}
                </span>
                <span className="shrink-0 font-mono text-xs text-slate-600">{record.ttl}s</span>
                <CopyButton value={record.value} variant="icon" aria-label="Copy value" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && !output && (
          <div className="flex h-full min-h-[12rem] items-center justify-center px-4 text-sm text-slate-500">
            Enter a domain and press Enter
          </div>
        )}
      </div>
    </div>
  );
}

export default DnsLookupTool;

