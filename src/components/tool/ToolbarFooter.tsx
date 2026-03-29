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
    <div className="mx-3 h-6 w-px shrink-0 self-center bg-border-light dark:bg-border-dark" />
  );
}

export function ToolbarFooter({ groups, className }: ToolbarFooterProps) {
  return (
    <footer
      className={twMerge(
        "flex shrink-0 flex-wrap items-end gap-2 border-t border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark px-4 py-3",
        className
      )}
    >
      {groups.map((group, i) => (
        <Fragment key={group.label ?? group.ariaLabel ?? `group-${i}`}>
          {i > 0 && <Divider />}
          <div
            className={twMerge(
              "flex flex-col gap-1",
              group.end ? "ml-auto" : ""
            )}
            role="group"
            aria-label={group.ariaLabel ?? group.label}
          >
            {group.label && (
              <span className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-500">
                {group.label}
              </span>
            )}
            <div className="flex items-center gap-1.5">{group.children}</div>
          </div>
        </Fragment>
      ))}
    </footer>
  );
}
