import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { callTool } from "../../bridge";
import { CopyButton, PanelHeader, ToolbarFooter } from "../../components/tool";
import { useFileDrop } from "../../hooks/useFileDrop";
import type { CertDecodeInput } from "../../bindings/CertDecodeInput";
import type { CertDecodeOutput } from "../../bindings/CertDecodeOutput";
import type { DnField } from "../../bindings/DnField";

const RUST_COMMAND = "cert_decode";
const DEBOUNCE_MS = 150;

function DnTable({ fields, label }: { fields: DnField[]; label: string }) {
  if (fields.length === 0) return null;
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="space-y-0.5 rounded border border-border-light bg-background-light/40 dark:border-border-dark dark:bg-background-dark/40">
        {fields.map((f) => (
          <div
            key={f.label}
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
  const [pem, setPem] = useState("");
  const [fileDropError, setFileDropError] = useState<string | null>(null);
  const [output, setOutput] = useState<CertDecodeOutput | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(async (currentPem: string) => {
    if (!currentPem.trim()) {
      setOutput(null);
      return;
    }
    const payload: CertDecodeInput = { pem: currentPem };
    const result = (await callTool(RUST_COMMAND, payload, {
      skipHistory: true,
    })) as CertDecodeOutput;
    setOutput(result);
  }, []);

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

  const { isDragging, dropZoneProps } = useFileDrop({
    onFile: (text) => {
      setFileDropError(null);
      setPem(text);
    },
    onError: (msg) => setFileDropError(msg),
  });

  const handleFileUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileDropError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === "string") {
        setPem(text);
      }
    };
    reader.onerror = () => {
      setFileDropError("Failed to read file — it may be locked or unreadable.");
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  return (
    <div className="flex h-full flex-col bg-background-light font-display text-slate-100 dark:bg-background-dark">
      <div className="flex min-h-0 flex-1">
        <div
          className="relative flex min-w-0 flex-1 flex-col border-r border-border-light dark:border-border-dark"
          {...dropZoneProps}
        >
          {isDragging && (
            <div
              className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/50 bg-primary/5"
              aria-hidden
            >
              <span className="material-symbols-outlined text-[32px] text-primary/60">
                upload_file
              </span>
              <span className="text-sm font-medium text-primary/70">Drop file to load</span>
            </div>
          )}
          {fileDropError ? (
            <p className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-1.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {fileDropError}
            </p>
          ) : null}
          <PanelHeader label="Input (PEM or DER base64)">
            <label className="cursor-pointer rounded-lg border border-border-light bg-panel-light px-2.5 py-1 text-xs text-slate-500 transition-colors hover:text-slate-700 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400 dark:hover:text-slate-200">
              Upload file
              <input
                type="file"
                className="sr-only"
                accept=".pem,.crt,.cer,.txt,text/plain,application/x-pem-file,application/pkix-cert"
                onChange={handleFileUpload}
              />
            </label>
          </PanelHeader>
          <textarea
            value={pem}
            onChange={(e) => {
              setFileDropError(null);
              setPem(e.target.value);
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
              key={cert.serialNumber}
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
                    {cert.sans.map((san) => (
                      <span
                        key={san}
                        className="rounded bg-slate-500/20 px-2 py-0.5 font-mono text-[10px] text-slate-300"
                      >
                        {san}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-1">
                  {cert.keyUsages.map((u) => (
                    <span
                      key={u}
                      className="rounded bg-slate-700 px-2 py-0.5 text-[10px] text-slate-300"
                    >
                      {u}
                    </span>
                  ))}
                  {cert.extendedKeyUsages.map((u) => (
                    <span
                      key={`eku-${u}`}
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
                  setFileDropError(null);
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
