import { useMemo, useState, type ReactNode } from "react";
import { CopyButton } from "../../components/tool";

type MimeCategory =
  | "application"
  | "text"
  | "image"
  | "audio"
  | "video"
  | "font"
  | "multipart";

interface MimeEntry {
  ext: string;
  mime: string;
  desc: string;
  category: MimeCategory;
}

const MIME_ENTRIES: MimeEntry[] = [
  // Application
  { ext: ".pdf", mime: "application/pdf", desc: "PDF Document", category: "application" },
  { ext: ".json", mime: "application/json", desc: "JSON Data", category: "application" },
  { ext: ".jsonld", mime: "application/ld+json", desc: "JSON-LD Linked Data", category: "application" },
  { ext: ".xml", mime: "application/xml", desc: "XML Document", category: "application" },
  { ext: ".zip", mime: "application/zip", desc: "ZIP Archive", category: "application" },
  { ext: ".gz", mime: "application/gzip", desc: "Gzip Archive", category: "application" },
  { ext: ".tar", mime: "application/x-tar", desc: "Tar Archive", category: "application" },
  { ext: ".rar", mime: "application/vnd.rar", desc: "RAR Archive", category: "application" },
  { ext: ".7z", mime: "application/x-7z-compressed", desc: "7-Zip Archive", category: "application" },
  { ext: ".js", mime: "application/javascript", desc: "JavaScript", category: "application" },
  { ext: ".mjs", mime: "application/javascript", desc: "JavaScript Module", category: "application" },
  { ext: ".wasm", mime: "application/wasm", desc: "WebAssembly Binary", category: "application" },
  { ext: ".bin", mime: "application/octet-stream", desc: "Binary Data", category: "application" },
  { ext: ".exe", mime: "application/octet-stream", desc: "Windows Executable", category: "application" },
  { ext: ".dmg", mime: "application/octet-stream", desc: "macOS Disk Image", category: "application" },
  { ext: ".doc", mime: "application/msword", desc: "Word Document (Legacy)", category: "application" },
  {
    ext: ".docx",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    desc: "Word Document",
    category: "application",
  },
  { ext: ".xls", mime: "application/vnd.ms-excel", desc: "Excel Spreadsheet (Legacy)", category: "application" },
  {
    ext: ".xlsx",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    desc: "Excel Spreadsheet",
    category: "application",
  },
  { ext: ".ppt", mime: "application/vnd.ms-powerpoint", desc: "PowerPoint (Legacy)", category: "application" },
  {
    ext: ".pptx",
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    desc: "PowerPoint Presentation",
    category: "application",
  },
  {
    ext: ".odt",
    mime: "application/vnd.oasis.opendocument.text",
    desc: "ODF Text Document",
    category: "application",
  },
  {
    ext: ".ods",
    mime: "application/vnd.oasis.opendocument.spreadsheet",
    desc: "ODF Spreadsheet",
    category: "application",
  },
  {
    ext: ".odp",
    mime: "application/vnd.oasis.opendocument.presentation",
    desc: "ODF Presentation",
    category: "application",
  },
  { ext: ".epub", mime: "application/epub+zip", desc: "E-Book", category: "application" },
  { ext: ".jar", mime: "application/java-archive", desc: "Java Archive", category: "application" },
  { ext: ".rtf", mime: "application/rtf", desc: "Rich Text Format", category: "application" },
  { ext: ".atom", mime: "application/atom+xml", desc: "Atom Feed", category: "application" },
  { ext: ".rss", mime: "application/rss+xml", desc: "RSS Feed", category: "application" },
  { ext: ".toml", mime: "application/toml", desc: "TOML Config", category: "application" },
  { ext: ".pb", mime: "application/x-protobuf", desc: "Protocol Buffer", category: "application" },
  { ext: ".cbor", mime: "application/cbor", desc: "CBOR Binary", category: "application" },

  // Text
  { ext: ".html", mime: "text/html", desc: "HTML Document", category: "text" },
  { ext: ".htm", mime: "text/html", desc: "HTML Document", category: "text" },
  { ext: ".css", mime: "text/css", desc: "CSS Stylesheet", category: "text" },
  { ext: ".csv", mime: "text/csv", desc: "CSV Spreadsheet", category: "text" },
  { ext: ".tsv", mime: "text/tab-separated-values", desc: "Tab-Separated Values", category: "text" },
  { ext: ".txt", mime: "text/plain", desc: "Plain Text", category: "text" },
  { ext: ".md", mime: "text/markdown", desc: "Markdown", category: "text" },
  { ext: ".yaml", mime: "application/yaml", desc: "YAML", category: "text" },
  { ext: ".yml", mime: "application/yaml", desc: "YAML", category: "text" },
  { ext: ".sh", mime: "text/x-sh", desc: "Shell Script", category: "text" },
  { ext: ".ics", mime: "text/calendar", desc: "iCalendar", category: "text" },
  { ext: ".vcf", mime: "text/vcard", desc: "vCard Contact", category: "text" },
  { ext: ".diff", mime: "text/x-diff", desc: "Diff / Patch", category: "text" },
  { ext: ".patch", mime: "text/x-diff", desc: "Diff / Patch", category: "text" },
  { ext: ".sql", mime: "text/x-sql", desc: "SQL Query", category: "text" },

  // Image
  { ext: ".jpg", mime: "image/jpeg", desc: "JPEG Image", category: "image" },
  { ext: ".jpeg", mime: "image/jpeg", desc: "JPEG Image", category: "image" },
  { ext: ".png", mime: "image/png", desc: "PNG Image", category: "image" },
  { ext: ".gif", mime: "image/gif", desc: "GIF Image", category: "image" },
  { ext: ".webp", mime: "image/webp", desc: "WebP Image", category: "image" },
  { ext: ".svg", mime: "image/svg+xml", desc: "SVG Vector Image", category: "image" },
  { ext: ".ico", mime: "image/x-icon", desc: "Icon", category: "image" },
  { ext: ".bmp", mime: "image/bmp", desc: "Bitmap Image", category: "image" },
  { ext: ".tiff", mime: "image/tiff", desc: "TIFF Image", category: "image" },
  { ext: ".tif", mime: "image/tiff", desc: "TIFF Image", category: "image" },
  { ext: ".avif", mime: "image/avif", desc: "AVIF Image", category: "image" },
  { ext: ".heic", mime: "image/heic", desc: "HEIC Image", category: "image" },
  { ext: ".heif", mime: "image/heif", desc: "HEIF Image", category: "image" },

  // Audio
  { ext: ".mp3", mime: "audio/mpeg", desc: "MP3 Audio", category: "audio" },
  { ext: ".ogg", mime: "audio/ogg", desc: "OGG Audio", category: "audio" },
  { ext: ".wav", mime: "audio/wav", desc: "WAV Audio", category: "audio" },
  { ext: ".aac", mime: "audio/aac", desc: "AAC Audio", category: "audio" },
  { ext: ".flac", mime: "audio/flac", desc: "FLAC Audio", category: "audio" },
  { ext: ".m4a", mime: "audio/mp4", desc: "M4A Audio", category: "audio" },
  { ext: ".opus", mime: "audio/opus", desc: "Opus Audio", category: "audio" },
  { ext: ".mid", mime: "audio/midi", desc: "MIDI", category: "audio" },
  { ext: ".midi", mime: "audio/midi", desc: "MIDI", category: "audio" },
  { ext: ".weba", mime: "audio/webm", desc: "WebM Audio", category: "audio" },

  // Video
  { ext: ".mp4", mime: "video/mp4", desc: "MP4 Video", category: "video" },
  { ext: ".webm", mime: "video/webm", desc: "WebM Video", category: "video" },
  { ext: ".avi", mime: "video/x-msvideo", desc: "AVI Video", category: "video" },
  { ext: ".mov", mime: "video/quicktime", desc: "QuickTime Video", category: "video" },
  { ext: ".mkv", mime: "video/x-matroska", desc: "Matroska Video", category: "video" },
  { ext: ".ogv", mime: "video/ogg", desc: "OGG Video", category: "video" },
  { ext: ".m4v", mime: "video/x-m4v", desc: "M4V Video", category: "video" },
  { ext: ".3gp", mime: "video/3gpp", desc: "3GP Video", category: "video" },
  { ext: ".flv", mime: "video/x-flv", desc: "Flash Video", category: "video" },
  { ext: ".ts", mime: "video/mp2t", desc: "MPEG-2 Transport Stream", category: "video" },

  // Font
  { ext: ".woff", mime: "font/woff", desc: "Web Font (WOFF)", category: "font" },
  { ext: ".woff2", mime: "font/woff2", desc: "Web Font (WOFF2)", category: "font" },
  { ext: ".ttf", mime: "font/ttf", desc: "TrueType Font", category: "font" },
  { ext: ".otf", mime: "font/otf", desc: "OpenType Font", category: "font" },
  {
    ext: ".eot",
    mime: "application/vnd.ms-fontobject",
    desc: "Embedded OpenType Font",
    category: "application",
  },

  // Multipart / form payloads
  { ext: "—", mime: "multipart/form-data", desc: "Form File Upload", category: "multipart" },
  {
    ext: "—",
    mime: "application/x-www-form-urlencoded",
    desc: "URL-Encoded Form Data",
    category: "multipart",
  },
];

