import { useMemo, useState, type ReactNode } from "react";
import { CopyButton } from "../../components/tool";

interface StatusCode {
  code: number;
  name: string;
  description: string;
}

const STATUS_CODES: StatusCode[] = [
  { code: 100, name: "Continue", description: "Server received request headers; client should proceed." },
  { code: 101, name: "Switching Protocols", description: "Server agrees to switch protocols as requested." },
  { code: 102, name: "Processing", description: "Server received and is processing the request (WebDAV)." },
  { code: 103, name: "Early Hints", description: "Preload headers sent before final response." },
  { code: 200, name: "OK", description: "Request succeeded." },
  { code: 201, name: "Created", description: "Request succeeded and a new resource was created." },
  { code: 202, name: "Accepted", description: "Request received but not yet processed." },
  {
    code: 203,
    name: "Non-Authoritative Information",
    description: "Response from a proxy, not origin.",
  },
  { code: 204, name: "No Content", description: "Success with no response body." },
  { code: 205, name: "Reset Content", description: "Client should reset the document view." },
  { code: 206, name: "Partial Content", description: "Partial content returned (range request)." },
  { code: 207, name: "Multi-Status", description: "Multiple statuses for multiple resources (WebDAV)." },
  { code: 208, name: "Already Reported", description: "Members already enumerated (WebDAV)." },
  {
    code: 226,
    name: "IM Used",
    description: "Response is result of instance-manipulation (Delta encoding).",
  },
  { code: 300, name: "Multiple Choices", description: "Multiple possible responses; client must choose." },
  { code: 301, name: "Moved Permanently", description: "Resource permanently moved to new URL." },
  { code: 302, name: "Found", description: "Resource temporarily at a different URL." },
  { code: 303, name: "See Other", description: "Redirect to a different resource with GET." },
  { code: 304, name: "Not Modified", description: "Cached version is still valid; no body returned." },
  {
    code: 307,
    name: "Temporary Redirect",
    description: "Temporary redirect; same method must be used.",
  },
  {
    code: 308,
    name: "Permanent Redirect",
    description: "Permanent redirect; same method must be used.",
  },
  { code: 400, name: "Bad Request", description: "Request malformed or invalid." },
  { code: 401, name: "Unauthorized", description: "Authentication required." },
  {
    code: 402,
    name: "Payment Required",
    description: "Reserved for future use; used by some APIs.",
  },
  { code: 403, name: "Forbidden", description: "Authenticated but not authorized." },
  { code: 404, name: "Not Found", description: "Resource does not exist." },
  {
    code: 405,
    name: "Method Not Allowed",
    description: "HTTP method not supported for this endpoint.",
  },
  { code: 406, name: "Not Acceptable", description: "No content matching Accept headers." },
  {
    code: 407,
    name: "Proxy Authentication Required",
    description: "Authenticate with proxy first.",
  },
  { code: 408, name: "Request Timeout", description: "Client took too long to send the request." },
  {
    code: 409,
    name: "Conflict",
    description: "Request conflicts with current state of the resource.",
  },
  {
    code: 410,
    name: "Gone",
    description: "Resource permanently deleted; no forwarding address.",
  },
  { code: 411, name: "Length Required", description: "Content-Length header required." },
  {
    code: 412,
    name: "Precondition Failed",
    description: "Conditional request precondition not met.",
  },
  { code: 413, name: "Content Too Large", description: "Request body exceeds server limit." },
  { code: 414, name: "URI Too Long", description: "Request URI exceeds server limit." },
  { code: 415, name: "Unsupported Media Type", description: "Content-Type not supported." },
  { code: 416, name: "Range Not Satisfiable", description: "Requested range cannot be served." },
  { code: 417, name: "Expectation Failed", description: "Expect header cannot be met." },
  {
    code: 418,
    name: "I'm a Teapot",
    description: "April Fools RFC 2324; returned by teapots.",
  },
  {
    code: 421,
    name: "Misdirected Request",
    description: "Request sent to wrong server.",
  },
  {
    code: 422,
    name: "Unprocessable Content",
    description: "Semantically invalid (e.g. validation errors).",
  },
  { code: 423, name: "Locked", description: "Resource is locked (WebDAV)." },
  {
    code: 424,
    name: "Failed Dependency",
    description: "Previous request in the batch failed (WebDAV).",
  },
  {
    code: 425,
    name: "Too Early",
    description: "Server unwilling to process potentially replayed request.",
  },
  {
    code: 426,
    name: "Upgrade Required",
    description: "Client must upgrade to a different protocol.",
  },
  {
    code: 428,
    name: "Precondition Required",
    description: "Request must be conditional.",
  },
  {
    code: 429,
    name: "Too Many Requests",
    description: "Rate limit exceeded; slow down.",
  },
  {
    code: 431,
    name: "Request Header Fields Too Large",
    description: "Headers too large.",
  },
  {
    code: 451,
    name: "Unavailable For Legal Reasons",
    description: "Content blocked for legal reasons.",
  },
  { code: 500, name: "Internal Server Error", description: "Generic server-side error." },
  {
    code: 501,
    name: "Not Implemented",
    description: "Server does not support the request method.",
  },
  {
    code: 502,
    name: "Bad Gateway",
    description: "Upstream server returned an invalid response.",
  },
  {
    code: 503,
    name: "Service Unavailable",
    description: "Server overloaded or under maintenance.",
  },
  { code: 504, name: "Gateway Timeout", description: "Upstream server timed out." },
  {
    code: 505,
    name: "HTTP Version Not Supported",
    description: "HTTP version not supported.",
  },
  {
    code: 506,
    name: "Variant Also Negotiates",
    description: "Server configuration error (content negotiation).",
  },
  {
    code: 507,
    name: "Insufficient Storage",
    description: "Server cannot store the required data (WebDAV).",
  },
  { code: 508, name: "Loop Detected", description: "Infinite loop detected (WebDAV)." },
  {
    code: 510,
    name: "Not Extended",
    description: "Further extensions required to fulfil the request.",
  },
  {
    code: 511,
    name: "Network Authentication Required",
    description: "Client must authenticate to access network.",
  },
];

