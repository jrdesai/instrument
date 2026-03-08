import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { callTool } from "../../bridge";

const RUST_COMMAND = "tool_jwt_build";
const PENDING_DECODE_KEY = "instrument:jwt:pendingDecode";
const TRUNCATE_LEN = 20;

type SecretEncoding = "utf8" | "base64" | "hex";
type JwtAlgorithm = "HS256" | "HS384" | "HS512" | "none";
type ExpUnit = "minutes" | "hours" | "days";

interface JwtBuildInputPayload {
  algorithm: JwtAlgorithm;
  secret: string;
  secretEncoding: SecretEncoding;
  payloadJson: string;
  includeIat: boolean;
  includeExp: boolean;
  expSeconds: number;
  extraHeaders: string;
}

interface JwtBuildOutputPayload {
  token: string;
  headerJson: string;
  payloadJson: string;
  headerB64: string;
  payloadB64: string;
  signatureB64: string;
  algorithm: string;
  expiresAt?: string | null;
  issuedAt?: string | null;
  error?: string | null;
}

function truncate(s: string, len: number): string {
  if (s.length <= len) return s;
  return s.slice(0, len) + "…";
}

function expSecondsFromValue(value: number, unit: ExpUnit): number {
  switch (unit) {
    case "minutes":
      return value * 60;
    case "hours":
      return value * 3600;
    case "days":
      return value * 86400;
    default:
      return value * 3600;
  }
}

