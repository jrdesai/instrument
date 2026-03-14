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
  lifetimeSeconds?: number | null;
  lifetimeHuman?: string | null;
  consumedPercent?: number | null;
  nbfActive?: boolean | null;
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

function formatSecondsHuman(secs: number): string {
  const s = Math.abs(Math.floor(secs));
  if (s < 3600) return `${Math.floor(s / 60)} minutes`;
  if (s < 86400) return `${Math.floor(s / 3600)} hours`;
  if (s < 2592000) return `${Math.floor(s / 86400)} days`;
  return `${Math.floor(s / 2592000)} months`;
}

function relativeTimeUntil(nowSec: number, expSec: number): string {
  const diff = Math.abs(Math.floor(expSec - nowSec));
  const past = nowSec >= expSec;
  const [value, unit] =
    diff < 60
      ? [diff, "seconds"]
      : diff < 3600
        ? [Math.floor(diff / 60), "minutes"]
        : diff < 86400
          ? [Math.floor(diff / 3600), "hours"]
          : [Math.floor(diff / 86400), "days"];
  const plural = value === 1 ? "" : "s";
  if (past) return `Expired ${value} ${unit}${plural} ago`;
  return `Expires in ${value} ${unit}${plural}`;
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
  const [liveConsumed, setLiveConsumed] = useState<number | null>(null);
  const [liveIsExpired, setLiveIsExpired] = useState<boolean | null>(null);
  const [liveTimeUntil, setLiveTimeUntil] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [secondsSinceRefresh, setSecondsSinceRefresh] = useState(0);
  const tokenDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const secretDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const calculateLiveValues = useCallback(() => {
    if (output?.issuedAt == null || output?.expiresAt == null) return;
    const now = Date.now() / 1000;
    const iat = output.issuedAt;
    const exp = output.expiresAt;
    const span = exp - iat;
    const consumed =
      span <= 0 ? 100 : Math.min(100, Math.max(0, ((now - iat) / span) * 100));
    setLiveConsumed(consumed);
    setLiveIsExpired(now >= exp);
    setLiveTimeUntil(relativeTimeUntil(now, exp));
  }, [output?.issuedAt, output?.expiresAt]);

  useEffect(() => {
    if (!output?.issuedAt || output?.expiresAt == null) {
      setLiveConsumed(null);
      setLiveIsExpired(null);
      setLiveTimeUntil(null);
      setLastRefreshed(null);
      return;
    }
    calculateLiveValues();
    setLastRefreshed(new Date());
  }, [output?.issuedAt, output?.expiresAt, output, calculateLiveValues]);

  useEffect(() => {
    if (!output?.issuedAt || output?.expiresAt == null) return;
    const interval = setInterval(() => {
      calculateLiveValues();
      setLastRefreshed(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, [output?.issuedAt, output?.expiresAt, output, calculateLiveValues]);

  useEffect(() => {
    if (lastRefreshed == null) return;
    setSecondsSinceRefresh(0);
    const interval = setInterval(() => {
      setSecondsSinceRefresh((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [lastRefreshed]);

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
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
      <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/5 border-b border-amber-500/20 text-amber-500/70 text-xs">
        <span className="material-symbols-outlined text-sm leading-none flex-shrink-0">
          warning
        </span>
        <span>
          For testing and inspection only. Never paste production secrets or sensitive tokens
          into third-party tools.
        </span>
      </div>
      {/* Token input */}
      <div className="flex flex-col px-4 py-3 border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
        <textarea
          aria-label="JWT token"
          className="w-full min-h-[120px] px-3 py-2 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-mono text-xs border border-border-light dark:border-border-dark rounded-lg resize-y outline-none focus:ring-1 focus:ring-primary placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
          <div className="text-red-600 dark:text-red-400 text-sm font-mono whitespace-pre-wrap mb-4">
            {output?.error}
          </div>
        )}

        {displayOutput && (
          <div className="space-y-3">
            {/* Section 1 — Header */}
            <section className="border border-border-light dark:border-border-dark rounded-lg bg-panel-light dark:bg-panel-dark overflow-hidden">
              <button
                type="button"
                onClick={() => setHeaderOpen((o) => !o)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
              >
                <span className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
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
                    <div className="flex flex-col border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark rounded-lg p-3 min-w-[100px]">
                      <span className="text-slate-500 text-xs uppercase tracking-wider">
                        Algorithm
                      </span>
                      <span className="font-mono text-sm text-slate-800 dark:text-slate-200 mt-0.5">
                        {output.algorithm || "—"}
                      </span>
                    </div>
                    <div className="flex flex-col border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark rounded-lg p-3 min-w-[100px]">
                      <span className="text-slate-500 text-xs uppercase tracking-wider">
                        Type
                      </span>
                      <span className="font-mono text-sm text-slate-800 dark:text-slate-200 mt-0.5">
                        {output.tokenType || "—"}
                      </span>
                    </div>
                    {output.keyId != null && output.keyId !== "" && (
                      <div className="flex flex-col border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark rounded-lg p-3 min-w-[100px]">
                        <span className="text-slate-500 text-xs uppercase tracking-wider">
                          Key ID
                        </span>
                        <span className="font-mono text-sm text-slate-800 dark:text-slate-200 mt-0.5">
                          {output.keyId}
                        </span>
                      </div>
                    )}
                  </div>
                  <pre className="bg-background-light dark:bg-background-dark rounded p-3 font-mono text-xs text-slate-700 dark:text-slate-300 overflow-x-auto border border-border-light dark:border-border-dark">
                    {output.headerRaw}
                  </pre>
                </div>
              )}
            </section>

            {/* Section 2 — Payload */}
            <section className="border border-border-light dark:border-border-dark rounded-lg bg-panel-light dark:bg-panel-dark overflow-hidden">
              <button
                type="button"
                onClick={() => setPayloadOpen((o) => !o)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
              >
                <span className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
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
                    <div className="flex flex-col border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark rounded-lg p-3 min-w-[100px]">
                      <span className="text-slate-500 text-xs uppercase tracking-wider">
                        Subject
                      </span>
                      <span className="font-mono text-sm text-slate-800 dark:text-slate-200 mt-0.5">
                        {output.subject ?? "—"}
                      </span>
                    </div>
                    <div className="flex flex-col border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark rounded-lg p-3 min-w-[100px]">
                      <span className="text-slate-500 text-xs uppercase tracking-wider">
                        Issuer
                      </span>
                      <span className="font-mono text-sm text-slate-800 dark:text-slate-200 mt-0.5">
                        {output.issuer ?? "—"}
                      </span>
                    </div>
                    <div className="flex flex-col border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark rounded-lg p-3 min-w-[100px]">
                      <span className="text-slate-500 text-xs uppercase tracking-wider">
                        Audience
                      </span>
                      <span className="font-mono text-sm text-slate-800 dark:text-slate-200 mt-0.5">
                        {output.audience ?? "—"}
                      </span>
                    </div>
                    <div className="flex flex-col border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark rounded-lg p-3 min-w-[100px]">
                      <span className="text-slate-500 text-xs uppercase tracking-wider">
                        JWT ID
                      </span>
                      <span className="font-mono text-sm text-slate-800 dark:text-slate-200 mt-0.5">
                        {output.jwtId ?? "—"}
                      </span>
                    </div>
                  </div>
                  {/* Time claims */}
                  <div className="flex flex-wrap gap-3">
                    <div className="flex flex-col border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark rounded-lg p-3 min-w-[140px]">
                      <span className="text-slate-500 text-xs uppercase tracking-wider">
                        Issued At
                      </span>
                      <span className="font-mono text-sm text-slate-800 dark:text-slate-200 mt-0.5">
                        {output.issuedAt != null ? output.issuedAt : "—"}
                      </span>
                      {output.issuedAtHuman && (
                        <span className="text-xs text-slate-500 mt-0.5 block">
                          {output.issuedAtHuman}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark rounded-lg p-3 min-w-[140px]">
                      <span className="text-slate-500 text-xs uppercase tracking-wider">
                        Expires At
                      </span>
                      <span className="font-mono text-sm text-slate-800 dark:text-slate-200 mt-0.5">
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

                  {/* Expiry Timeline — only when exp present */}
                  {output.expiresAt != null && (
                    <div className="space-y-3 pt-2 border-t border-border-light dark:border-border-dark">
                      <div className="flex items-center justify-between">
                        <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                          Expiry Timeline
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            calculateLiveValues();
                            setLastRefreshed(new Date());
                          }}
                          className="flex items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors text-xs cursor-pointer"
                          title="Refresh expiry status"
                        >
                          <span className="material-symbols-outlined text-sm leading-none">
                            refresh
                          </span>
                          Refresh
                        </button>
                      </div>
                      {lastRefreshed != null && (
                        <div className="text-slate-600 text-xs">
                          {secondsSinceRefresh === 0
                            ? "Updated just now"
                            : `Updated ${secondsSinceRefresh} seconds ago`}
                        </div>
                      )}
                      <div
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          (liveIsExpired ?? output.isExpired) === true
                            ? "bg-red-500/10 text-red-400"
                            : "bg-emerald-500/10 text-emerald-400"
                        }`}
                      >
                        {(liveIsExpired ?? output.isExpired) === true
                          ? `● EXPIRED — ${liveTimeUntil ?? output.timeUntilExpiry ?? ""}`
                          : `● VALID — ${liveTimeUntil ?? output.timeUntilExpiry ?? ""}`}
                      </div>

                      {(liveConsumed != null || output.consumedPercent != null) &&
                        output.lifetimeSeconds != null && (
                          <>
                            <div className="w-full h-2 bg-background-light dark:bg-background-dark rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  (liveIsExpired ?? output.isExpired) === true
                                    ? "bg-red-500 w-full"
                                    : (liveConsumed ?? output.consumedPercent ?? 0) >= 90
                                      ? "bg-red-500"
                                      : (liveConsumed ?? output.consumedPercent ?? 0) >= 75
                                        ? "bg-amber-500"
                                        : "bg-emerald-500"
                                }`}
                                style={{
                                  width:
                                    (liveIsExpired ?? output.isExpired) === true
                                      ? "100%"
                                      : `${Math.min(100, liveConsumed ?? output.consumedPercent ?? 0)}%`,
                                }}
                              />
                            </div>
                            <div className="relative flex justify-between text-xs font-mono text-slate-500">
                              <span>
                                Issued{" "}
                                {output.issuedAtHuman ?? output.issuedAt ?? "—"}
                              </span>
                              <span
                                className="absolute -top-5 left-0 -translate-x-1/2"
                                style={{
                                  left: `${liveConsumed ?? output.consumedPercent ?? 0}%`,
                                }}
                              >
                                <span className="text-primary">●</span> Now
                              </span>
                              <span>
                                Expires{" "}
                                {output.expiresAtHuman ?? output.expiresAt ?? "—"}
                              </span>
                            </div>
                            <div className="text-slate-500 text-xs">
                              Lifetime: {output.lifetimeHuman ?? "—"} · Consumed:{" "}
                              {(liveConsumed ?? output.consumedPercent) != null
                                ? `${(liveConsumed ?? output.consumedPercent ?? 0).toFixed(1)}%`
                                : "—"}{" "}
                              · Used:{" "}
                              {output.lifetimeSeconds != null &&
                              (liveConsumed ?? output.consumedPercent) != null
                                ? formatSecondsHuman(
                                    ((liveConsumed ?? output.consumedPercent ?? 0) / 100) *
                                      output.lifetimeSeconds
                                  )
                                : "—"}
                            </div>
                          </>
                        )}

                      {output.nbfActive != null && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-500">
                            Not Before: {output.notBefore ?? "—"}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded font-medium ${
                              output.nbfActive
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-amber-500/10 text-amber-400"
                            }`}
                          >
                            {output.nbfActive ? "Active" : "Not yet active"}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <pre className="bg-background-light dark:bg-background-dark rounded p-3 font-mono text-xs text-slate-700 dark:text-slate-300 overflow-x-auto border border-border-light dark:border-border-dark">
                    {output.allClaims}
                  </pre>
                </div>
              )}
            </section>

            {/* Section 3 — Signature */}
            <section className="border border-border-light dark:border-border-dark rounded-lg bg-panel-light dark:bg-panel-dark overflow-hidden">
              <button
                type="button"
                onClick={() => setSignatureOpen((o) => !o)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
              >
                <span className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
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
                  <div className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all">
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
                          className="w-full px-3 py-2 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-mono text-sm border border-border-light dark:border-border-dark rounded-lg outline-none focus:ring-1 focus:ring-primary placeholder:text-slate-500"
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
                                : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
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
      <footer className="flex items-center gap-4 px-4 py-3 border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shrink-0">
        <button
          type="button"
          onClick={handleCopyToken}
          disabled={!trimmedToken}
          className="px-3 py-2 text-xs font-medium bg-panel-light dark:bg-panel-dark text-slate-700 dark:text-slate-300 border border-border-light dark:border-border-dark rounded-lg hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Copy Token
        </button>
        <button
          type="button"
          onClick={handleCopyPayload}
          disabled={!output?.allClaims}
          className="px-3 py-2 text-xs font-medium bg-panel-light dark:bg-panel-dark text-slate-700 dark:text-slate-300 border border-border-light dark:border-border-dark rounded-lg hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Copy Payload
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="px-4 py-2 text-sm bg-panel-light dark:bg-panel-dark text-slate-500 dark:text-slate-400 border border-border-light dark:border-border-dark rounded-lg hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
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
