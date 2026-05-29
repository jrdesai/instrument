import type { Tool } from "../../registry";

/**
 * Shown for tools that send data off the device over the network (e.g. DNS
 * Lookup). Renders nothing for fully-local tools, so it can sit alongside
 * StorageBadge in the tool header without affecting the common case.
 */
export function NetworkBadge({ tool }: { tool: Tool }) {
  if (!tool.network) return null;

  return (
    <span
      title="Uses the network: data you enter is sent off your device. All other tools run entirely locally."
      className="inline-flex cursor-default select-none items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-sky-600 dark:border-sky-800/40 dark:bg-sky-900/20 dark:text-sky-400"
    >
      <span className="material-symbols-outlined text-[11px]" aria-hidden>
        public
      </span>
      Uses network
    </span>
  );
}
