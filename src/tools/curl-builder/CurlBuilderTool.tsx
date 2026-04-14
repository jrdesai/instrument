import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CopyButton } from "../../components/tool";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
type AuthType = "none" | "bearer" | "basic" | "apikey";
type BodyContentType = "none" | "json" | "form" | "text";
type ApiKeyIn = "header" | "query";

interface KVPair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface Auth {
  type: AuthType;
  token: string;
  username: string;
  password: string;
  keyName: string;
  keyValue: string;
  keyIn: ApiKeyIn;
}

interface Body {
  contentType: BodyContentType;
  content: string;
}

interface Options {
  followRedirects: boolean;
  skipSsl: boolean;
  verbose: boolean;
  timeout: string;
}

interface FormState {
  method: HttpMethod;
  url: string;
  queryParams: KVPair[];
  headers: KVPair[];
  auth: Auth;
  body: Body;
  options: Options;
}

function isCurlState(raw: unknown): raw is FormState {
  if (!raw || typeof raw !== "object") return false;
  const r = raw as Record<string, unknown>;
  return (
    typeof r.method === "string" &&
    typeof r.url === "string" &&
    Array.isArray(r.queryParams) &&
    Array.isArray(r.headers) &&
    typeof r.auth === "object" &&
    r.auth !== null &&
    typeof r.body === "object" &&
    r.body !== null &&
    typeof r.options === "object" &&
    r.options !== null
  );
}

function createDefaultState(): FormState {
  return {
    method: "GET",
    url: "",
    queryParams: [],
    headers: [],
    auth: {
      type: "none",
      token: "",
      username: "",
      password: "",
      keyName: "",
      keyValue: "",
      keyIn: "header",
    },
    body: { contentType: "json", content: "" },
    options: { followRedirects: false, skipSsl: false, verbose: false, timeout: "" },
  };
}

