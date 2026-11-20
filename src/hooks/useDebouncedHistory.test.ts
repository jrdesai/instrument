import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedHistory } from "./useDebouncedHistory";
import { useHistoryStore } from "../store";

describe("useDebouncedHistory", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useHistoryStore.getState().clearHistory();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("records a history entry after the debounce delay", () => {
    const { result } = renderHook(() => useDebouncedHistory("base64-encoder", 500));

    act(() => {
      result.current.schedule({ text: "hello" }, { result: "aGVsbG8=" });
    });

    expect(useHistoryStore.getState().getHistory("base64-encoder")).toHaveLength(0);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    const entries = useHistoryStore.getState().getHistory("base64-encoder");
    expect(entries).toHaveLength(1);
    expect(entries[0].input).toEqual({ text: "hello" });
    expect(entries[0].output).toEqual({ result: "aGVsbG8=" });
  });

  it("replaces a pending timer when scheduled again", () => {
    const { result } = renderHook(() => useDebouncedHistory("base64-encoder", 500));

    act(() => {
      result.current.schedule({ text: "first" }, { result: "1" });
      vi.advanceTimersByTime(300);
      result.current.schedule({ text: "second" }, { result: "2" });
      vi.advanceTimersByTime(499);
    });

    expect(useHistoryStore.getState().getHistory("base64-encoder")).toHaveLength(0);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    const entries = useHistoryStore.getState().getHistory("base64-encoder");
    expect(entries).toHaveLength(1);
    expect(entries[0].input).toEqual({ text: "second" });
  });

  it("cancels a pending timer via cancel() and on unmount", () => {
    const { result, unmount } = renderHook(() =>
      useDebouncedHistory("base64-encoder", 500)
    );

    act(() => {
      result.current.schedule({ text: "cancelled" }, { result: "x" });
      result.current.cancel();
      vi.advanceTimersByTime(500);
    });
    expect(useHistoryStore.getState().getHistory("base64-encoder")).toHaveLength(0);

    act(() => {
      result.current.schedule({ text: "unmounted" }, { result: "y" });
    });
    unmount();

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(useHistoryStore.getState().getHistory("base64-encoder")).toHaveLength(0);
  });
});
