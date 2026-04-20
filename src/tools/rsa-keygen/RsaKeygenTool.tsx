import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { CopyButton, PillButton } from "../../components/tool";
import { callTool } from "../../bridge";
import { extractErrorMessage } from "../../lib/extractErrorMessage";
import type { RsaKeygenInput } from "../../bindings/RsaKeygenInput";
import type { RsaKeygenOutput } from "../../bindings/RsaKeygenOutput";
import type { RsaKeySize } from "../../bindings/RsaKeySize";
import type { RsaKeyFormat } from "../../bindings/RsaKeyFormat";

const RUST_COMMAND = "tool_rsa_keygen_process";

function RsaKeygenTool() {
  const [keySize, setKeySize] = useState<RsaKeySize>("rsa2048");
  const [format, setFormat] = useState<RsaKeyFormat>("pkcs8");
  const [publicKey, setPublicKey] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [algorithm, setAlgorithm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setPublicKey("");
    setPrivateKey("");
    setAlgorithm("");
    // Yield to the browser so React can flush the loading state to the DOM
    // before the WASM call blocks the main thread.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    try {
      const payload: RsaKeygenInput = { keySize, format };
      const result = (await callTool(RUST_COMMAND, payload, {
        skipHistory: true,
      })) as RsaKeygenOutput;
      if (result.error) {
        setError(result.error);
      } else {
        setPublicKey(result.publicKey);
        setPrivateKey(result.privateKey);
        setAlgorithm(result.algorithm);
      }
    } catch (e) {
      setError(extractErrorMessage(e, "Key generation failed"));
    } finally {
      setIsLoading(false);
    }
  }, [keySize, format]);

  const handleClear = useCallback(() => {
    setPublicKey("");
    setPrivateKey("");
    setAlgorithm("");
    setError(null);
  }, []);

  const hasKeys = publicKey.length > 0 && privateKey.length > 0;

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      {/* Options + actions */}
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3 px-4 py-3 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
        {/* Key size */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
            Size
          </div>
          <div className="flex gap-1" role="group" aria-label="Key size">
            {(["rsa2048", "rsa3072", "rsa4096"] as RsaKeySize[]).map((size) => (
              <PillButton
                key={size}
                active={keySize === size}
                onClick={() => setKeySize(size)}
                aria-label={`${size.replace("rsa", "")} bits`}
              >
                {size.replace("rsa", "")}
              </PillButton>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px self-stretch bg-border-light dark:bg-border-dark" />

        {/* Format */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
            Format
          </div>
          <div className="flex gap-1" role="group" aria-label="Key format">
            <PillButton
              active={format === "pkcs8"}
              onClick={() => setFormat("pkcs8")}
              aria-label="PKCS#8 format"
            >
              PKCS#8
            </PillButton>
            <PillButton
              active={format === "pkcs1"}
              onClick={() => setFormat("pkcs1")}
              aria-label="PKCS#1 format"
            >
              PKCS#1
            </PillButton>
          </div>
        </div>

        {/* Actions */}
        <div className="ml-auto flex items-end gap-2">
          <button
            type="button"
            onClick={handleClear}
            disabled={!hasKeys && !error}
            aria-label="Clear generated keys"
            className="rounded-lg px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading}
            aria-label="Generate RSA key pair"
            className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Generating…" : "Generate"}
          </button>
        </div>
      </div>

      {/* Output area */}
      {error && (
        <div className="mx-4 mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {!hasKeys && !error && !isLoading && (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center text-sm text-slate-400">
            <p>
              Select key size and format, then click <strong>Generate</strong>.
            </p>
            <p className="mt-1">Keys are generated locally — nothing leaves your device.</p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Generating {keySize.replace("rsa", "")}-bit RSA key pair…
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              This may take a few seconds
            </p>
          </div>
        </div>
      )}

      {hasKeys && !isLoading && (
        <div className="flex flex-1 min-h-0 flex-col md:flex-row gap-0">
          {/* Public Key */}
          <div className="flex flex-col flex-1 min-h-0 border-b md:border-b-0 md:border-r border-border-light dark:border-border-dark">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Public Key
                </span>
                {algorithm && (
                  <span className="rounded bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {algorithm}
                  </span>
                )}
              </div>
              <CopyButton value={publicKey} label="Copy" aria-label="Copy public key" />
            </div>
            <textarea
              readOnly
              aria-label="RSA public key PEM"
              value={publicKey}
              className="flex-1 w-full p-4 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-mono text-xs resize-none outline-none focus:ring-0 border-0"
              spellCheck={false}
            />
          </div>

          {/* Private Key */}
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Private Key
                </span>
                <span className="rounded bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 text-xs text-amber-700 dark:text-amber-400">
                  Keep secret
                </span>
              </div>
              <CopyButton value={privateKey} label="Copy" aria-label="Copy private key" />
            </div>
            <textarea
              readOnly
              aria-label="RSA private key PEM"
              value={privateKey}
              className="flex-1 w-full p-4 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-mono text-xs resize-none outline-none focus:ring-0 border-0"
              spellCheck={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default RsaKeygenTool;
