import { useEffect, useMemo, useRef, useState } from "react";
import { useBookmarkStore, useToolStore } from "../../store";

interface BookmarkButtonProps {
  toolId: string;
}

const MAX_BOOKMARKS_PER_TOOL = 10;

export function BookmarkButton({ toolId }: BookmarkButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [bookmarkName, setBookmarkName] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const allBookmarks = useBookmarkStore((s) => s.bookmarks);
  const addBookmark = useBookmarkStore((s) => s.addBookmark);
  const deleteBookmark = useBookmarkStore((s) => s.deleteBookmark);
  const draftString = useToolStore((s) => {
    const raw = s.draftInputs[toolId];
    return typeof raw === "string" ? raw : "";
  });

  const toolBookmarks = useMemo(
    () => allBookmarks.filter((b) => b.toolId === toolId),
    [allBookmarks, toolId]
  );
  const isAtCap = toolBookmarks.length >= MAX_BOOKMARKS_PER_TOOL;
  const reversedBookmarks = useMemo(
    () => [...toolBookmarks].reverse(),
    [toolBookmarks]
  );

  useEffect(() => {
    if (!isOpen) return;
    function handleOutsideClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  function getCurrentDraft(): string {
    const raw = useToolStore.getState().draftInputs[toolId];
    return typeof raw === "string" ? raw : "";
  }

  function handleSave() {
    const value = getCurrentDraft();
    if (!value.trim() || isAtCap) return;
    addBookmark(toolId, bookmarkName.trim() || "Untitled", value);
    setBookmarkName("");
  }

  function handleRestore(value: string) {
    useToolStore.getState().setPendingRestoreInput(toolId, value);
    setIsOpen(false);
  }

  const hasDraftValue = draftString.trim().length > 0;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-label="Input bookmarks"
        title="Input bookmarks"
        className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
      >
        <span className="material-symbols-outlined text-[22px]">bookmarks</span>
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-full mt-2 w-72 z-50 rounded-xl border border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark shadow-xl p-3">
          {!isAtCap ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Save current input
              </p>
              <input
                type="text"
                value={bookmarkName}
                onChange={(e) => setBookmarkName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSave();
                  }
                }}
                placeholder="Bookmark name…"
                className="w-full rounded-md border border-border-light dark:border-border-dark bg-white dark:bg-background-dark px-2 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!hasDraftValue || isAtCap}
                  className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Limit reached (10/10). Delete one to save more.
            </p>
          )}

          {toolBookmarks.length > 0 ? (
            <>
              <div className="mt-3 mb-2 flex items-center gap-2">
                <div className="flex-1 border-t border-border-light dark:border-border-dark" />
                <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Saved ({toolBookmarks.length}/10)
                </span>
                <div className="flex-1 border-t border-border-light dark:border-border-dark" />
              </div>
              <ul className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar">
                {reversedBookmarks.map((bookmark) => (
                  <li
                    key={bookmark.id}
                    className="flex items-center gap-2 rounded-md px-1 py-1 text-sm"
                  >
                    <span className="flex-1 min-w-0 truncate text-slate-700 dark:text-slate-300">
                      {bookmark.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRestore(bookmark.value)}
                      className="text-xs text-primary hover:underline"
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteBookmark(bookmark.id)}
                      aria-label={`Delete bookmark ${bookmark.name}`}
                      className="text-xs text-slate-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              No saved inputs yet
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