function JwtBuilderTool() {
  const navigate = useNavigate();
  const [algorithm, setAlgorithm] = useState<JwtAlgorithm>("HS256");
  const [secret, setSecret] = useState("");
  const [secretEncoding, setSecretEncoding] = useState<SecretEncoding>("utf8");
  const [showSecret, setShowSecret] = useState(false);

  const [subEnabled, setSubEnabled] = useState(false);
  const [subValue, setSubValue] = useState("");
  const [issEnabled, setIssEnabled] = useState(false);
  const [issValue, setIssValue] = useState("");
  const [audEnabled, setAudEnabled] = useState(false);
  const [audValue, setAudValue] = useState("");
  const [jtiEnabled, setJtiEnabled] = useState(false);
  const [jtiValue, setJtiValue] = useState("");
  const [iatEnabled, setIatEnabled] = useState(false);
  const [expEnabled, setExpEnabled] = useState(true);
  const [expValue, setExpValue] = useState(1);
  const [expUnit, setExpUnit] = useState<ExpUnit>("hours");

  const [customPayload, setCustomPayload] = useState("");
  const [extraHeadersOpen, setExtraHeadersOpen] = useState(false);
  const [extraHeaders, setExtraHeaders] = useState("");

  const [output, setOutput] = useState<JwtBuildOutputPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [headerPreviewOpen, setHeaderPreviewOpen] = useState(true);
  const [payloadPreviewOpen, setPayloadPreviewOpen] = useState(true);

  const lastBuiltRef = useRef<{
    algorithm: JwtAlgorithm;
    secretEncoding: SecretEncoding;
  } | null>(null);

  const buildPayloadJson = useCallback(() => {
    const custom = customPayload.trim();
    let payload: Record<string, unknown> = custom
      ? (() => {
          try {
            const parsed = JSON.parse(custom);
            return typeof parsed === "object" && parsed !== null
              ? (parsed as Record<string, unknown>)
              : {};
          } catch {
            return {};
          }
        })()
      : {};
    if (subEnabled && subValue.trim()) payload.sub = subValue.trim();
    if (issEnabled && issValue.trim()) payload.iss = issValue.trim();
    if (audEnabled && audValue.trim()) payload.aud = audValue.trim();
    if (jtiEnabled && jtiValue.trim()) payload.jti = jtiValue.trim();
    return JSON.stringify(payload);
  }, [
    customPayload,
    subEnabled,
    subValue,
    issEnabled,
    issValue,
    audEnabled,
    audValue,
    jtiEnabled,
    jtiValue,
  ]);

  const runProcess = useCallback(async () => {
    const payloadJson = buildPayloadJson();
    setIsLoading(true);
    try {
      const input: JwtBuildInputPayload = {
        algorithm,
        secret: secret.trim(),
        secretEncoding,
        payloadJson,
        includeIat: iatEnabled,
        includeExp: expEnabled,
        expSeconds: expSecondsFromValue(expValue, expUnit),
        extraHeaders: extraHeaders.trim(),
      };
      const result = (await callTool(
        RUST_COMMAND,
        input
      )) as JwtBuildOutputPayload;
      setOutput(result);
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : typeof e === "string"
            ? e
            : "Failed to run tool";
      setOutput({
        token: "",
        headerJson: "",
        payloadJson: "",
        headerB64: "",
        payloadB64: "",
        signatureB64: "",
        algorithm: "",
        error: message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    algorithm,
    secret,
    secretEncoding,
    buildPayloadJson,
    iatEnabled,
    expEnabled,
    expValue,
    expUnit,
    extraHeaders,
  ]);

  const handleBuild = useCallback(() => {
    if (customPayload.trim()) {
      try {
        JSON.parse(customPayload.trim());
      } catch {
        setOutput({
          token: "",
          headerJson: "",
          payloadJson: "",
          headerB64: "",
          payloadB64: "",
          signatureB64: "",
          algorithm: "",
          error: "Invalid JSON in custom claims",
        });
        return;
      }
    }
    runProcess();
    lastBuiltRef.current = { algorithm, secretEncoding };
  }, [customPayload, runProcess, algorithm, secretEncoding]);

  useEffect(() => {
    if (!output?.token || output.error) return;
    const last = lastBuiltRef.current;
    if (
      last &&
      (algorithm !== last.algorithm || secretEncoding !== last.secretEncoding)
    ) {
      runProcess();
      lastBuiltRef.current = { algorithm, secretEncoding };
    }
  }, [algorithm, secretEncoding, output?.token, output?.error, runProcess]);

  const handleClear = useCallback(() => {
    setOutput(null);
    setCustomPayload("");
    setSubValue("");
    setIssValue("");
    setAudValue("");
    setJtiValue("");
    setExtraHeaders("");
    lastBuiltRef.current = null;
  }, []);

  const handleCopyToken = useCallback(async () => {
    if (!output?.token) return;
    try {
      await navigator.clipboard.writeText(output.token);
    } catch {
      // ignore
    }
  }, [output?.token]);

  const handleOpenInDecoder = useCallback(() => {
    if (!output?.token) return;
    try {
      sessionStorage.setItem(PENDING_DECODE_KEY, output.token);
      navigate("/tools/jwt-decoder");
    } catch {
      // ignore
    }
  }, [output?.token, navigate]);

  const generateJti = useCallback(() => {
    try {
      setJtiValue(crypto.randomUUID());
    } catch {
      setJtiValue("");
    }
  }, []);

  const hasToken = Boolean(output?.token && !output?.error);
  const parts = hasToken ? output!.token.split(".") : [];
  const hasThreeParts = parts.length === 3;

  return (
    <div className="flex flex-col h-full bg-background-dark text-slate-100 font-display">
      <div className="flex flex-1 min-h-0">
        {/* Left panel — configuration */}
        <div className="w-[40%] min-w-0 flex flex-col border-r border-border-dark bg-panel-dark overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Section 1 — Algorithm and Secret */}
            <section>
              <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                Algorithm
              </h2>
              <div className="flex flex-wrap gap-2">
                {(["HS256", "HS384", "HS512", "none"] as const).map((alg) => (
                  <button
                    key={alg}
                    type="button"
                    onClick={() => setAlgorithm(alg)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      algorithm === alg
                        ? "bg-primary text-white"
                        : "text-slate-400 hover:bg-white/5 border border-border-dark"
                    }`}
                  >
                    {alg}
                  </button>
                ))}
              </div>
              {algorithm !== "none" && (
                <div className="mt-3 space-y-2">
                  <label className="block text-slate-500 text-xs uppercase tracking-wider">
                    Secret
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 min-w-0">
                      <input
                        type={showSecret ? "text" : "password"}
                        aria-label="Signing secret"
                        className="w-full px-3 py-2 bg-background-dark text-slate-100 font-mono text-sm border border-border-dark rounded-lg outline-none focus:ring-1 focus:ring-primary placeholder:text-slate-500"
                        placeholder="Enter signing secret..."
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
                          className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors ${
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
              )}
            </section>

            {/* Section 2 — Payload */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  Payload
                </h2>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={subEnabled}
                    onChange={(e) => setSubEnabled(e.target.checked)}
                    className="rounded border-border-dark bg-background-dark text-primary focus:ring-primary"
                  />
                  Subject (sub)
                </label>
                {subEnabled && (
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-background-dark text-slate-100 text-sm border border-border-dark rounded-lg"
                    placeholder="sub value"
                    value={subValue}
                    onChange={(e) => setSubValue(e.target.value)}
                  />
                )}
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={issEnabled}
                    onChange={(e) => setIssEnabled(e.target.checked)}
                    className="rounded border-border-dark bg-background-dark text-primary focus:ring-primary"
                  />
                  Issuer (iss)
                </label>
                {issEnabled && (
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-background-dark text-slate-100 text-sm border border-border-dark rounded-lg"
                    placeholder="iss value"
                    value={issValue}
                    onChange={(e) => setIssValue(e.target.value)}
                  />
                )}
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={audEnabled}
                    onChange={(e) => setAudEnabled(e.target.checked)}
                    className="rounded border-border-dark bg-background-dark text-primary focus:ring-primary"
                  />
                  Audience (aud)
                </label>
                {audEnabled && (
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-background-dark text-slate-100 text-sm border border-border-dark rounded-lg"
                    placeholder="aud value"
                    value={audValue}
                    onChange={(e) => setAudValue(e.target.value)}
                  />
                )}
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={jtiEnabled}
                    onChange={(e) => setJtiEnabled(e.target.checked)}
                    className="rounded border-border-dark bg-background-dark text-primary focus:ring-primary"
                  />
                  JWT ID (jti)
                </label>
                {jtiEnabled && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 min-w-0 px-3 py-2 bg-background-dark text-slate-100 font-mono text-sm border border-border-dark rounded-lg"
                      placeholder="jti value"
                      value={jtiValue}
                      onChange={(e) => setJtiValue(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={generateJti}
                      className="px-3 py-2 text-xs font-medium bg-background-dark text-slate-300 border border-border-dark rounded-lg hover:text-primary hover:border-primary/60"
                    >
                      Generate
                    </button>
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={iatEnabled}
                    onChange={(e) => setIatEnabled(e.target.checked)}
                    className="rounded border-border-dark bg-background-dark text-primary focus:ring-primary"
                  />
                  Issued At (iat)
                </label>
                {iatEnabled && (
                  <p className="text-xs text-slate-500">Current time (auto)</p>
                )}
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={expEnabled}
                    onChange={(e) => setExpEnabled(e.target.checked)}
                    className="rounded border-border-dark bg-background-dark text-primary focus:ring-primary"
                  />
                  Expires In (exp)
                </label>
                {expEnabled && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      className="w-20 px-3 py-2 bg-background-dark text-slate-100 text-sm border border-border-dark rounded-lg"
                      value={expValue}
                      onChange={(e) =>
                        setExpValue(Math.max(1, parseInt(e.target.value, 10) || 1))
                      }
                    />
                    <div className="flex gap-1">
                      {(["minutes", "hours", "days"] as const).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setExpUnit(u)}
                          className={`px-2 py-1 text-xs font-medium rounded-lg capitalize ${
                            expUnit === u
                              ? "bg-primary text-white"
                              : "text-slate-400 hover:bg-slate-700"
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <label className="block text-slate-500 text-xs uppercase tracking-wider mt-3 mb-1">
                Custom claims (JSON)
              </label>
              <textarea
                className="w-full min-h-[80px] px-3 py-2 bg-background-dark text-slate-100 font-mono text-xs border border-border-dark rounded-lg resize-y placeholder:text-slate-500"
                placeholder={'{\n  "name": "John Doe"\n}'}
                value={customPayload}
                onChange={(e) => setCustomPayload(e.target.value)}
                rows={4}
              />
            </section>

            {/* Section 3 — Extra Headers */}
            <section>
              <button
                type="button"
                onClick={() => setExtraHeadersOpen((o) => !o)}
                className="flex items-center justify-between w-full text-left"
              >
                <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  Extra Headers
                </h2>
                <span className="material-symbols-outlined text-slate-400 text-[18px]">
                  {extraHeadersOpen ? "expand_less" : "expand_more"}
                </span>
              </button>
              {extraHeadersOpen && (
                <textarea
                  className="w-full min-h-[60px] mt-2 px-3 py-2 bg-background-dark text-slate-100 font-mono text-xs border border-border-dark rounded-lg resize-y placeholder:text-slate-500"
                  placeholder={'{\n  "kid": "my-key-id"\n}'}
                  value={extraHeaders}
                  onChange={(e) => setExtraHeaders(e.target.value)}
                  rows={2}
                />
              )}
            </section>

            <button
              type="button"
              onClick={handleBuild}
              disabled={isLoading}
              className="w-full py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">
                    progress_activity
                  </span>
                  Building…
                </>
              ) : (
                "Build JWT"
              )}
            </button>
          </div>
        </div>

        {/* Right panel — output */}
        <div className="flex-1 min-w-0 flex flex-col overflow-y-auto p-4">
          {!hasToken && !output?.error && (
            <p className="text-slate-500 text-sm">
              Configure claims and click Build JWT
            </p>
          )}
          {output?.error && (
            <div className="text-red-400 text-sm font-mono whitespace-pre-wrap mb-4">
              {output.error}
            </div>
          )}
          {hasToken && output && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-500 text-xs uppercase tracking-wider mb-2">
                  Token
                </label>
                <textarea
                  readOnly
                  className="w-full min-h-[100px] px-3 py-2 bg-background-dark text-slate-100 font-mono text-xs border border-border-dark rounded-lg resize-y"
                  value={output.token}
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

              <section className="border border-border-dark rounded-lg bg-panel-dark overflow-hidden">
                <button
                  type="button"
                  onClick={() => setHeaderPreviewOpen((o) => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5"
                >
                  <span className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                    Header JSON
                  </span>
                  <span className="material-symbols-outlined text-slate-400">
                    {headerPreviewOpen ? "expand_less" : "expand_more"}
                  </span>
                </button>
                {headerPreviewOpen && (
                  <pre className="px-4 pb-4 font-mono text-xs text-slate-300 overflow-x-auto">
                    {output.headerJson}
                  </pre>
                )}
              </section>

              <section className="border border-border-dark rounded-lg bg-panel-dark overflow-hidden">
                <button
                  type="button"
                  onClick={() => setPayloadPreviewOpen((o) => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5"
                >
                  <span className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                    Payload JSON
                  </span>
                  <span className="material-symbols-outlined text-slate-400">
                    {payloadPreviewOpen ? "expand_less" : "expand_more"}
                  </span>
                </button>
                {payloadPreviewOpen && (
                  <div className="px-4 pb-4 space-y-2">
                    {output.issuedAt && (
                      <p className="text-xs text-slate-500">
                        iat → {output.issuedAt}
                      </p>
                    )}
                    {output.expiresAt && (
                      <p className="text-xs text-slate-500">
                        exp → {output.expiresAt}
                      </p>
                    )}
                    <pre className="font-mono text-xs text-slate-300 overflow-x-auto">
                      {output.payloadJson}
                    </pre>
                  </div>
                )}
              </section>

              {output.expiresAt && (
                <p className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-2 rounded-lg w-fit">
                  Expires at {output.expiresAt}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <footer className="flex items-center gap-4 px-4 py-3 border-t border-border-dark bg-panel-dark shrink-0">
        <button
          type="button"
          onClick={handleCopyToken}
          disabled={!hasToken}
          className="px-3 py-2 text-xs font-medium bg-panel-dark text-slate-300 border border-border-dark rounded-lg hover:text-primary hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Copy Token
        </button>
        <button
          type="button"
          onClick={handleOpenInDecoder}
          disabled={!hasToken}
          className="px-3 py-2 text-xs font-medium bg-panel-dark text-slate-300 border border-border-dark rounded-lg hover:text-primary hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Open in Decoder
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="px-4 py-2 text-sm bg-panel-dark text-slate-400 border border-border-dark rounded-lg hover:text-slate-200 hover:border-slate-500 transition-colors"
        >
          Clear
        </button>
      </footer>
    </div>
  );
}

export default JwtBuilderTool;
