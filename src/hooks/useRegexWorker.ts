import { useCallback, useEffect, useRef } from "react";
import { callTool, isDesktop } from "../bridge";
import { unwrapSpectaCommandResult } from "./unwrapSpectaCommandResult";

export type MatchResult = {
  start: number;
  end: number;
  value: string;
  groups: string[];
};

type RegexRequest = {
  pattern: string;
  text: string;
  engine: string;
  flags?: string;
};

type WorkerCallback = (result: MatchResult[] | null, error?: string) => void;

type WorkerMessage = {
  id: string;
  success: boolean;
  result?: MatchResult[];
  error?: string;
};

/** Raw match from Rust/WASM has groups as (string | null)[]. */
type RawMatchResult = {
  start: number;
  end: number;
  value: string;
  groups?: (string | null)[];
};

/** Normalise null group values to empty strings so consumers always get string[]. */
function normaliseGroups(
  results: Array<{
    start: number;
    end: number;
    value: string;
    groups?: (string | null)[] | string[];
  }>
): MatchResult[] {
  return results.map((m) => ({
    ...m,
    groups: (m.groups ?? []).map((g) => g ?? ""),
  }));
}

export function useRegexWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<string, WorkerCallback>>(new Map());

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/regex.worker.ts", import.meta.url),
      { type: "module" }
    );

    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const { id, success, result, error } = e.data;
      const cb = pendingRef.current.get(id);
      if (!cb) return;
      pendingRef.current.delete(id);
      if (success) {
        cb(result ?? []);
      } else {
        cb(null, error);
      }
    };

    worker.onerror = (e) => {
      // eslint-disable-next-line no-console
      console.error("Regex worker crashed:", e.message);
      // Reject all in-flight promises so callers don't hang forever.
      pendingRef.current.forEach((cb) => cb(null, e.message ?? "Regex worker crashed"));
      pendingRef.current.clear();
      workerRef.current = null;
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
      pendingRef.current.clear();
    };
  }, []);

  const runRegex = useCallback(
    async (req: RegexRequest): Promise<MatchResult[]> => {
      if (isDesktop) {
        const raw = await callTool(
          "tool_regex_test",
          {
            pattern: req.pattern,
            text: req.text,
            engine: req.engine,
            flags: req.flags ?? undefined,
          },
          { skipHistory: true }
        );
        const result = unwrapSpectaCommandResult<RawMatchResult[]>(raw);
        return normaliseGroups(Array.isArray(result) ? result : []);
      }

      return new Promise((resolve, reject) => {
        const worker = workerRef.current;
        if (!worker) {
          reject(new Error("Worker not ready"));
          return;
        }

        const id = crypto.randomUUID();

        pendingRef.current.set(id, (res, error) => {
          if (error) {
            reject(new Error(error));
          } else {
            resolve(normaliseGroups(res ?? []));
          }
        });

        worker.postMessage({ id, ...req });
      });
    },
    []
  );

  return { runRegex };
}

