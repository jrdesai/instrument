import { Fragment, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export interface FooterGroup {
  /** Optional label rendered above the button row — uppercase, small */
  label?: string;
  /** Accessible name for the group (falls back to `label` when set). */
  ariaLabel?: string;
  children: ReactNode;
  /** If true, this group is pushed to the right end */
  end?: boolean;
}

interface ToolbarFooterProps {
  groups: FooterGroup[];
  className?: string;
}

function Divider() {
  return (
    <div
      className="mx-3 w-px shrink-0 self-stretch bg-border-light dark:bg-border-dark"
      aria-hidden
    />
  );
}

export function ToolbarFooter({ groups, className }: ToolbarFooterProps) {
  return (
    <footer
      className={twMerge(
        "flex shrink-0 flex-wrap items-start gap-y-2 border-t border-border-light bg-panel-light px-4 py-3 dark:border-border-dark dark:bg-panel-dark",
        className
      )}
    >
      {groups.map((group, i) => (
        <Fragment key={group.label ?? group.ariaLabel ?? `group-${i}`}>
          {i > 0 && <Divider />}
          <div
            className={twMerge(
              "flex min-w-0 flex-col gap-1",
              group.end ? "ml-auto" : ""
            )}
            role="group"
            aria-label={group.ariaLabel ?? group.label}
          >
            <span
              className={twMerge(
                "block h-4 text-[10px] font-semibold uppercase leading-4 tracking-wider text-slate-600 dark:text-slate-500",
                !group.label && "invisible select-none"
              )}
            >
              {group.label ?? "\u00A0"}
            </span>
            <div className="flex min-h-[2.25rem] flex-wrap items-center gap-1.5">
              {group.children}
            </div>
          </div>
        </Fragment>
      ))}
    </footer>
  );
}
