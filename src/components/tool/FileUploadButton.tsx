import type { ChangeEvent } from "react";

export interface FileUploadButtonProps {
  /** File type filter passed to the hidden `<input>`. Omit to accept any file. */
  accept?: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  /** Tooltip on hover and `aria-label`. Default: "Upload file" */
  label?: string;
}

export function FileUploadButton({
  accept,
  onChange,
  label = "Upload file",
}: FileUploadButtonProps) {
  return (
    <label
      title={label}
      aria-label={label}
      className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-border-light bg-panel-light text-slate-500 transition-colors hover:text-slate-700 dark:border-border-dark dark:bg-panel-dark dark:text-slate-400 dark:hover:text-slate-200"
    >
      <span className="material-symbols-outlined text-[16px] leading-none">
        upload_file
      </span>
      <input type="file" className="sr-only" accept={accept} onChange={onChange} />
    </label>
  );
}