const CATEGORY_PILLS: { id: MimeCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "application", label: "Application" },
  { id: "text", label: "Text" },
  { id: "image", label: "Image" },
  { id: "audio", label: "Audio" },
  { id: "video", label: "Video" },
  { id: "font", label: "Font" },
  { id: "multipart", label: "Multipart" },
];

const CATEGORY_LABELS: Record<MimeCategory, string> = {
  application: "Application",
  text: "Text",
  image: "Image",
  audio: "Audio",
  video: "Video",
  font: "Font",
  multipart: "Multipart",
};

const CATEGORY_ORDER: MimeCategory[] = [
  "application",
  "text",
  "image",
  "audio",
  "video",
  "font",
  "multipart",
];

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

function MimeRow({ entry }: { entry: MimeEntry }) {
  return (
    <div className="group flex items-center gap-3 border-b border-border-light/60 px-4 py-2 transition-colors hover:bg-slate-50 dark:border-border-dark/60 dark:hover:bg-panel-dark/60">
      <span className="w-24 shrink-0 font-mono text-xs font-medium text-slate-700 dark:text-slate-300">
        {entry.ext}
      </span>
      <span className="min-w-0 flex-1 truncate font-mono text-sm text-primary">
        {entry.mime}
      </span>
      <span className="hidden w-56 shrink-0 truncate text-sm text-slate-500 dark:text-slate-400 sm:block">
        {entry.desc}
      </span>
      <CopyButton
        value={entry.mime}
        variant="icon"
        aria-label={`Copy ${entry.mime}`}
        className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
      />
    </div>
  );
}

