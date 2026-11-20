import { beforeEach, describe, expect, it, vi } from "vitest";
import { useHistoryStore } from "../store";

const mockCallToolWeb = vi.fn();

vi.mock("./web", () => ({
  callToolWeb: (name: string, input: unknown) => mockCallToolWeb(name, input),
}));

import { callTool } from "./index";

describe("bridge callTool", () => {
  beforeEach(() => {
    mockCallToolWeb.mockReset();
    useHistoryStore.getState().clearHistory();
  });

  it("calls the web bridge and records history under the registry tool ID", async () => {
    mockCallToolWeb.mockResolvedValue({ result: "aGVsbG8=" });

    const output = await callTool("tool_base64_process", { text: "hello" });

    expect(output).toEqual({ result: "aGVsbG8=" });
    expect(mockCallToolWeb).toHaveBeenCalledWith("tool_base64_process", {
      text: "hello",
    });
    const history = useHistoryStore.getState().getHistory("base64-encoder");
    expect(history).toHaveLength(1);
    expect(history[0].output).toEqual({ result: "aGVsbG8=" });
  });

  it("skips history when skipHistory option is true", async () => {
    mockCallToolWeb.mockResolvedValue({ result: "ok" });

    await callTool("tool_base64_process", { text: "hello" }, { skipHistory: true });

    expect(useHistoryStore.getState().getHistory("base64-encoder")).toHaveLength(0);
  });

  it("automatically skips history for sensitive tools even without skipHistory", async () => {
    mockCallToolWeb.mockResolvedValue({ valid: true });

    await callTool("tool_jwt_decode", { token: "secret.jwt.token" });

    expect(useHistoryStore.getState().getHistory("jwt")).toHaveLength(0);
    expect(useHistoryStore.getState().getHistory("tool_jwt_decode")).toHaveLength(0);
  });

  it("uses registry wasmExport override when present", async () => {
    mockCallToolWeb.mockResolvedValue({ tokens: [] });

    await callTool("tool_regex_explain", { pattern: "\\d+" }, { skipHistory: true });

    expect(mockCallToolWeb).toHaveBeenCalledWith("regex_explain", {
      pattern: "\\d+",
    });
  });

  it("propagates errors without recording history", async () => {
    mockCallToolWeb.mockRejectedValue(new Error("WASM failure"));

    await expect(
      callTool("tool_base64_process", { text: "bad" })
    ).rejects.toThrow("WASM failure");

    expect(useHistoryStore.getState().getHistory("base64-encoder")).toHaveLength(0);
  });
});