function buildCurlCommand(state: FormState): string {
  const { method, url, queryParams, headers, auth, body, options } = state;
  if (!url.trim()) return "";

  let fullUrl = url.trim();
  const enabledParams = queryParams.filter((p) => p.enabled && p.key.trim());
  if (
    auth.type === "apikey" &&
    auth.keyIn === "query" &&
    auth.keyName.trim() &&
    auth.keyValue.trim()
  ) {
    enabledParams.push({
      id: "_apikey",
      key: auth.keyName,
      value: auth.keyValue,
      enabled: true,
    });
  }
  if (enabledParams.length > 0) {
    const qs = enabledParams
      .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join("&");
    fullUrl = fullUrl.includes("?") ? `${fullUrl}&${qs}` : `${fullUrl}?${qs}`;
  }

  const parts: string[] = ["curl"];

  const hasBody = body.content.trim() && !["GET", "HEAD"].includes(method);
  if (!(method === "GET") && !(method === "POST" && hasBody)) {
    parts.push(`-X ${method}`);
  }

  parts.push(`"${fullUrl.replace(/"/g, '\\"')}"`);

  if (auth.type === "bearer" && auth.token.trim()) {
    parts.push(`-H "Authorization: Bearer ${auth.token.trim()}"`);
  } else if (auth.type === "basic" && auth.username.trim()) {
    const creds = auth.password ? `${auth.username}:${auth.password}` : auth.username;
    parts.push(`-u "${creds}"`);
  } else if (
    auth.type === "apikey" &&
    auth.keyIn === "header" &&
    auth.keyName.trim() &&
    auth.keyValue.trim()
  ) {
    parts.push(`-H "${auth.keyName.trim()}: ${auth.keyValue.trim()}"`);
  }

  for (const h of headers.filter((h) => h.enabled && h.key.trim())) {
    parts.push(`-H "${h.key.trim()}: ${h.value}"`);
  }

  if (hasBody) {
    if (body.contentType === "json") {
      parts.push(`-H "Content-Type: application/json"`);
    } else if (body.contentType === "form") {
      parts.push(`-H "Content-Type: application/x-www-form-urlencoded"`);
    }
    const escaped = body.content.trim().replace(/'/g, `'\\''`);
    parts.push(`-d '${escaped}'`);
  }

  if (options.followRedirects) parts.push("-L");
  if (options.skipSsl) parts.push("-k");
  if (options.verbose) parts.push("-v");
  if (options.timeout.trim() && !isNaN(Number(options.timeout))) {
    parts.push(`-m ${options.timeout.trim()}`);
  }

  // One line when it's only curl + URL; line continuations only when there are flags/options.
  if (parts.length <= 2) return parts.join(" ");
  return parts[0] + " \\\n  " + parts.slice(1).join(" \\\n  ");
}

function methodSelectAccent(method: HttpMethod): string {
  switch (method) {
    case "GET":
      return "border-green-600 text-green-600 dark:border-green-400 dark:text-green-400";
    case "POST":
      return "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400";
    case "PUT":
      return "border-yellow-600 text-yellow-600 dark:border-yellow-400 dark:text-yellow-400";
    case "PATCH":
      return "border-orange-600 text-orange-600 dark:border-orange-400 dark:text-orange-400";
    case "DELETE":
      return "border-red-600 text-red-600 dark:border-red-400 dark:text-red-400";
    default:
      return "border-slate-500 text-slate-600 dark:border-slate-500 dark:text-slate-400";
  }
}

const SESSION_KEY = "curl-builder-state";

export default function CurlBuilderTool() {
  const [state, setState] = useState<FormState>(createDefaultState);
  const skipPersistRef = useRef(true);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (isCurlState(parsed)) {
          setState(parsed);
        } else {
          sessionStorage.removeItem(SESSION_KEY);
        }
      }
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, []);

  useEffect(() => {
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  }, [state]);

  const curlOutput = useMemo(() => buildCurlCommand(state), [state]);

  const addQueryParam = useCallback(() => {
    setState((s) => ({
      ...s,
      queryParams: [
        ...s.queryParams,
        { id: crypto.randomUUID(), key: "", value: "", enabled: true },
      ],
    }));
  }, []);

  const addHeader = useCallback(() => {
    setState((s) => ({
      ...s,
      headers: [...s.headers, { id: crypto.randomUUID(), key: "", value: "", enabled: true }],
    }));
  }, []);

  const updateQueryParam = useCallback((id: string, patch: Partial<KVPair>) => {
    setState((s) => ({
      ...s,
      queryParams: s.queryParams.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  }, []);

  const removeQueryParam = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      queryParams: s.queryParams.filter((p) => p.id !== id),
    }));
  }, []);

  const updateHeader = useCallback((id: string, patch: Partial<KVPair>) => {
    setState((s) => ({
      ...s,
      headers: s.headers.map((h) => (h.id === id ? { ...h, ...patch } : h)),
    }));
  }, []);

  const removeHeader = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      headers: s.headers.filter((h) => h.id !== id),
    }));
  }, []);

  const { method, url, queryParams, headers, auth, body, options } = state;

  return (
    <div className="flex h-full min-h-0 bg-background-light font-display dark:bg-background-dark">
      <div className="flex min-h-0 w-[55%] shrink-0 flex-col overflow-y-auto border-r border-border-light bg-background-light dark:border-border-dark dark:bg-background-dark">
        <div className="flex gap-2 border-b border-border-light bg-background-light px-4 py-3 dark:border-border-dark dark:bg-background-dark">
          <div
            className={`relative shrink-0 rounded-lg border-2 bg-background-light dark:bg-background-dark ${methodSelectAccent(method)} focus-within:ring-2 focus-within:ring-primary/35`}
          >
            <select
              value={method}
              onChange={(e) =>
                setState((s) => ({ ...s, method: e.target.value as HttpMethod }))
              }
              className="w-full min-w-[6.25rem] cursor-pointer appearance-none rounded-md border-0 bg-transparent py-1.5 pr-8 pl-2 text-sm font-mono font-semibold text-inherit focus:outline-none"
              aria-label="HTTP method"
            >
              {(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const).map(
                (m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ),
              )}
            </select>
            <span
              className="pointer-events-none absolute inset-y-0 right-1 flex items-center text-inherit opacity-80"
              aria-hidden
            >
              <span className="material-symbols-outlined text-[20px] leading-none">
                expand_more
              </span>
            </span>
          </div>

          <input
            type="url"
            placeholder="https://api.example.com/endpoint"
            value={url}
            onChange={(e) => setState((s) => ({ ...s, url: e.target.value }))}
            className="min-w-0 flex-1 rounded-lg border border-border-light bg-background-light px-3 py-1.5 font-mono text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none dark:border-border-dark dark:bg-background-dark dark:text-slate-100"
          />
        </div>

        <div className="border-b border-border-light bg-panel-light px-4 py-2 dark:border-border-dark dark:bg-panel-dark">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Query Params
          </span>
        </div>
        {queryParams.length === 0 ? (
          <p className="px-4 py-2 text-xs text-slate-400 dark:text-slate-600">None added</p>
        ) : (
          queryParams.map((pair) => (
            <div key={pair.id} className="flex items-center gap-2 px-4 py-1.5">
              <input
                type="checkbox"
                checked={pair.enabled}
                onChange={(e) => updateQueryParam(pair.id, { enabled: e.target.checked })}
                className="shrink-0 rounded border-border-light text-primary focus:ring-primary dark:border-border-dark"
              />
              <input
                placeholder="Key"
                value={pair.key}
                onChange={(e) => updateQueryParam(pair.id, { key: e.target.value })}
                className="w-[38%] shrink-0 rounded border border-border-light bg-background-light px-2 py-1 font-mono text-xs text-slate-800 placeholder-slate-400 focus:border-primary focus:outline-none dark:border-border-dark dark:bg-background-dark dark:text-slate-200"
              />
              <input
                placeholder="Value"
                value={pair.value}
                onChange={(e) => updateQueryParam(pair.id, { value: e.target.value })}
                className="min-w-0 flex-1 rounded border border-border-light bg-background-light px-2 py-1 font-mono text-xs text-slate-800 placeholder-slate-400 focus:border-primary focus:outline-none dark:border-border-dark dark:bg-background-dark dark:text-slate-200"
              />
              <button
                type="button"
                onClick={() => removeQueryParam(pair.id)}
                className="shrink-0 text-slate-400 transition-colors hover:text-red-500"
                aria-label="Remove"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          ))
        )}
        <div className="px-4 py-2">
          <button
            type="button"
            onClick={addQueryParam}
            className="flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-primary"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            Add
          </button>
        </div>

        <div className="border-b border-border-light bg-panel-light px-4 py-2 dark:border-border-dark dark:bg-panel-dark">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Headers
          </span>
        </div>
        {headers.length === 0 ? (
          <p className="px-4 py-2 text-xs text-slate-400 dark:text-slate-600">None added</p>
        ) : (
          headers.map((pair) => (
            <div key={pair.id} className="flex items-center gap-2 px-4 py-1.5">
              <input
                type="checkbox"
                checked={pair.enabled}
                onChange={(e) => updateHeader(pair.id, { enabled: e.target.checked })}
                className="shrink-0 rounded border-border-light text-primary focus:ring-primary dark:border-border-dark"
              />
              <input
                placeholder="Key"
                value={pair.key}
                onChange={(e) => updateHeader(pair.id, { key: e.target.value })}
                className="w-[38%] shrink-0 rounded border border-border-light bg-background-light px-2 py-1 font-mono text-xs text-slate-800 placeholder-slate-400 focus:border-primary focus:outline-none dark:border-border-dark dark:bg-background-dark dark:text-slate-200"
              />
              <input
                placeholder="Value"
                value={pair.value}
                onChange={(e) => updateHeader(pair.id, { value: e.target.value })}
                className="min-w-0 flex-1 rounded border border-border-light bg-background-light px-2 py-1 font-mono text-xs text-slate-800 placeholder-slate-400 focus:border-primary focus:outline-none dark:border-border-dark dark:bg-background-dark dark:text-slate-200"
              />
              <button
                type="button"
                onClick={() => removeHeader(pair.id)}
                className="shrink-0 text-slate-400 transition-colors hover:text-red-500"
                aria-label="Remove"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          ))
        )}
        <div className="px-4 py-2">
          <button
            type="button"
            onClick={addHeader}
            className="flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-primary"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            Add
          </button>
        </div>

        {!["GET", "HEAD"].includes(method) && (
          <>
            <div className="border-b border-border-light bg-panel-light px-4 py-2 dark:border-border-dark dark:bg-panel-dark">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Body
              </span>
            </div>
            <div className="px-4 py-3">
              <div className="mb-2 flex gap-1">
                {(["json", "form", "text", "none"] as const).map((ct) => (
                  <button
                    key={ct}
                    type="button"
                    onClick={() =>
                      setState((s) => ({ ...s, body: { ...s.body, contentType: ct } }))
                    }
                    className={`rounded-full border px-3 py-0.5 text-xs font-medium transition-colors ${
                      body.contentType === ct
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border-light text-slate-500 hover:text-primary dark:border-border-dark"
                    }`}
                  >
                    {ct === "json"
                      ? "JSON"
                      : ct === "form"
                        ? "Form"
                        : ct === "text"
                          ? "Plain text"
                          : "None"}
                  </button>
                ))}
              </div>

              {body.contentType !== "none" && (
                <textarea
                  placeholder={
                    body.contentType === "json"
                      ? '{"key": "value"}'
                      : body.contentType === "form"
                        ? "key=value&another=123"
                        : "Raw body content"
                  }
                  value={body.content}
                  onChange={(e) =>
                    setState((s) => ({ ...s, body: { ...s.body, content: e.target.value } }))
                  }
                  rows={6}
                  className="w-full resize-y rounded-lg border border-border-light bg-background-light px-3 py-2 font-mono text-xs text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none dark:border-border-dark dark:bg-background-dark dark:text-slate-200 dark:placeholder:text-slate-500"
                  spellCheck={false}
                />
              )}
            </div>
          </>
        )}

        <div className="border-b border-border-light bg-panel-light px-4 py-2 dark:border-border-dark dark:bg-panel-dark">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Auth
          </span>
        </div>
        <div className="px-4 pb-3">
          <select
            value={auth.type}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                auth: { ...s.auth, type: e.target.value as AuthType },
              }))
            }
            className="w-full rounded-lg border border-border-light bg-background-light px-2 py-1.5 text-sm text-slate-800 focus:border-primary focus:outline-none dark:border-border-dark dark:bg-background-dark dark:text-slate-200"
          >
            <option value="none">No Auth</option>
            <option value="bearer">Bearer Token</option>
            <option value="basic">Basic Auth</option>
            <option value="apikey">API Key</option>
          </select>

          {auth.type === "bearer" && (
            <input
              placeholder="Token"
              value={auth.token}
              onChange={(e) =>
                setState((s) => ({ ...s, auth: { ...s.auth, token: e.target.value } }))
              }
              className="mt-2 w-full rounded-lg border border-border-light bg-background-light px-3 py-1.5 font-mono text-sm text-slate-800 placeholder-slate-400 focus:border-primary focus:outline-none dark:border-border-dark dark:bg-background-dark dark:text-slate-200"
            />
          )}

          {auth.type === "basic" && (
            <div className="mt-2 flex gap-2">
              <input
                placeholder="Username"
                value={auth.username}
                onChange={(e) =>
                  setState((s) => ({ ...s, auth: { ...s.auth, username: e.target.value } }))
                }
                className="flex-1 rounded-lg border border-border-light bg-background-light px-3 py-1.5 font-mono text-sm text-slate-800 placeholder-slate-400 focus:border-primary focus:outline-none dark:border-border-dark dark:bg-background-dark dark:text-slate-200"
              />
              <input
                placeholder="Password"
                type="password"
                value={auth.password}
                onChange={(e) =>
                  setState((s) => ({ ...s, auth: { ...s.auth, password: e.target.value } }))
                }
                className="flex-1 rounded-lg border border-border-light bg-background-light px-3 py-1.5 font-mono text-sm text-slate-800 placeholder-slate-400 focus:border-primary focus:outline-none dark:border-border-dark dark:bg-background-dark dark:text-slate-200"
              />
            </div>
          )}

          {auth.type === "apikey" && (
            <div className="mt-2 flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  placeholder="Header name (e.g. X-API-Key)"
                  value={auth.keyName}
                  onChange={(e) =>
                    setState((s) => ({ ...s, auth: { ...s.auth, keyName: e.target.value } }))
                  }
                  className="flex-1 rounded-lg border border-border-light bg-background-light px-3 py-1.5 font-mono text-sm text-slate-800 placeholder-slate-400 focus:border-primary focus:outline-none dark:border-border-dark dark:bg-background-dark dark:text-slate-200"
                />
                <input
                  placeholder="Value"
                  value={auth.keyValue}
                  onChange={(e) =>
                    setState((s) => ({ ...s, auth: { ...s.auth, keyValue: e.target.value } }))
                  }
                  className="flex-1 rounded-lg border border-border-light bg-background-light px-3 py-1.5 font-mono text-sm text-slate-800 placeholder-slate-400 focus:border-primary focus:outline-none dark:border-border-dark dark:bg-background-dark dark:text-slate-200"
                />
              </div>
              <div className="flex gap-3">
                {(["header", "query"] as const).map((loc) => (
                  <label
                    key={loc}
                    className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400"
                  >
                    <input
                      type="radio"
                      checked={auth.keyIn === loc}
                      onChange={() =>
                        setState((s) => ({ ...s, auth: { ...s.auth, keyIn: loc } }))
                      }
                      className="text-primary focus:ring-primary"
                    />
                    {loc === "header" ? "Header" : "Query param"}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-b border-border-light bg-panel-light px-4 py-2 dark:border-border-dark dark:bg-panel-dark">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Options
          </span>
        </div>
        <div className="flex flex-col gap-3 px-4 py-3">
          {(
            [
              { key: "followRedirects", flag: "-L", label: "Follow redirects" },
              { key: "skipSsl", flag: "-k", label: "Skip SSL verification" },
              { key: "verbose", flag: "-v", label: "Verbose output" },
            ] as const
          ).map(({ key, flag, label }) => (
            <label key={key} className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={options[key]}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    options: { ...s.options, [key]: e.target.checked },
                  }))
                }
                className="rounded border-border-light text-primary focus:ring-primary dark:border-border-dark"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
              <code className="text-xs text-slate-400">{flag}</code>
            </label>
          ))}

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-700 dark:text-slate-300">Timeout</span>
            <input
              type="number"
              min={0}
              placeholder="—"
              value={options.timeout}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  options: { ...s.options, timeout: e.target.value },
                }))
              }
              className="w-16 rounded border border-border-light bg-background-light px-2 py-0.5 text-sm text-slate-800 focus:border-primary focus:outline-none dark:border-border-dark dark:bg-background-dark dark:text-slate-200"
            />
            <span className="text-xs text-slate-400">
              seconds <code className="text-slate-400">-m</code>
            </span>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background-light dark:bg-background-dark">
        <div className="flex min-h-[41px] shrink-0 items-center justify-between border-b border-border-light bg-panel-light px-4 py-2 dark:border-border-dark dark:bg-panel-dark">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            cURL Command
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setState(createDefaultState());
                sessionStorage.removeItem(SESSION_KEY);
              }}
              className="rounded-lg px-3 py-0.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-primary dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Reset
            </button>
            <CopyButton
              value={curlOutput || undefined}
              label="Copy"
              variant="primary"
              className="py-0.5"
            />
          </div>
        </div>

        {curlOutput ? (
          <pre className="min-h-0 flex-1 overflow-auto break-all bg-background-light p-4 font-mono text-sm whitespace-pre-wrap text-slate-700 dark:bg-background-dark dark:text-slate-300">
            {curlOutput}
          </pre>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 bg-background-light text-center dark:bg-background-dark">
            <span className="material-symbols-outlined text-[32px] text-slate-300 dark:text-slate-600">
              terminal
            </span>
            <p className="text-sm text-slate-400 dark:text-slate-600">
              Enter a URL to generate a command
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
