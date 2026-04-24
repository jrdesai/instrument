import { useEffect, useMemo, useRef, useState } from "react";
import { callTool } from "../bridge";
import { getToolById, type Tool } from "../registry";
import type { Chain, ChainStep } from "../store";
import { useChainStore } from "../store";

const DEBOUNCE_MS = 150;

export interface StepResult {
  status: "idle" | "running" | "success" | "error" | "waiting";
  rawOutput?: unknown;
  pipedValue?: string;
  error?: string;
}

function dotPath(obj: unknown, path: string): string {
  const parts = path.split(".");
  let val: unknown = obj;
  for (const part of parts) {
    if (val == null || typeof val !== "object") return "";
    val = (val as Record<string, unknown>)[part];
  }
  if (typeof val === "string") return val;
  if (val != null) return JSON.stringify(val, null, 2);
  return "";
}

function extractPipedValue(tool: Tool, step: ChainStep, rawOutput: unknown): string {
  if (rawOutput && typeof rawOutput === "object" && "error" in rawOutput) {
    const err = (rawOutput as { error?: string | null }).error;
    if (err != null && err !== "") return "";
  }

  if (tool.id === "cert-decoder") {
    try {
      return JSON.stringify(rawOutput, null, 2);
    } catch {
      return "";
    }
  }

  if (tool.id === "regex-tester" && Array.isArray(rawOutput)) {
    return (rawOutput as { value?: string }[])
      .map((m) => m.value ?? "")
      .filter(Boolean)
      .join("\n");
  }

  if (tool.chainOutputFields && step.outputField) {
    if (tool.id === "hash") {
      const results =
        (rawOutput as { results?: { algorithm: string; value: string }[] }).results ?? [];
      return results.find((r) => r.algorithm === step.outputField)?.value ?? "";
    }
    return dotPath(rawOutput, step.outputField);
  }

  const path = tool.chainPrimaryOutput ?? "result";
  return dotPath(rawOutput, path);
}

function finalizeToolInput(tool: Tool, merged: Record<string, unknown>): Record<string, unknown> {
  const out = { ...merged };
  for (const k of [
    "urlSafe",
    "hasHeaders",
    "caseSensitive",
    "regexMode",
    "replaceAll",
    "wholeWord",
    "uppercaseHex",
  ]) {
    const v = out[k];
    if (v === "true") out[k] = true;
    else if (v === "false") out[k] = false;
  }
  if (typeof out.cost === "string") {
    const n = parseInt(out.cost, 10);
    out.cost = Number.isFinite(n) ? n : 12;
  }
  if (tool.id === "hash") {
    if (out.hashEmpty === undefined) out.hashEmpty = false;
    if (out.uppercase === undefined) out.uppercase = false;
    out.hmacKey = "";
  }
  if (tool.id === "jwt") {
    if (out.secret === undefined) out.secret = "";
    if (out.secretEncoding === undefined) out.secretEncoding = "utf8";
  }
  if (tool.id === "line-tools" && typeof out.operation === "string") {
    out.operations = [out.operation];
    delete out.operation;
  }
  if (tool.id === "semver") {
    if (out.compareWith === "") out.compareWith = null;
    if (out.range === "") out.range = null;
  }
  if (tool.id === "xml-formatter" || tool.id === "yaml-formatter") {
    if (out.indentSize === undefined) out.indentSize = 2;
  }
  if (tool.id === "json-formatter") {
    if (out.sortKeys === undefined) out.sortKeys = false;
  }
  if (tool.id === "html-formatter") {
    if (out.indentSize === undefined) out.indentSize = 2;
    if (out.wrapAttributes === undefined) out.wrapAttributes = false;
    if (out.printWidth === undefined) out.printWidth = 100;
  }
  if (tool.id === "config-converter") {
    if (out.indent === undefined) out.indent = 2;
    if (out.sortKeys === undefined) out.sortKeys = false;
  }
  if (tool.id === "json-converter") {
    if (out.tsRootName === undefined) out.tsRootName = null;
    if (out.tsExport === undefined) out.tsExport = true;
    if (out.tsOptionalFields === undefined) out.tsOptionalFields = false;
    if (out.xmlRootElement === undefined) out.xmlRootElement = null;
  }
  if (tool.id === "cron-parser") {
    if (out.count === undefined || out.count === null) out.count = 5;
  }
  if (tool.id === "number-base-converter") {
    if (out.bitWidth === undefined) out.bitWidth = "auto";
    if (out.uppercaseHex === undefined) out.uppercaseHex = false;
  }
  if (tool.id === "env-parser") {
    if (out.maskValues === undefined) out.maskValues = false;
  }
  if (tool.id === "slug-generator") {
    if (out.lowercase === undefined) out.lowercase = true;
    if (out.maxLength === undefined) out.maxLength = null;
  }
  if (tool.id === "regex-tester") {
    if (out.flags === "" || out.flags == null) {
      delete out.flags;
    }
  }
  if (tool.id === "sql-formatter" && out.indent === undefined) {
    out.indent = "spaces2";
  }
  return out;
}

