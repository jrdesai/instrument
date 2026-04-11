import { useCallback, useRef, useState, type DragEvent } from "react";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB hard limit

export type UseFileDropOptions =
  | {
      onError?: (message: string) => void;
      onFile: (text: string, filename: string) => void;
      onFileRaw?: undefined;
    }
  | {
      onError?: (message: string) => void;
      onFile?: undefined;
      onFileRaw: (file: File) => void;
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

      if (file.size > MAX_BYTES) {
        optsRef.current.onError?.(
          `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 2 MB.`
        );
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
      reader.readAsText(file);
    },
    []
  );

  return {
    isDragging,
    dropZoneProps: { onDragEnter, onDragOver, onDragLeave, onDrop },
  };
}
