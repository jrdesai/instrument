import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { callTool } from "../../bridge";

const RUST_COMMAND = "tool_jwt_decode";
const TOKEN_DEBOUNCE_MS = 150;
const SECRET_DEBOUNCE_MS = 300;
const TRUNCATE_LEN = 20;

type SecretEncoding = "utf8" | "base64" | "hex";

interface JwtDecodeInputPayload {
  token: string;
  secret: string;
  secretEncoding: SecretEncoding;
}

interface JwtDecodeOutputPayload {
  headerRaw: string;
  payloadRaw: string;
  signatureRaw: string;
  algorithm: string;
  tokenType: string;
  keyId?: string | null;
  subject?: string | null;
  issuer?: string | null;
  audience?: string | null;
  issuedAt?: number | null;
  expiresAt?: number | null;
  notBefore?: string | null;
  jwtId?: string | null;
  issuedAtHuman?: string | null;
  expiresAtHuman?: string | null;
  isExpired?: boolean | null;
  timeUntilExpiry?: string | null;
  allClaims: string;
  signatureValid?: boolean | null;
  signatureNote: string;
  partCount: number;
  isWellFormed: boolean;
  error?: string | null;
}

function truncate(s: string, len: number): string {
  if (s.length <= len) return s;
  return s.slice(0, len) + "…";
}

