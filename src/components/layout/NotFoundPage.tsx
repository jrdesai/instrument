import { Link } from "react-router-dom";

interface NotFoundPageProps {
  title?: string;
  message?: string;
  linkText?: string;
  linkTo?: string;
}

/**
 * 404 page displayed for unknown routes or missing tools.
 */
export function NotFoundPage({
  title = "Page not found",
  message = "This page doesn't exist — it may have moved.",
  linkText = "Back to home",
  linkTo = "/",
}: NotFoundPageProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-background-light px-8 text-center dark:bg-background-dark">
      <span
        className="material-symbols-outlined text-[40px] text-slate-300 dark:text-slate-600"
        aria-hidden
      >
        search_off
      </span>
      <h1 className="text-base font-semibold text-slate-800 dark:text-slate-100">
        {title}
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {message}
      </p>
      <Link
        to={linkTo}
        className="mt-2 shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
      >
        {linkText}
      </Link>
    </div>
  );
}
