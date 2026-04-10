# src/tools — React Tool Component Quick Reference

> Loaded when working on tool UIs. See root CLAUDE.md for full project context.

## File structure

Each tool lives in `src/tools/<tool-id>/index.tsx` (default export).  
Register a lazy import in `src/registry/index.ts`.

## Auto-run tool pattern (most tools)

```tsx
const DEBOUNCE_MS = 150;       // computation
const HISTORY_DEBOUNCE_MS = 1500; // history capture

// Draft persistence
const { setDraft } = useDraftInput(TOOL_ID);
const [input, setInput] = useState("");
useRestoreStringDraft(TOOL_ID, setInput);

// Fast call (no history)
await callTool(RUST_COMMAND, payload, { skipHistory: true });

// Slow history debounce (separate timer)
await callTool(RUST_COMMAND, payload); // records history
```

See `src/tools/base64/` for the canonical reference.

## Sensitive tool pattern (secrets/credentials)

```tsx
// NO useDraftInput, NO useRestoreStringDraft
// NO history debounce — every callTool gets skipHistory: true
await callTool(RUST_COMMAND, payload, { skipHistory: true });
```

Sensitive tools: JWT, AES, TOTP, Password, Basic Auth.  
`sensitive: true` in registry → bridge skips history automatically, but still pass `skipHistory: true` explicitly on every call.

## Shared components (import from `../../components/tool`)

- `CopyButton` — standard copy with check animation. Always use this, never a custom button.
- `PanelHeader` — split-panel header with `min-h-[41px]` baked in. Use for all split-panel tools.

## Split-panel layout (formatter tools)

```tsx
<div className="flex-1 flex flex-col md:flex-row overflow-hidden">
  {/* Left */}
  <div className="flex flex-col flex-1 min-w-0 border-b md:border-b-0 md:border-r border-border-light dark:border-border-dark">
    <div className="flex items-center justify-between px-4 py-2 border-b ... shrink-0 min-h-[41px]">
      {/* header with optional upload button py-0.5 */}
    </div>
    <textarea className="flex-1 resize-none ..." />
  </div>
  {/* Right */}
  <div className="flex flex-col flex-1 min-w-0">
    <div className="flex items-center justify-between px-4 py-2 border-b ... shrink-0 min-h-[41px]">
      {/* header + CopyButton */}
    </div>
    <div className="flex-1 overflow-auto custom-scrollbar ...">
      {/* output */}
    </div>
  </div>
</div>
```

Key: both panel headers need `min-h-[41px]`; upload buttons need `py-0.5` (not `py-1`).

## Footer / options bar pattern

```tsx
<div className="flex flex-wrap items-start gap-x-6 gap-y-3 px-4 py-3 border-t ...">
  <div>
    <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">Label</div>
    <div className="flex gap-1">
      {options.map(o => <OptionPill key={o} active={selected === o} onClick={() => setSelected(o)}>{o}</OptionPill>)}
    </div>
  </div>
  <div className="hidden md:block w-px self-stretch bg-border-light dark:border-border-dark" />
  {/* more option groups */}
  <div className="ml-auto"><CopyButton text={output} /></div>
</div>
```

## OptionPill helper (local to tool file)

```tsx
function OptionPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
        active
          ? "bg-primary/10 text-primary border-primary/30"
          : "bg-transparent text-slate-500 border-border-light dark:border-border-dark hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}
```

## Empty / loading / error states

```tsx
// Empty (centered in output panel)
<div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
  Output will appear here
</div>

// Loading
<div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
  <span className="animate-pulse">Processing…</span>
</div>

// Error (inline, red)
<div className="flex-1 flex items-center justify-center p-4">
  <p className="text-red-500 text-sm font-mono">{error}</p>
</div>
```

## Tray popover tools

Add `trayPopover: true` in the registry entry for tools that make sense in the mini popover (fast, text-in/text-out). The tool should work without any options pre-selection needed.
