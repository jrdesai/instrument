import { useCallback, useRef, useState, type DragEvent } from "react";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB hard limit

/** Same semantics as `<input accept>` — extensions (`.json`), MIME types, or `type/*`. */
function fileMatchesAccept(file: File, accept: string): boolean {
  return accept.split(",").some((token) => {
    const t = token.trim().toLowerCase();
    if (t.startsWith(".")) {
      return file.name.toLowerCase().endsWith(t);
    }
    if (t.endsWith("/*")) {
      return file.type.startsWith(t.slice(0, -1));
    }
    return file.type === t;
  });
}

export type UseFileDropOptions =
  | {
      onError?: (message: string) => void;
      onFile: (text: string, filename: string) => void;
      onFileRaw?: undefined;
      /** Optional: comma-separated extensions or MIME types, e.g. `.json,.txt` or `text/plain`. */
      accept?: string;
    }
  | {
      onError?: (message: string) => void;
      onFile?: undefined;
      onFileRaw: (file: File) => void;
      accept?: string;
    };

export interface UseFileDropReturn {
  isDragging: boolean;
  dropZoneProps: {
    onDragEnter: (e: DragEvent) => void;
    onDragOver: (e: DragEvent) => void;
    onDragLeave: (e: DragEvent) => void;
    onDrop: (e: DragEvent) => void;
  };
}

export function useFileDrop(opts: UseFileDropOptions): UseFileDropReturn {
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const onDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (dragCounter.current === 1) setIsDragging(true);
  }, []);

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (!file) return;

      if (e.dataTransfer.files.length > 1) {
        optsRef.current.onError?.(
          `Multiple files dropped — only the first file ("${file.name}") was used.`
        );
      }

      if (file.size > MAX_BYTES) {
        optsRef.current.onError?.(
          `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 2 MB.`
        );
        return;
      }

      const accept = optsRef.current.accept;
      if (accept && !fileMatchesAccept(file, accept)) {
        optsRef.current.onError?.(`File type not accepted. Expected: ${accept}`);
        return;
      }

      const o = optsRef.current;
      if ("onFileRaw" in o && o.onFileRaw) {
        o.onFileRaw(file);
        return;
      }

      const onFile = "onFile" in o ? o.onFile : undefined;
      if (!onFile) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result;
        if (typeof text === "string") {
          onFile(text, file.name);
        }
      };
      reader.onerror = () => {
        optsRef.current.onError?.("Failed to read file.");
      };
      reader.readAsText(file);
    },
    []
  );

  return {
    isDragging,
    dropZoneProps: { onDragEnter, onDragOver, onDragLeave, onDrop },
  };
}
