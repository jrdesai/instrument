/** App brand mark (angled brackets). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white ${className ?? ""}`}
      aria-hidden
    >
      ⟨/⟩
    </div>
  );
}