export function buildStepInput(tool: Tool, step: ChainStep, pipedValue: string): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const field of tool.chainConfig ?? []) {
    defaults[field.key] = field.default;
  }
  const merged = { ...defaults, ...step.config };
  const primaryKey = tool.chainPrimaryInput ?? "input";
  merged[primaryKey] = pipedValue;
  return finalizeToolInput(tool, merged);
}

export function useChainExecution(chain: Chain | null | undefined): Record<string, StepResult> {
  const chainId = chain?.id ?? "";
  const chainInput = useChainStore((s) => (chainId ? s.chainInputs[chainId] ?? "" : ""));
  const stepMeta = useMemo(
    () =>
      JSON.stringify(
        (chain?.steps ?? []).map((st) => ({
          id: st.id,
          outputField: st.outputField,
          config: st.config,
        }))
      ),
    [chain?.steps]
  );

  const [results, setResults] = useState<Record<string, StepResult>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);
  const genRef = useRef(0);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [chainId]);

  useEffect(() => {
    if (!chain) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      setResults({});
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const runGen = ++genRef.current;

      if (chain.steps.length === 0) {
        setResults({});
        return;
      }

      const initial: Record<string, StepResult> = {};
      chain.steps.forEach((st, i) => {
        initial[st.id] = { status: i === 0 ? "running" : "waiting" };
      });
      setResults(initial);

      void (async () => {
        let pipedValue = chainInput ?? "";
        for (let i = 0; i < chain.steps.length; i++) {
          if (cancelledRef.current || runGen !== genRef.current) return;

          const step = chain.steps[i];
          const tool = getToolById(step.toolId);

          if (!tool?.rustCommand) {
            setResults((prev) => ({
              ...prev,
              [step.id]: { status: "error", error: "Tool not found or has no command" },
            }));
            for (let j = i + 1; j < chain.steps.length; j++) {
              const sid = chain.steps[j].id;
              setResults((p) => ({ ...p, [sid]: { status: "waiting" } }));
            }
            return;
          }

          if (!tool.chainPrimaryInput) {
            setResults((prev) => ({
              ...prev,
              [step.id]: { status: "error", error: "Tool is missing chain metadata (chainPrimaryInput)" },
            }));
            for (let j = i + 1; j < chain.steps.length; j++) {
              const sid = chain.steps[j].id;
              setResults((p) => ({ ...p, [sid]: { status: "waiting" } }));
            }
            return;
          }

          setResults((prev) => ({
            ...prev,
            [step.id]: { ...prev[step.id], status: "running" },
          }));

          const input = buildStepInput(tool, step, pipedValue);

          try {
            const rawOutput = await callTool(tool.rustCommand, input, { skipHistory: true });
            if (cancelledRef.current || runGen !== genRef.current) return;

            const err =
              rawOutput && typeof rawOutput === "object" && "error" in rawOutput
                ? (rawOutput as { error?: string | null }).error
                : null;
            if (err) {
              setResults((prev) => ({
                ...prev,
                [step.id]: { status: "error", rawOutput, error: err },
              }));
              for (let j = i + 1; j < chain.steps.length; j++) {
                const sid = chain.steps[j].id;
                setResults((p) => ({ ...p, [sid]: { status: "waiting" } }));
              }
              return;
            }

            pipedValue = extractPipedValue(tool, step, rawOutput);
            setResults((prev) => ({
              ...prev,
              [step.id]: { status: "success", rawOutput, pipedValue },
            }));
          } catch (e) {
            if (cancelledRef.current || runGen !== genRef.current) return;
            const message =
              e instanceof Error ? e.message : e != null ? String(e) : "Execution failed";
            setResults((prev) => ({
              ...prev,
              [step.id]: { status: "error", error: message },
            }));
            for (let j = i + 1; j < chain.steps.length; j++) {
              const sid = chain.steps[j].id;
              setResults((p) => ({ ...p, [sid]: { status: "waiting" } }));
            }
            return;
          }
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [chain, chainInput, stepMeta]);

  return results;
}
