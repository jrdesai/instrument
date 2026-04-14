import { callToolWeb } from "../bridge/web";

interface RegexWorkerRequest {
  id: string;
  pattern: string;
  engine: string;
  text?: string;
  flags?: string;
  explain?: boolean;
}

interface RegexWorkerSuccessResponse {
  id: string;
  success: true;
  result: unknown;
}

interface RegexWorkerErrorResponse {
  id: string;
  success: false;
  error: string;
}

type RegexWorkerResponse = RegexWorkerSuccessResponse | RegexWorkerErrorResponse;

// In the web build, regex is executed inside this worker via the WASM module.
// We delegate to the generic WASM bridge so initialization and caching are handled there.

self.onmessage = async (e: MessageEvent<RegexWorkerRequest>) => {
  const { id, pattern, text, engine, flags, explain } = e.data;

  try {
    if (explain) {
      const result = await callToolWeb("tool_regex_explain", {
        pattern,
        engine,
      });

      const response: RegexWorkerResponse = {
        id,
        success: true,
        result,
      };

      (self as unknown as Worker).postMessage(response);
      return;
    }

    // This expects a wasm-bindgen export named "regex_match" to exist in instrument-web.
    const result = (await callToolWeb("regex_match", {
      pattern,
      text: text ?? "",
      engine,
      flags,
    })) as Array<{ start: number; end: number; value: string; groups?: (string | null)[] }>;

    // WASM returns Vec<Option<String>> for groups; normalise nulls to "" before posting.
    const normalised = (result ?? []).map((m) => ({
      ...m,
      groups: (m.groups ?? []).map((g: string | null) => g ?? ""),
    }));

    const response: RegexWorkerResponse = {
      id,
      success: true,
      result: normalised,
    };

    (self as unknown as Worker).postMessage(response);
  } catch (err) {
    const response: RegexWorkerResponse = {
      id,
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };

    (self as unknown as Worker).postMessage(response);
  }
};