export default function MimeLookupTool() {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<MimeCategory | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\./, "");
    return MIME_ENTRIES.filter((e) => {
      const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
      const matchesQuery =
        !q ||
        e.ext.toLowerCase().includes(q) ||
        e.mime.toLowerCase().includes(q) ||
        e.desc.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [query, categoryFilter]);

  const sections = useMemo(() => {
    if (categoryFilter !== "all") return null;
    return CATEGORY_ORDER.map((cat) => ({
      cat,
      items: filtered.filter((e) => e.category === cat),
    })).filter(({ items }) => items.length > 0);
  }, [filtered, categoryFilter]);

  return (
    <div className="flex h-full flex-col bg-background-light font-display text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <div className="sticky top-0 z-10 shrink-0 border-b border-border-light bg-panel-light px-4 py-3 dark:border-border-dark dark:bg-panel-dark">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <input
            type="search"
            className="min-w-0 flex-1 rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm dark:border-border-dark dark:bg-background-dark"
            placeholder="Search by extension, MIME type, or description…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            aria-label="Search MIME types"
          />
          <div className="flex flex-wrap gap-2">
            {CATEGORY_PILLS.map((p) => (
              <OptionPill
                key={p.id}
                active={categoryFilter === p.id}
                onClick={() => setCategoryFilter(p.id)}
              >
                {p.label}
              </OptionPill>
            ))}
          </div>
        </div>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex h-full min-h-[200px] items-center justify-center px-4 text-sm text-slate-500 dark:text-slate-400">
            No MIME types match your search.
          </div>
        ) : categoryFilter !== "all" ? (
          <>
            <div className="sticky top-0 z-[1] flex border-b border-border-light bg-panel-light/95 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:border-border-dark dark:bg-panel-dark/95">
              <span className="w-24 shrink-0">Extension</span>
              <span className="flex-1">MIME Type</span>
              <span className="hidden w-56 shrink-0 sm:block">Description</span>
              <span className="w-8 shrink-0" aria-hidden />
            </div>
            {filtered.map((e) => (
              <MimeRow key={`${e.ext}-${e.mime}`} entry={e} />
            ))}
          </>
        ) : sections ? (
          <>
            <div className="sticky top-0 z-[1] flex border-b border-border-light bg-panel-light/95 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:border-border-dark dark:bg-panel-dark/95">
              <span className="w-24 shrink-0">Extension</span>
              <span className="flex-1">MIME Type</span>
              <span className="hidden w-56 shrink-0 sm:block">Description</span>
              <span className="w-8 shrink-0" aria-hidden />
            </div>
            {sections.map(({ cat, items }) => (
              <div key={cat}>
                <div className="border-b border-border-light bg-slate-50 px-4 py-1.5 text-xs font-semibold text-slate-500 dark:border-border-dark dark:bg-panel-dark/60 dark:text-slate-400">
                  {CATEGORY_LABELS[cat]}
                </div>
                {items.map((e) => (
                  <MimeRow key={`${e.ext}-${e.mime}`} entry={e} />
                ))}
              </div>
            ))}
          </>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-border-light px-4 py-2 text-xs text-slate-400 dark:border-border-dark dark:text-slate-500">
        {filtered.length} of {MIME_ENTRIES.length} types
      </div>
    </div>
  );
}
