import type { Plugin } from "prettier";
import * as prettier from "prettier/standalone";
import babel from "prettier/plugins/babel";
import estree from "prettier/plugins/estree";
import typescript from "prettier/plugins/typescript";
import html from "prettier/plugins/html";
import postcss from "prettier/plugins/postcss";
import markdown from "prettier/plugins/markdown";

export type CodeLanguage =
  | "javascript"
  | "typescript"
  | "html"
  | "css"
  | "markdown";

export interface FormatResult {
  result: string;
  error: string | null;
}

export async function formatCode(
  code: string,
  language: CodeLanguage,
  tabWidth: 2 | 4 | "tab"
): Promise<FormatResult> {
  const trimmed = code.trim();
  if (trimmed === "") {
    return { result: "", error: null };
  }

  const useTabs = tabWidth === "tab";
  const tabWidthNum = typeof tabWidth === "number" ? tabWidth : 2;

  let parser: string;
  let plugins: Plugin[];

  switch (language) {
    case "javascript":
      parser = "babel";
      plugins = [babel, estree];
      break;
    case "typescript":
      parser = "typescript";
      plugins = [babel, estree, typescript];
      break;
    case "html":
      parser = "html";
      plugins = [html];
      break;
    case "css":
      parser = "css";
      plugins = [postcss];
      break;
    case "markdown":
      parser = "markdown";
      plugins = [markdown];
      break;
    default:
      parser = "babel";
      plugins = [babel, estree];
  }

  try {
    const result = await prettier.format(trimmed, {
      parser,
      plugins,
      tabWidth: tabWidthNum,
      useTabs,
    });
    return { result, error: null };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : String(err ?? "Format failed");
    return { result: "", error: message };
  }
}
