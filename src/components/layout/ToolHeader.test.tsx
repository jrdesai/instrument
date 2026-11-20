import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToolHeader } from "./ToolHeader";
import { useToolStore } from "../../store";
import type { Tool } from "../../registry/types";

afterEach(cleanup);

const baseTool: Tool = {
  id: "json-formatter",
  name: "JSON Formatter",
  description: "Format and minify JSON.",
  category: "json",
  displayCategory: "JSON Tools",
  displayCategoryIcon: "data_object",
  roles: ["general"],
  icon: "data_object",
  platforms: ["desktop", "web"],
  keywords: ["json"],
  component: React.lazy(() => Promise.resolve({ default: () => null })),
  implemented: true,
  sampleInput: '{"ok":true}',
};

describe("ToolHeader", () => {
  beforeEach(() => {
    useToolStore.setState({
      favouriteToolIds: [],
      pendingRestoreInput: {},
    });
  });

  it("loads sampleInput into pendingRestoreInput when Sample is clicked", () => {
    const onOpenSearch = vi.fn();
    render(
      <MemoryRouter>
        <ToolHeader tool={baseTool} onOpenSearch={onOpenSearch} />
      </MemoryRouter>
    );

    const sampleButton = screen.getByTitle("Load sample input");
    fireEvent.click(sampleButton);
    expect(useToolStore.getState().pendingRestoreInput["json-formatter"]).toBe('{"ok":true}');

    const searchButton = screen.getByRole("button", { name: /Search tools/ });
    fireEvent.click(searchButton);
    expect(onOpenSearch).toHaveBeenCalledTimes(1);
  });

  it("never renders Sample or bookmarks for sensitive tools", () => {
    render(
      <MemoryRouter>
        <ToolHeader tool={{ ...baseTool, id: "jwt-decoder", sensitive: true }} />
      </MemoryRouter>
    );

    expect(screen.queryByTitle("Load sample input")).toBeNull();
    expect(screen.queryByLabelText("Input bookmarks")).toBeNull();
  });
});
