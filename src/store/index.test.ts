import { beforeEach, describe, expect, it } from "vitest";
import { useHistoryStore, useToolStore } from "./index";
import type { Tool } from "../registry";

function makeTool(id: string): Tool {
  return { id } as Tool;
}

describe("useToolStore", () => {
  beforeEach(() => {
    const state = useToolStore.getState();
    state.clearRecents();
    state.clearFavourites();
    state.clearDraftInputs();
    state.setActiveTool(null);
  });

  it("deduplicates and caps recent tools at 10", () => {
    const store = useToolStore.getState();
    for (let i = 1; i <= 12; i++) {
      store.addToRecent(makeTool(`tool-${i}`));
    }
    store.addToRecent(makeTool("tool-5"));

    const recents = useToolStore.getState().recentToolIds;
    expect(recents).toHaveLength(10);
    expect(recents[0]).toBe("tool-5");
    expect(new Set(recents).size).toBe(10);
  });

  it("toggles favourites idempotently", () => {
    const tool = makeTool("base64-encoder");
    useToolStore.getState().toggleFavourite(tool);
    expect(useToolStore.getState().favouriteToolIds).toEqual(["base64-encoder"]);

    useToolStore.getState().toggleFavourite(tool);
    expect(useToolStore.getState().favouriteToolIds).toEqual([]);
  });
});

describe("useHistoryStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useHistoryStore.getState().clearHistory();
  });

  it("prepends entries and caps per-tool history at 100", () => {
    for (let i = 0; i < 105; i++) {
      useHistoryStore.getState().addHistoryEntry("base64-encoder", {
        input: { i },
        output: { i },
        timestamp: i,
      });
    }

    const entries = useHistoryStore.getState().getHistory("base64-encoder");
    expect(entries).toHaveLength(100);
    expect(entries[0].timestamp).toBe(104);
  });

  it("excludes sensitive tools and oversized entries from persisted localStorage", () => {
    useHistoryStore.getState().addHistoryEntry("jwt", {
      input: { token: "secret" },
      output: { payload: {} },
      timestamp: 1,
    });
    useHistoryStore.getState().addHistoryEntry("base64-encoder", {
      input: { text: "x".repeat(5000) },
      output: { result: "big" },
      timestamp: 2,
    });
    useHistoryStore.getState().addHistoryEntry("base64-encoder", {
      input: { text: "small" },
      output: { result: "c21hbGw=" },
      timestamp: 3,
    });

    const raw = localStorage.getItem("instrument-history");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!) as {
      state: { history: Record<string, unknown[]> };
    };
    expect(parsed.state.history["jwt"]).toBeUndefined();
    expect(parsed.state.history["base64-encoder"]).toHaveLength(1);
  });
});
