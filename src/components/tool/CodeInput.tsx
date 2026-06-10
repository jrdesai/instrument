import { useMemo, useRef, type ChangeEvent } from "react";

export interface CodeInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  ariaLabel: string;
  readOnly?: boolean;
  /** Extra classes for the outer wrapper (e.g. flex-1 min-h-0). */
  className?: string;
}

export function CodeInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  readOnly,
  className,
}: CodeInputProps) {
  const gutterRef = useRef<HTMLPreElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lineNumbers = useMemo(() => {
    const n = Math.max(1, value.split("\n").length);
    let out = "1";
    for (let i = 2; i <= n; i++) out += "\n" + i;
    return out;
  }, [value]);

  const syncScroll = () => {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  return (
    <div className={`flex min-h-0 overflow-hidden ${className ?? ""}`}>
      <pre
        ref={gutterRef}
        aria-hidden
        className="shrink-0 select-none overflow-hidden py-4 pl-3 pr-2 text-right font-mono text-xs leading-relaxed text-slate-400 dark:text-slate-600"
      >
        {lineNumbers}
      </pre>
      <textarea
        ref={textareaRef}
        wrap="off"
        spellCheck={false}
        onScroll={syncScroll}
        aria-label={ariaLabel}
        className="min-w-0 flex-1 resize-none overflow-auto border-none bg-transparent py-4 pr-4 font-mono text-xs leading-relaxed text-slate-700 placeholder:text-slate-500 focus:outline-none dark:text-slate-300"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
      />
    </div>
  );
}