function JwtDecoderTool() {
  const [token, setToken] = useState("");
  const [secret, setSecret] = useState("");
  const [secretEncoding, setSecretEncoding] = useState<SecretEncoding>("utf8");
  const [showSecret, setShowSecret] = useState(false);
  const [output, setOutput] = useState<JwtDecodeOutputPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [headerOpen, setHeaderOpen] = useState(true);
  const [payloadOpen, setPayloadOpen] = useState(true);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [signatureHexExpanded, setSignatureHexExpanded] = useState(false);
  const tokenDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const secretDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const pending = sessionStorage.getItem("instrument:jwt:pendingDecode");
      if (pending != null && typeof pending === "string") {
        sessionStorage.removeItem("instrument:jwt:pendingDecode");
        setToken(pending);
      }
    } catch {
      // ignore
    }
  }, []);

  const runProcess = useCallback(
    async (
      currentToken: string,
      currentSecret: string,
      currentEncoding: SecretEncoding
    ) => {
      const trimmed = currentToken.trim();
      if (trimmed === "") {
        setOutput(null);
        return;
      }
      setIsLoading(true);
      try {
        const payload: JwtDecodeInputPayload = {
          token: trimmed,
          secret: currentSecret.trim(),
          secretEncoding: currentEncoding,
        };
        const result = (await callTool(
          RUST_COMMAND,
          payload
        )) as JwtDecodeOutputPayload;
        setOutput(result);
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : typeof e === "string"
              ? e
              : e && typeof e === "object" && "message" in e
                ? String((e as { message: unknown }).message)
                : "Failed to run tool";
        setOutput({
          headerRaw: "",
          payloadRaw: "",
          signatureRaw: "",
          algorithm: "",
          tokenType: "",
          allClaims: "",
          signatureNote: "",
          partCount: 0,
          isWellFormed: false,
          error: message,
        });
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (tokenDebounceRef.current) clearTimeout(tokenDebounceRef.current);
    tokenDebounceRef.current = setTimeout(() => {
      runProcess(token, secret, secretEncoding);
      tokenDebounceRef.current = null;
    }, TOKEN_DEBOUNCE_MS);
    return () => {
      if (tokenDebounceRef.current) clearTimeout(tokenDebounceRef.current);
    };
  }, [token, runProcess]);

  useEffect(() => {
    if (token.trim() === "") return;
    if (secretDebounceRef.current) clearTimeout(secretDebounceRef.current);
    secretDebounceRef.current = setTimeout(() => {
      runProcess(token, secret, secretEncoding);
      secretDebounceRef.current = null;
    }, SECRET_DEBOUNCE_MS);
    return () => {
      if (secretDebounceRef.current) clearTimeout(secretDebounceRef.current);
    };
  }, [secret, secretEncoding, token, runProcess]);

  const handleClear = useCallback(() => {
    setToken("");
    setSecret("");
    setOutput(null);
  }, []);

  const handleCopyToken = useCallback(async () => {
    if (!token.trim()) return;
    try {
      await navigator.clipboard.writeText(token.trim());
    } catch {
      // ignore
    }
  }, [token]);

  const handleCopyPayload = useCallback(async () => {
    if (!output?.allClaims) return;
    try {
      await navigator.clipboard.writeText(output.allClaims);
    } catch {
      // ignore
    }
  }, [output]);

  const trimmedToken = token.trim();
  const parts = trimmedToken ? trimmedToken.split(".") : [];
  const hasThreeParts = parts.length === 3;
  const showEmptyState = trimmedToken === "" && !output?.error;
  const showError = output?.error && trimmedToken !== "";
  const displayOutput = output && !output.error && output.isWellFormed;

  return (
    <div className="flex flex-col h-full bg-background-dark text-slate-100 font-display">
      {/* Token input */}
      <div className="flex flex-col px-4 py-3 border-b border-border-dark bg-panel-dark shrink-0">
        <textarea
          aria-label="JWT token"
          className="w-full min-h-[120px] px-3 py-2 bg-background-dark text-slate-100 font-mono text-xs border border-border-dark rounded-lg resize-y outline-none focus:ring-1 focus:ring-primary placeholder:text-slate-500"
          placeholder="Paste JWT token here..."
          rows={6}
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        {hasThreeParts && (
          <div className="mt-2 flex flex-wrap items-center gap-0.5 font-mono text-xs">
            <span className="text-blue-400">
              [{truncate(parts[0], TRUNCATE_LEN)}]
            </span>
            <span className="text-slate-600"> . </span>
            <span className="text-emerald-400">
              [{truncate(parts[1], TRUNCATE_LEN)}]
            </span>
            <span className="text-slate-600"> . </span>
            <span className="text-amber-400">
              [{truncate(parts[2], TRUNCATE_LEN)}]
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4">
        {showEmptyState && (
          <p className="text-slate-500 text-sm">
            Paste a JWT token above to decode it.
          </p>
        )}

        {showError && (
          <div className="text-red-400 text-sm font-mono whitespace-pre-wrap mb-4">
            {output?.error}
          </div>
        )}

        {displayOutput && (
          <div className="space-y-3">
            {/* Section 1 — Header */}
            <section className="border border-border-dark rounded-lg bg-panel-dark overflow-hidden">
              <button
                type="button"
                onClick={() => setHeaderOpen((o) => !o)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
              >
                <span className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Header
                </span>
                <span
                  className="material-symbols-outlined text-slate-400"
                  aria-hidden
                >
                  {headerOpen ? "expand_less" : "expand_more"}
                </span>
              </button>
              {headerOpen && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="flex flex-wrap gap-3">
                    <div className="flex flex-col border border-border-dark bg-background-dark rounded-lg p-3 min-w-[100px]">
                      <span className="text-slate-500 text-xs uppercase tracking-wider">
                        Algorithm
                      </span>
                      <span className="font-mono text-sm text-slate-200 mt-0.5">
                        {output.algorithm || "—"}
                      </span>
                    </div>
                    <div className="flex flex-col border border-border-dark bg-background-dark rounded-lg p-3 min-w-[100px]">
                      <span className="text-slate-500 text-xs uppercase tracking-wider">
                        Type
                      </span>
                      <span className="font-mono text-sm text-slate-200 mt-0.5">
                        {output.tokenType || "—"}
                      </span>
                    </div>
                    {output.keyId != null && output.keyId !== "" && (
                      <div className="flex flex-col border border-border-dark bg-background-dark rounded-lg p-3 min-w-[100px]">
                        <span className="text-slate-500 text-xs uppercase tracking-wider">
                          Key ID
                        </span>
                        <span className="font-mono text-sm text-slate-200 mt-0.5">
                          {output.keyId}
                        </span>
                      </div>
                    )}
                  </div>
                  <pre className="bg-background-dark rounded p-3 font-mono text-xs text-slate-300 overflow-x-auto border border-border-dark">
                    {output.headerRaw}
                  </pre>
                </div>
              )}
            </section>

            {/* Section 2 — Payload */}
            <section className="border border-border-dark rounded-lg bg-panel-dark overflow-hidden">
              <button
                type="button"
                onClick={() => setPayloadOpen((o) => !o)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
              >
                <span className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Payload
                </span>
                <span
                  className="material-symbols-outlined text-slate-400"
                  aria-hidden
                >
                  {payloadOpen ? "expand_less" : "expand_more"}
                </span>
              </button>
              {payloadOpen && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="flex flex-wrap gap-3">
                    <div className="flex flex-col border border-border-dark bg-background-dark rounded-lg p-3 min-w-[100px]">
                      <span className="text-slate-500 text-xs uppercase tracking-wider">
                        Subject
                      </span>
                      <span className="font-mono text-sm text-slate-200 mt-0.5">
                        {output.subject ?? "—"}
                      </span>
                    </div>
                    <div className="flex flex-col border border-border-dark bg-background-dark rounded-lg p-3 min-w-[100px]">
                      <span className="text-slate-500 text-xs uppercase tracking-wider">
                        Issuer
                      </span>
                      <span className="font-mono text-sm text-slate-200 mt-0.5">
                        {output.issuer ?? "—"}
                      </span>
                    </div>
                    <div className="flex flex-col border border-border-dark bg-background-dark rounded-lg p-3 min-w-[100px]">
                      <span className="text-slate-500 text-xs uppercase tracking-wider">
                        Audience
                      </span>
                      <span className="font-mono text-sm text-slate-200 mt-0.5">
                        {output.audience ?? "—"}
                      </span>
                    </div>
                    <div className="flex flex-col border border-border-dark bg-background-dark rounded-lg p-3 min-w-[100px]">
                      <span className="text-slate-500 text-xs uppercase tracking-wider">
                        JWT ID
                      </span>
                      <span className="font-mono text-sm text-slate-200 mt-0.5">
                        {output.jwtId ?? "—"}
                      </span>
                    </div>
                  </div>
                  {/* Time claims */}
                  <div className="flex flex-wrap gap-3">
                    <div className="flex flex-col border border-border-dark bg-background-dark rounded-lg p-3 min-w-[140px]">
                      <span className="text-slate-500 text-xs uppercase tracking-wider">
                        Issued At
                      </span>
                      <span className="font-mono text-sm text-slate-200 mt-0.5">
                        {output.issuedAt != null ? output.issuedAt : "—"}
                      </span>
                      {output.issuedAtHuman && (
                        <span className="text-xs text-slate-500 mt-0.5 block">
                          {output.issuedAtHuman}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col border border-border-dark bg-background-dark rounded-lg p-3 min-w-[140px]">
                      <span className="text-slate-500 text-xs uppercase tracking-wider">
                        Expires At
                      </span>
                      <span className="font-mono text-sm text-slate-200 mt-0.5">
                        {output.expiresAt != null ? output.expiresAt : "—"}
                      </span>
                      {output.expiresAtHuman && (
                        <span className="text-xs text-slate-500 mt-0.5">
                          {output.expiresAtHuman}
                        </span>
                      )}
                      {output.expiresAt != null && (
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium w-fit ${
                            output.isExpired === true
                              ? "bg-red-500/10 text-red-400"
                              : output.isExpired === false
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-slate-500/10 text-slate-400"
                          }`}
                        >
                          {output.isExpired === true
                            ? "Expired"
                            : output.isExpired === false
                              ? "Valid"
                              : "No expiry"}
                        </span>
                      )}
                    </div>
                  </div>
                  <pre className="bg-background-dark rounded p-3 font-mono text-xs text-slate-300 overflow-x-auto border border-border-dark">
                    {output.allClaims}
                  </pre>
                </div>
              )}
            </section>

            {/* Section 3 — Signature */}
            <section className="border border-border-dark rounded-lg bg-panel-dark overflow-hidden">
              <button
                type="button"
                onClick={() => setSignatureOpen((o) => !o)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
              >
                <span className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Signature
                </span>
                <span
                  className="material-symbols-outlined text-slate-400"
                  aria-hidden
                >
                  {signatureOpen ? "expand_less" : "expand_more"}
                </span>
              </button>
              {signatureOpen && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="font-mono text-xs text-slate-300 break-all">
                    {signatureHexExpanded
                      ? output.signatureRaw
                      : output.signatureRaw.length > 64
                        ? output.signatureRaw.slice(0, 64) + "…"
                        : output.signatureRaw}
                  </div>
                  {output.signatureRaw.length > 64 && (
                    <button
                      type="button"
                      onClick={() => setSignatureHexExpanded((e) => !e)}
                      className="text-primary text-xs hover:text-primary/80"
                    >
                      {signatureHexExpanded ? "Show less" : "Show more"}
                    </button>
                  )}
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        output.signatureValid === true
                          ? "bg-emerald-500/10 text-emerald-400"
                          : output.signatureValid === false
                            ? "bg-red-500/10 text-red-400"
                            : output.signatureNote.toLowerCase().includes("asymmetric")
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-slate-500/10 text-slate-400"
                      }`}
                    >
                      {output.signatureValid === true
                        ? "✓ Valid"
                        : output.signatureValid === false
                          ? "✗ Invalid"
                          : output.signatureNote.toLowerCase().includes("asymmetric")
                            ? "~ Asymmetric"
                            : "? Unverified"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-slate-500 text-xs uppercase tracking-wider">
                      Secret (for verification)
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative flex-1 min-w-[200px]">
                        <input
                          type={showSecret ? "text" : "password"}
                          aria-label="Secret for signature verification"
                          className="w-full px-3 py-2 bg-background-dark text-slate-100 font-mono text-sm border border-border-dark rounded-lg outline-none focus:ring-1 focus:ring-primary placeholder:text-slate-500"
                          placeholder="Enter secret to verify signature..."
                          value={secret}
                          onChange={(e) => setSecret(e.target.value)}
                        />
                        <button
                          type="button"
                          aria-label={showSecret ? "Hide secret" : "Show secret"}
                          onClick={() => setShowSecret((s) => !s)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {showSecret ? "visibility_off" : "visibility"}
                          </span>
                        </button>
                      </div>
                      <div className="flex gap-1">
                        {(["utf8", "base64", "hex"] as const).map((enc) => (
                          <button
                            key={enc}
                            type="button"
                            onClick={() => setSecretEncoding(enc)}
                            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                              secretEncoding === enc
                                ? "bg-primary text-white"
                                : "text-slate-400 hover:bg-slate-700"
                            }`}
                          >
                            {enc === "utf8" ? "UTF-8" : enc === "base64" ? "Base64" : "Hex"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="flex items-center gap-4 px-4 py-3 border-t border-border-dark bg-panel-dark shrink-0">
        <button
          type="button"
          onClick={handleCopyToken}
          disabled={!trimmedToken}
          className="px-3 py-2 text-xs font-medium bg-panel-dark text-slate-300 border border-border-dark rounded-lg hover:text-primary hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Copy Token
        </button>
        <button
          type="button"
          onClick={handleCopyPayload}
          disabled={!output?.allClaims}
          className="px-3 py-2 text-xs font-medium bg-panel-dark text-slate-300 border border-border-dark rounded-lg hover:text-primary hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Copy Payload
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="px-4 py-2 text-sm bg-panel-dark text-slate-400 border border-border-dark rounded-lg hover:text-slate-200 hover:border-slate-500 transition-colors"
        >
          Clear
        </button>
        {isLoading && (
          <span className="ml-auto text-xs text-primary">Processing…</span>
        )}
      </footer>
    </div>
  );
}

export default JwtDecoderTool;