const SERIES_LABEL: Record<number, string> = {
  1: "Informational",
  2: "Success",
  3: "Redirection",
  4: "Client Errors",
  5: "Server Errors",
};

type GroupFilter = "all" | "1xx" | "2xx" | "3xx" | "4xx" | "5xx";

function seriesFromCode(code: number): number {
  return Math.floor(code / 100);
}

function badgeClass(code: number): string {
  const s = seriesFromCode(code);
  switch (s) {
    case 1:
      return "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
    case 2:
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case 3:
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case 4:
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case 5:
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
  }
}

function OptionPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border-light text-slate-500 hover:bg-slate-100 dark:border-border-dark dark:text-slate-400 dark:hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

function StatusRow({ s }: { s: StatusCode }) {
  return (
    <div
      className="group flex items-center gap-3 border-b border-border-light/60 px-4 py-2 transition-colors hover:bg-slate-50 dark:border-border-dark/60 dark:hover:bg-panel-dark/60"
    >
      <span
        className={`w-12 shrink-0 rounded-full px-2 py-0.5 text-center font-mono text-xs font-bold ${badgeClass(s.code)}`}
      >
        {s.code}
      </span>
      <span className="w-48 shrink-0 font-medium text-slate-800 dark:text-slate-100">{s.name}</span>
      <span className="min-w-0 flex-1 text-sm text-slate-500 dark:text-slate-400">{s.description}</span>
      <CopyButton
        value={String(s.code)}
        variant="icon"
        aria-label={`Copy status code ${s.code}`}
        className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
      />
    </div>
  );
}

export default function HttpStatusCodesTool() {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<GroupFilter>("all");

  const filtered = useMemo(() => {
    return STATUS_CODES.filter((s) => {
      const matchesGroup =
        group === "all" || String(s.code).startsWith(group[0]);
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        String(s.code).includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q);
      return matchesGroup && matchesQuery;
    });
  }, [query, group]);

  const sections = useMemo(() => {
    if (group !== "all") return null;
    const result: { series: number; items: StatusCode[] }[] = [];
    for (const series of [1, 2, 3, 4, 5] as const) {
      const items = filtered.filter((s) => seriesFromCode(s.code) === series);
      if (items.length > 0) {
        result.push({ series, items });
      }
    }
    return result;
  }, [filtered, group]);

  const groupPills: { id: GroupFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "1xx", label: "1xx" },
    { id: "2xx", label: "2xx" },
    { id: "3xx", label: "3xx" },
    { id: "4xx", label: "4xx" },
    { id: "5xx", label: "5xx" },
  ];

  return (
    <div className="flex h-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
      <div className="sticky top-0 z-10 shrink-0 border-b border-border-light bg-panel-light px-4 py-3 dark:border-border-dark dark:bg-panel-dark">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <input
            type="search"
            className="min-w-0 flex-1 rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm dark:border-border-dark dark:bg-background-dark"
            placeholder="Search by code or description…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search status codes"
          />
          <div className="flex flex-wrap gap-2">
            {groupPills.map((p) => (
              <OptionPill key={p.id} active={group === p.id} onClick={() => setGroup(p.id)}>
                {p.label}
              </OptionPill>
            ))}
          </div>
        </div>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex h-full min-h-[200px] items-center justify-center px-4 text-sm text-slate-500 dark:text-slate-400">
            No status codes match your search.
          </div>
        ) : group === "all" && sections ? (
          <>
            <div className="sticky top-0 z-[1] flex border-b border-border-light bg-panel-light/95 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:border-border-dark dark:bg-panel-dark/95">
              <span className="w-12 shrink-0">Code</span>
              <span className="w-48 shrink-0">Name</span>
              <span className="flex-1">Description</span>
              <span className="w-8 shrink-0" aria-hidden />
            </div>
            {sections.map(({ series, items }) => (
              <div key={series}>
                <div className="flex items-baseline justify-between px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <span>
                    {series}xx {SERIES_LABEL[series]}
                  </span>
                  <span className="tabular-nums">({items.length})</span>
                </div>
                {items.map((s) => (
                  <StatusRow key={s.code} s={s} />
                ))}
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="sticky top-0 z-[1] flex border-b border-border-light bg-panel-light/95 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:border-border-dark dark:bg-panel-dark/95">
              <span className="w-12 shrink-0">Code</span>
              <span className="w-48 shrink-0">Name</span>
              <span className="flex-1">Description</span>
              <span className="w-8 shrink-0" aria-hidden />
            </div>
            {filtered.map((s) => (
              <StatusRow key={s.code} s={s} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
