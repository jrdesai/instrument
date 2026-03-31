import { useCallback, useEffect, useRef, useState } from "react";
import { callTool } from "../../bridge";
import { CopyButton, PanelHeader, ToolbarFooter } from "../../components/tool";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import type { CertDecodeInput } from "../../bindings/CertDecodeInput";
import type { CertDecodeOutput } from "../../bindings/CertDecodeOutput";
import type { DnField } from "../../bindings/DnField";

const TOOL_ID = "cert-decoder";
const RUST_COMMAND = "cert_decode";
const DEBOUNCE_MS = 150;
const HISTORY_DEBOUNCE_MS = 1500;

function DnTable({ fields, label }: { fields: DnField[]; label: string }) {
  if (fields.length === 0) return null;
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="space-y-0.5 rounded border border-border-light bg-background-light/40 dark:border-border-dark dark:bg-background-dark/40">
        {fields.map((f, i) => (
          <div
            key={i}
            className="grid grid-cols-[56px,1fr] items-center gap-2 px-2 py-1 text-xs"
          >
            <span className="font-mono text-[10px] text-slate-500">{f.label}</span>
            <span className="break-all font-mono text-slate-200">{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CertDecoderTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [pem, setPem] = useState("");
  const [output, setOutput] = useState<CertDecodeOutput | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);
  useRestoreStringDraft(TOOL_ID, setPem);

  const run = useCallback(
    async (currentPem: string) => {
      if (!currentPem.trim()) {
        setOutput(null);
        return;
      }
      const payload: CertDecodeInput = { pem: currentPem };
      const result = (await callTool(RUST_COMMAND, payload, {
        skipHistory: true,
      })) as CertDecodeOutput;
      setOutput(result);
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
      historyDebounceRef.current = setTimeout(() => {
        addHistoryEntry(TOOL_ID, {
          input: payload,
          output: result,
          timestamp: Date.now(),
        });
        historyDebounceRef.current = null;
      }, HISTORY_DEBOUNCE_MS);
    },
    [addHistoryEntry]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      run(pem);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [pem, run]);

  return (
    <div className="flex h-full flex-col bg-background-light font-display text-slate-100 dark:bg-background-dark">
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col border-r border-border-light dark:border-border-dark">
          <PanelHeader label="Input (PEM or DER base64)" />
          <textarea
            value={pem}
            onChange={(e) => {
              setPem(e.target.value);
              setDraft(e.target.value);
            }}
            placeholder="Paste PEM certificate, PEM chain, or base64-encoded DER..."
            className="min-h-0 flex-1 resize-none bg-transparent p-4 font-mono text-xs text-slate-300 focus:outline-none"
          />
        </div>
        <div className="min-h-0 min-w-0 flex-1 overflow-auto custom-scrollbar p-4">
          {!output && <p className="text-sm text-slate-500">Paste a certificate to decode.</p>}
          {output?.error && <p className="mb-3 text-sm text-red-400">{output.error}</p>}
          {output?.certificates.map((cert, i) => (
            <div
              key={i}
              className="mb-3 overflow-hidden rounded-lg border border-border-light bg-panel-light dark:border-border-dark dark:bg-panel-dark"
            >
              <div className="flex items-center justify-between border-b border-border-light px-4 py-2 dark:border-border-dark">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-300">
                    {cert.isCa ? "CA Certificate" : `Certificate ${i + 1}`}
                  </span>
                  {cert.isExpired && (
                    <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] text-red-300">
                      Expired
                    </span>
                  )}
                  {cert.expiryWarning && !cert.isExpired && (
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300">
                      Expires in {cert.daysUntilExpiry}d
                    </span>
                  )}
                  {!cert.isExpired && !cert.expiryWarning && (
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">
                      Valid
                    </span>
                  )}
                  {cert.isCa && (
                    <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-300">
                      CA
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3 p-4">
                <DnTable fields={cert.subjectFields} label="Subject" />
                <DnTable fields={cert.issuerFields} label="Issuer" />

                <div className="flex flex-wrap gap-2">
                  <CopyButton
                    value={cert.subject}
                    label="Copy Subject"
                    variant="outline"
                    className="px-2 py-1 text-[10px]"
                  />
                  <CopyButton
                    value={cert.issuer}
                    label="Copy Issuer"
                    variant="outline"
                    className="px-2 py-1 text-[10px]"
                  />
                  <CopyButton
                    value={cert.serialNumber}
                    label="Copy Serial"
                    variant="outline"
                    className="px-2 py-1 text-[10px]"
                  />
                  {cert.sans.length > 0 && (
                    <CopyButton
                      value={cert.sans.join("\n")}
                      label="Copy SANs"
                      variant="outline"
                      className="px-2 py-1 text-[10px]"
                    />
                  )}
                  <CopyButton
                    value={cert.fingerprintSha256}
                    label="Copy SHA-256"
                    variant="outline"
                    className="px-2 py-1 text-[10px]"
                  />
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex gap-2">
                    <span className="w-28 text-slate-500">Not Before</span>
                    <span className="font-mono text-slate-300">{cert.notBefore}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-28 text-slate-500">Not After</span>
                    <span className="font-mono text-slate-300">{cert.notAfter}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-28 text-slate-500">Serial</span>
                    <span className="font-mono text-slate-300">{cert.serialNumber}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-28 text-slate-500">Version</span>
                    <span className="font-mono text-slate-300">v{cert.version}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-28 text-slate-500">Signature Alg</span>
                    <span className="font-mono text-slate-300">
                      {cert.signatureAlgorithm}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-28 text-slate-500">Public Key</span>
                    <span className="font-mono text-slate-300">
                      {cert.publicKeyAlgorithm}
                      {cert.publicKeySize ? ` (${cert.publicKeySize} bit)` : ""}
                    </span>
                  </div>
                </div>

                {cert.sans.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {cert.sans.map((san, idx) => (
                      <span
                        key={idx}
                        className="rounded bg-slate-500/20 px-2 py-0.5 font-mono text-[10px] text-slate-300"
                      >
                        {san}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-1">
                  {cert.keyUsages.map((u, idx) => (
                    <span
                      key={idx}
                      className="rounded bg-slate-700 px-2 py-0.5 text-[10px] text-slate-300"
                    >
                      {u}
                    </span>
                  ))}
                  {cert.extendedKeyUsages.map((u, idx) => (
                    <span
                      key={`e${idx}`}
                      className="rounded bg-slate-700 px-2 py-0.5 text-[10px] text-slate-400"
                    >
                      {u}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <ToolbarFooter
        className="justify-end"
        groups={[
          {
            children: (
              <button
                type="button"
                onClick={() => {
                  setPem("");
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

export default CertDecoderTool;
