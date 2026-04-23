/** App brand mark — matches the >I app icon. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400 to-sky-400 ${className ?? ""}`}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" width="22" height="22" fill="none">
        <path
          d="M 4 5 L 16 16 L 4 27"
          stroke="white" strokeWidth="3.5"
          strokeLinecap="round" strokeLinejoin="round"
        />
        <rect x="20" y="5" width="3.5" height="22" rx="1.75" fill="white"/>
      </svg>
    </div>
  );
}
