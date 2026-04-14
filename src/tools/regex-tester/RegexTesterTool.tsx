import React, { useCallback, useMemo, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { useDraftInput, useRestoreDraft } from "../../hooks/useDraftInput";
import { useHistoryStore } from "../../store";
import { useRegexWorker, MatchResult } from "../../hooks/useRegexWorker";
import {
  explainPattern,
  ExplainToken,
} from "../../hooks/useRegexExplain";
import { CodeBlock } from "../../components/ui/CodeBlock";
import { QuickReference } from "./QuickReference";

const ENGINES = [
  { id: "javascript", label: "JavaScript" },
  { id: "rust", label: "Rust" },
  { id: "go", label: "Go" },
  { id: "java", label: "Java" },
  { id: "python", label: "Python" },
  { id: "pcre", label: "PCRE" },
] as const;

type EngineId = (typeof ENGINES)[number]["id"];

type Mode = "match" | "replace";

type FeatureSupport = {
  lookahead: boolean;
  lookbehind: boolean;
  backreferences: boolean;
  namedGroups: boolean;
};

const ENGINE_FEATURES: Record<EngineId, FeatureSupport> = {
  javascript: {
    lookahead: true,
    lookbehind: true,
    backreferences: true,
    namedGroups: true,
  },
  rust: {
    lookahead: false,
    lookbehind: false,
    backreferences: false,
    namedGroups: true,
  },
  go: {
    lookahead: false,
    lookbehind: false,
    backreferences: false,
    namedGroups: true,
  },
  java: {
    lookahead: true,
    lookbehind: true,
    backreferences: true,
    namedGroups: true,
  },
  python: {
    lookahead: true,
    lookbehind: true,
    backreferences: true,
    namedGroups: true,
  },
  pcre: {
    lookahead: true,
    lookbehind: true,
    backreferences: true,
    namedGroups: true,
  },
};

type Language =
  | "javascript"
  | "typescript"
  | "python"
  | "java"
  | "go"
  | "rust"
  | "php";

const ENGINE_DEFAULT_LANGUAGE: Record<string, Language> = {
  javascript: "javascript",
  rust: "rust",
  go: "go",
  java: "java",
  python: "python",
  pcre: "php",
};

const REGEX_TESTER_TOOL_ID = "regex-tester";

function isRegexTesterDraft(
  raw: unknown
): raw is { pattern: string; testInput: string } {
  if (typeof raw !== "object" || raw === null) return false;
  const o = raw as Record<string, unknown>;
  return typeof o.pattern === "string" && typeof o.testInput === "string";
}

const LANGUAGE_LABELS: Record<Language, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  go: "Go",
  rust: "Rust",
  php: "PHP",
};

function generateCode(
  pattern: string,
  flags: string,
  language: Language
): string {
  if (!pattern) return "";

  switch (language) {
    case "javascript":
      return `const regex = /${pattern}/${flags};
const text = "your text here";
const matches = [...text.matchAll(regex)];

for (const match of matches) {
  console.log("Match:", match[0]);
  console.log("Groups:", match.slice(1));
  console.log("Index:", match.index);
}`;

    case "typescript":
      return `const regex = /${pattern}/${flags};
const text: string = "your text here";
const matches: RegExpMatchArray[] = [...text.matchAll(regex)];

for (const match of matches) {
  console.log("Match:", match[0]);
  console.log("Groups:", match.slice(1));
  console.log("Index:", match.index);
}`;

    case "python":
      return `import re

pattern = r"${pattern}"
text = "your text here"
flags = ${flags.includes("i") ? "re.IGNORECASE" : "0"}

matches = re.finditer(pattern, text, flags)
for match in matches:
    print("Match:", match.group(0))
    print("Groups:", match.groups())
    print("Span:", match.span())`;

    case "java":
      return `import java.util.regex.*;

String pattern = "${pattern.replace(/\\/g, "\\\\")}";
String text = "your text here";
${
  flags.includes("i")
    ? `Pattern regex = Pattern.compile(pattern, Pattern.CASE_INSENSITIVE);`
    : `Pattern regex = Pattern.compile(pattern);`
}
Matcher matcher = regex.matcher(text);

while (matcher.find()) {
    System.out.println("Match: " + matcher.group(0));
    System.out.println("Start: " + matcher.start());
    System.out.println("End: " + matcher.end());
}`;

    case "go":
      return `package main

import (
    "fmt"
    "regexp"
)

func main() {
    re := regexp.MustCompile(\`${pattern}\`)
    text := "your text here"
    matches := re.FindAllStringSubmatch(text, -1)

    for _, match := range matches {
        fmt.Println("Match:", match[0])
        fmt.Println("Groups:", match[1:])
    }
}`;

    case "rust":
      return `use regex::Regex;

fn main() {
    let re = Regex::new(r"${pattern}").unwrap();
    let text = "your text here";

    for cap in re.captures_iter(text) {
        println!("Match: {}", &cap[0]);
        // Groups: cap.get(1), cap.get(2), etc.
    }
}`;

    case "php":
      return `<?php
$pattern = '/${pattern}/${flags}';
$text = "your text here";

preg_match_all($pattern, $text, $matches);

foreach ($matches[0] as $i => $match) {
    echo "Match: " . $match . "\\n";
}`;

    default:
      return "";
  }
}

export type RefToken = {
  token: string;
  description: string;
  example?: string;
};

export type RefSection = {
  id: string;
  title: string;
  tokens: RefToken[];
};

export const REFERENCE_SECTIONS: RefSection[] = [
  {
    id: "characters",
    title: "Character Classes",
    tokens: [
      { token: ".", description: "Any character except newline" },
      { token: "\\d", description: "Any digit [0-9]" },
      { token: "\\D", description: "Any non-digit" },
      { token: "\\w", description: "Word character [a-zA-Z0-9_]" },
      { token: "\\W", description: "Non-word character" },
      { token: "\\s", description: "Whitespace (space, tab, newline)" },
      { token: "\\S", description: "Non-whitespace" },
      { token: "[abc]", description: "Any of a, b, or c" },
      { token: "[^abc]", description: "Not a, b, or c" },
      { token: "[a-z]", description: "Character in range a–z" },
    ],
  },
  {
    id: "anchors",
    title: "Anchors",
    tokens: [
      { token: "^", description: "Start of string (or line with m flag)" },
      { token: "$", description: "End of string (or line with m flag)" },
      { token: "\\b", description: "Word boundary" },
      { token: "\\B", description: "Non-word boundary" },
      { token: "\\A", description: "Start of string (no multiline)" },
      { token: "\\Z", description: "End of string (no multiline)" },
    ],
  },
  {
    id: "quantifiers",
    title: "Quantifiers",
    tokens: [
      { token: "*", description: "0 or more (greedy)" },
      { token: "+", description: "1 or more (greedy)" },
      { token: "?", description: "0 or 1 (optional)" },
      { token: "*?", description: "0 or more (lazy)" },
      { token: "+?", description: "1 or more (lazy)" },
      { token: "??", description: "0 or 1 (lazy)" },
      { token: "{n}", description: "Exactly n times" },
      { token: "{n,}", description: "n or more times" },
      { token: "{n,m}", description: "Between n and m times" },
    ],
  },
  {
    id: "groups",
    title: "Groups & References",
    tokens: [
      { token: "(abc)", description: "Capture group" },
      { token: "(?:abc)", description: "Non-capturing group" },
      { token: "(?<name>abc)", description: "Named capture group" },
      { token: "\\1", description: "Backreference to group 1" },
      { token: "\\k<name>", description: "Backreference to named group" },
      { token: "(?|a|b)", description: "Branch reset group" },
    ],
  },
  {
    id: "lookaround",
    title: "Lookaround",
    tokens: [
      { token: "(?=abc)", description: "Lookahead — followed by abc" },
      { token: "(?!abc)", description: "Negative lookahead" },
      { token: "(?<=abc)", description: "Lookbehind — preceded by abc" },
      { token: "(?<!abc)", description: "Negative lookbehind" },
    ],
  },
  {
    id: "substitution",
    title: "Substitution (Replace mode)",
    tokens: [
      { token: "$1", description: "Insert capture group 1" },
      { token: "$2", description: "Insert capture group 2" },
      { token: "$&", description: "Insert entire match" },
      { token: "$`", description: "Insert text before match" },
      { token: "$'", description: "Insert text after match" },
      { token: "$$", description: "Insert literal $" },
    ],
  },
  {
    id: "common",
    title: "Common Patterns",
    tokens: [
      {
        token: "[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}",
        description: "Email address",
      },
      {
        token: "https?:\\/\\/[^\\s/$.?#].[^\\s]*",
        description: "URL",
      },
      {
        token: "\\d{4}-\\d{2}-\\d{2}",
        description: "ISO date (YYYY-MM-DD)",
      },
      {
        token: "\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}",
        description: "IPv4 address",
      },
      {
        token: "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
        description: "UUID v4",
      },
      {
        token:
          "^[+]?[(]?[0-9]{3}[)]?[-\\s.]?[0-9]{3}[-\\s.]?[0-9]{4,6}$",
        description: "Phone number",
      },
    ],
  },
];

function EngineFeatureBadges({ engine }: { engine: EngineId }) {
  const features = ENGINE_FEATURES[engine];
  if (!features) return null;

  const items = [
    { label: "Lookahead", supported: features.lookahead },
    { label: "Lookbehind", supported: features.lookbehind },
    { label: "Backrefs", supported: features.backreferences },
    { label: "Named groups", supported: features.namedGroups },
  ];

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {items.map(({ label, supported }) => (
        <span
          key={label}
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
            supported
              ? "bg-green-500/15 text-green-400"
              : "bg-red-500/15 text-red-400 line-through"
          }`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function buildHighlightedText(
  text: string,
  matches: MatchResult[]
): React.ReactNode[] {
  const COLOURS = [
    "bg-yellow-300/40",
    "bg-blue-400/40",
    "bg-green-400/40",
    "bg-pink-400/40",
  ];

  if (matches.length === 0 || !text) return [text];

  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  const sorted = [...matches].sort((a, b) => a.start - b.start);

  sorted.forEach((m, idx) => {
    if (m.start > cursor) {
      nodes.push(text.slice(cursor, m.start));
    }
    nodes.push(
      <mark
        key={`${m.start}-${m.end}-${idx}`}
        className={`${COLOURS[idx % COLOURS.length]} rounded-sm px-0.5`}
      >
        {text.slice(m.start, m.end)}
      </mark>
    );
    cursor = m.end;
  });

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}

function parseErrorPosition(error: string): number | null {
  const match = /(?:position|byte)\s+(\d+)/i.exec(error);
  return match ? Number.parseInt(match[1], 10) : null;
}

function detectReDoS(pattern: string): string | null {
  if (!pattern.trim()) return null;

  // Nested quantifiers: group containing a quantified atom, itself quantified
  // e.g. (\w+)+  (a+b*)+  (?:x+)+
  if (/\((?:[^()]*[+*][^()]*)\)[+*{]/.test(pattern)) {
    return "Nested quantifiers detected (e.g. (a+)+). This pattern may cause catastrophic backtracking on non-matching input.";
  }

  // Quantified alternation group — branches may overlap
  // e.g. (a|ab)+  (foo|foobar)*
  if (/\([^()]*\|[^()]*\)[+*{]/.test(pattern)) {
    return "Quantified alternation detected (e.g. (a|ab)+). If branches overlap, this may cause ReDoS on non-matching input.";
  }

  return null;
}

function runJsReplace(
  pattern: string,
  flags: string,
  text: string,
  replacement: string
): string {
  try {
    const regex = new RegExp(pattern, flags);
    return text.replace(regex, replacement);
  } catch {
    return text;
  }
}

function runJsRegex(
  pattern: string,
  flags: string,
  text: string
): MatchResult[] {
  const regex = new RegExp(pattern, flags);
  const results: MatchResult[] = [];
  let match: RegExpExecArray | null;

  regex.lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    results.push({
      start: match.index,
      end: match.index + match[0].length,
      value: match[0],
      groups: match.slice(1),
    });

    if (match[0].length === 0) {
      regex.lastIndex++;
    }

    if (!regex.global) {
      break;
    }
  }

  return results;
}

type RightTab = "matches" | "code" | "explanation";

const KIND_STYLES: Record<string, string> = {
  literal: "text-slate-300",
  class: "text-green-400",
  anchor: "text-purple-400",
  quantifier: "text-amber-400",
  group: "text-blue-400",
  group_end: "text-blue-400/60",
  alternation: "text-pink-400",
  meta: "text-slate-500",
};

const HISTORY_DEBOUNCE_MS = 1500;

const RegexTesterTool: React.FC = () => {
  const { runRegex } = useRegexWorker();
  const { setDraft } = useDraftInput(REGEX_TESTER_TOOL_ID);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const patternInputRef = useRef<HTMLInputElement | null>(null);
  const languageManuallySet = useRef(false);

  const [mode, setMode] = useState<Mode>("match");
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("g");
  const [text, setText] = useState("");

  useRestoreDraft(REGEX_TESTER_TOOL_ID, (raw) => {
    if (!isRegexTesterDraft(raw)) return;
    setPattern(raw.pattern);
    setText(raw.testInput);
  });
  const [engine, setEngine] = useState<EngineId>("javascript");

  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [executionMs, setExecutionMs] = useState<number | null>(null);
  const [replacement, setReplacement] = useState("");
  const [showReference, setShowReference] = useState(false);
  const [rightTab, setRightTab] = useState<RightTab>("matches");
  const [explanation, setExplanation] = useState<ExplainToken[]>([]);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [codeLanguage, setCodeLanguage] = useState<Language>(
    ENGINE_DEFAULT_LANGUAGE["javascript"] ?? "javascript"
  );
  const [matchView, setMatchView] = useState<"list" | "table">("list");

  const redosWarning = useMemo(() => detectReDoS(pattern), [pattern]);

  const replacedText = useMemo(() => {
    if (mode !== "replace" || !pattern.trim()) return text;
    // Replace preview always uses JS engine semantics.
    return runJsReplace(pattern, flags, text, replacement);
  }, [mode, pattern, flags, text, replacement]);

  const evaluate = useDebouncedCallback(
    async (nextPattern: string, nextText: string, nextEngine: EngineId) => {
      if (!nextPattern.trim()) {
        setMatches([]);
        setError(null);
        setExecutionMs(null);
        setExplanation([]);
        setExplainError(null);
        return;
      }

      setIsRunning(true);
      setError(null);

      const t0 = performance.now();

      try {
        if (nextEngine === "javascript") {
          const jsResult = runJsRegex(nextPattern, flags, nextText);
          setMatches(jsResult);
        } else {
          const result = await runRegex({
            pattern: nextPattern,
            text: nextText,
            engine: nextEngine,
            flags,
          });
          setMatches(result);
        }
        setExecutionMs(parseFloat((performance.now() - t0).toFixed(2)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setMatches([]);
        setExecutionMs(null);
      }

      if (nextPattern.trim()) {
        try {
          const tokens = await explainPattern(nextPattern, nextEngine);
          setExplanation(tokens);
          setExplainError(null);
        } catch (explainErr) {
          setExplainError(
            explainErr instanceof Error ? explainErr.message : "Explanation failed"
          );
          setExplanation([]);
        }
      }

      setIsRunning(false);

      // Record history after the user pauses — 1500ms debounce, regex-tester tool only
      if (nextPattern.trim()) {
        if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
        historyDebounceRef.current = setTimeout(() => {
          addHistoryEntry(REGEX_TESTER_TOOL_ID, {
            input: { pattern: nextPattern, engine: nextEngine, flags, text: nextText },
            output: { matchCount: matches.length },
            timestamp: Date.now(),
          });
          historyDebounceRef.current = null;
        }, HISTORY_DEBOUNCE_MS);
      }
    },
    150
  );

  const handlePatternChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    setPattern(value);
    setDraft({ pattern: value, testInput: text });
    evaluate(value, text, engine);
  };

  const handleFlagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFlags(value);
    if (engine === "javascript") {
      evaluate(pattern, text, engine);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    setDraft({ pattern, testInput: value });
    evaluate(pattern, value, engine);
  };

  const handleEngineChange = (id: EngineId) => {
    setEngine(id);
    if (!languageManuallySet.current) {
      setCodeLanguage(ENGINE_DEFAULT_LANGUAGE[id] ?? "javascript");
    }
    evaluate(pattern, text, id);
  };

  const clearAll = useCallback(() => {
    setPattern("");
    setFlags("g");
    setText("");
    setDraft({ pattern: "", testInput: "" });
    setReplacement("");
    setMatches([]);
    setError(null);
    setExecutionMs(null);
  }, [setDraft]);

  const insertToken = useCallback(
    (token: string) => {
      const input = patternInputRef.current;
      if (!input) {
        const newPattern = pattern + token;
        setPattern(newPattern);
        setDraft({ pattern: newPattern, testInput: text });
        evaluate(newPattern, text, engine);
        return;
      }

      const start = input.selectionStart ?? pattern.length;
      const end = input.selectionEnd ?? pattern.length;
      const newPattern = pattern.slice(0, start) + token + pattern.slice(end);

      setPattern(newPattern);
      setDraft({ pattern: newPattern, testInput: text });

      requestAnimationFrame(() => {
        input.focus();
        const newPos = start + token.length;
        input.setSelectionRange(newPos, newPos);
      });

      evaluate(newPattern, text, engine);
    },
    [pattern, text, engine, evaluate, setDraft]
  );

  return (
    <div className="flex flex-col h-full w-full bg-background-light dark:bg-background-dark">
      <div className="flex flex-1 min-h-0">
        {/* Left panel */}
        <div className="w-[55%] shrink-0 flex flex-col border-r border-border-light dark:border-border-dark overflow-hidden p-4 gap-4">
          {/* Mode tabs */}
          <div className="flex gap-1 mb-1">
            {(["match", "replace"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  mode === m
                    ? "bg-primary text-white"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
              >
                {m === "match" ? "Match" : "Replace"}
              </button>
            ))}
          </div>

          {/* Pattern + flags — always visible */}
          <div>
            <div className="flex items-end justify-between mb-2">
              <div className="text-xs uppercase tracking-wider text-slate-500">
                Pattern
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowReference((v) => !v)}
                  className="text-xs text-slate-500 hover:text-primary transition-colors"
                >
                  {showReference ? "← Back" : "Quick Reference"}
                </button>
                <div className="flex items-center gap-1">
                  <div className="text-xs uppercase tracking-wider text-slate-500">
                    Flags
                  </div>
                  <div className="relative group">
                    <span className="text-slate-600 hover:text-slate-400 cursor-default text-xs leading-none select-none">
                      ⓘ
                    </span>
                    <div className="absolute top-full right-0 mt-2 z-50 hidden group-hover:block w-48 rounded-md bg-[#1e2533] border border-border-dark shadow-xl px-3 py-2 text-[11px] text-slate-300 font-mono leading-relaxed pointer-events-none">
                      <div className="font-sans text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                        Valid flags
                      </div>
                      <div>
                        <span className="text-primary">g</span> — global (all matches)
                      </div>
                      <div>
                        <span className="text-primary">i</span> — case-insensitive
                      </div>
                      <div>
                        <span className="text-primary">m</span> — multiline
                      </div>
                      <div>
                        <span className="text-primary">s</span> — dotAll (. matches \n)
                      </div>
                      <div>
                        <span className="text-primary">u</span> — unicode
                      </div>
                      <div>
                        <span className="text-primary">d</span> — indices
                      </div>
                      <div className="absolute bottom-full right-3 border-4 border-transparent border-b-[#1e2533]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                className="flex-1 px-3 py-2 rounded-md bg-panel-light dark:bg-panel-dark text-slate-900 dark:text-slate-100 text-sm border border-border-light dark:border-border-dark focus:outline-none focus:border-primary font-mono"
                placeholder="e.g. (\\w+)"
                value={pattern}
                onChange={handlePatternChange}
                ref={patternInputRef}
                spellCheck={false}
              />
              <span className="text-slate-500 font-mono text-sm shrink-0">/</span>
              <div className="flex flex-col items-end">
                <input
                  className="w-14 px-2 py-2 rounded-md bg-panel-light dark:bg-panel-dark text-slate-900 dark:text-slate-100 text-sm border border-border-light dark:border-border-dark focus:outline-none focus:border-primary font-mono text-center self-start mt-0"
                  placeholder="gim"
                  value={flags}
                  onChange={handleFlagsChange}
                />
                {engine !== "javascript" && (
                  <div className="text-[10px] text-slate-600 mt-1 text-right">
                    Flags apply to JS engine only
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                <span className="shrink-0 mt-0.5">⚠</span>
                <div>
                  <div>{error}</div>
                  {parseErrorPosition(error) !== null && (
                    <div className="text-red-300/60 mt-0.5">
                      at position {parseErrorPosition(error)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!error && redosWarning && (
              <div className="flex items-start gap-2 mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2">
                <span className="shrink-0 mt-0.5 material-symbols-outlined text-sm leading-none">
                  warning
                </span>
                <span>{redosWarning}</span>
              </div>
            )}

            {/* Replacement input — only in Replace mode */}
            {mode === "replace" && (
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">
                  Replacement
                </div>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-md bg-panel-light dark:bg-panel-dark text-slate-900 dark:text-slate-100 text-sm border border-border-light dark:border-border-dark focus:outline-none focus:border-primary font-mono"
                  placeholder="e.g. $1_suffix or replacement text"
                  value={replacement}
                  onChange={(e) => {
                    setReplacement(e.target.value);
                    evaluate(pattern, text, engine);
                  }}
                  spellCheck={false}
                />
                {engine !== "javascript" && (
                  <div className="text-[10px] text-slate-500 mt-1">
                    Replace preview uses JS engine
                  </div>
                )}
              </div>
            )}
          </div>

          {showReference ? (
            <QuickReference onInsert={insertToken} />
          ) : (
            <>
              {/* Engine pills */}
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">
                  Engine
                </div>
                <div className="flex flex-wrap gap-1">
                  {ENGINES.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleEngineChange(id)}
                      className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                        engine === id
                          ? "bg-primary text-white border-primary"
                          : "bg-panel-light dark:bg-panel-dark text-slate-500 dark:text-slate-400 border border-border-light dark:border-border-dark hover:text-slate-700 dark:hover:text-slate-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <EngineFeatureBadges engine={engine} />
              </div>

              {/* Test text and highlighted preview */}
              <div className="flex flex-col flex-1 min-h-0 gap-3 overflow-y-auto">
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">
                    Test text
                  </div>
                  <textarea
                    className="w-full min-h-[160px] px-3 py-2 rounded-md bg-panel-light dark:bg-panel-dark text-slate-900 dark:text-slate-100 text-xs border border-border-light dark:border-border-dark focus:outline-none focus:border-primary font-mono resize-none leading-relaxed"
                    placeholder="Paste or type text to test against…"
                    value={text}
                    onChange={handleTextChange}
                    spellCheck={false}
                  />
                </div>
                {matches.length > 0 && (
                  <div>
                    <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">
                      Highlighted
                    </div>
                    <div className="w-full min-h-[60px] px-3 py-2 rounded-md bg-panel-light/60 dark:bg-panel-dark/60 border border-border-light dark:border-border-dark text-xs font-mono leading-relaxed whitespace-pre-wrap break-all text-slate-800 dark:text-slate-200">
                      {buildHighlightedText(text, matches)}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right panel */}
        <div className="w-[45%] flex flex-col overflow-hidden p-4 gap-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1">
              {(
                [
                  { id: "matches", label: "Matches" },
                  { id: "code", label: "Code" },
                  { id: "explanation", label: "Explanation" },
                ] as { id: RightTab; label: string }[]
              ).map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setRightTab(id)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    rightTab === id
                      ? "bg-primary text-white"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {rightTab === "matches" && (
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  {isRunning && (
                    <span className="text-primary animate-pulse">
                      Evaluating…
                    </span>
                  )}
                  {!isRunning && executionMs !== null && (
                    <span>{executionMs} ms</span>
                  )}
                  <span>
                    {matches.length}{" "}
                    {matches.length === 1 ? "match" : "matches"}
                  </span>
                </div>
                {matches.length > 0 && mode === "match" && (
                  <div className="flex gap-0.5 rounded-md overflow-hidden border border-border-light dark:border-border-dark">
                    {(["list", "table"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setMatchView(v)}
                        className={`px-2 py-0.5 text-xs font-medium transition-colors ${
                          matchView === v
                            ? "bg-primary text-white"
                            : "bg-panel-light dark:bg-panel-dark text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        }`}
                      >
                        {v === "list" ? "List" : "Table"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {rightTab === "matches" &&
            (mode === "match" ? (
              <div className="flex-1 min-h-0 overflow-auto">
                {matches.length === 0 && !error && (
                  <div className="h-full flex items-center justify-center text-slate-600 text-sm">
                    {pattern
                      ? "No matches."
                      : "Enter a pattern and text to see matches."}
                  </div>
                )}

                {matches.length > 0 && matchView === "list" && (
                  <div className="space-y-2">
                    {matches.map((m, idx) => (
                      <div
                        key={`${m.start}-${m.end}-${idx}`}
                        className="rounded-md bg-panel-light dark:bg-panel-dark border border-border-light dark:border-border-dark px-3 py-2 text-xs text-slate-800 dark:text-slate-200"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-slate-500 dark:text-slate-400">
                            #{idx + 1} [{m.start}..{m.end})
                          </span>
                          <span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {m.value}
                          </span>
                        </div>
                        {m.groups.length > 0 && (
                          <CodeBlock
                            code={JSON.stringify(m.groups, null, 2)}
                            language="json"
                            maxHeight="120px"
                            showCopyButton
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {matches.length > 0 && matchView === "table" && (() => {
                  const maxGroups = Math.max(
                    ...matches.map((m) => m.groups.length),
                    0
                  );
                  return (
                    <table className="w-full text-xs font-mono border-collapse">
                      <thead>
                        <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-border-light dark:border-border-dark">
                          <th className="pr-3 py-1.5 font-medium">#</th>
                          <th className="pr-3 py-1.5 font-medium">Match</th>
                          <th className="pr-3 py-1.5 font-medium">Start</th>
                          <th className="pr-3 py-1.5 font-medium">End</th>
                          {Array.from({ length: maxGroups }, (_, i) => (
                            <th key={i} className="pr-3 py-1.5 font-medium">
                              Group {i + 1}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {matches.map((m, idx) => (
                          <tr
                            key={`${m.start}-${m.end}-${idx}`}
                            className="border-b border-border-light dark:border-border-dark hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                          >
                            <td className="pr-3 py-1.5 text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="pr-3 py-1.5">
                              <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                {m.value}
                              </span>
                            </td>
                            <td className="pr-3 py-1.5 text-slate-500">
                              {m.start}
                            </td>
                            <td className="pr-3 py-1.5 text-slate-500">
                              {m.end}
                            </td>
                            {Array.from({ length: maxGroups }, (_, i) => (
                              <td
                                key={i}
                                className="pr-3 py-1.5 text-slate-400"
                              >
                                {m.groups[i] ?? (
                                  <span className="opacity-30">—</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-auto">
                <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">
                  Replace preview (JavaScript engine)
                </div>
                <CodeBlock
                  code={replacedText}
                  language="bash"
                  maxHeight="100%"
                  showCopyButton
                />
              </div>
            ))}

          {rightTab === "explanation" && (
            <div className="flex flex-col flex-1 min-h-0">
              {!pattern ? (
                <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
                  Enter a pattern to see an explanation.
                </div>
              ) : explainError ? (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                  {explainError}
                </div>
              ) : explanation.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
                  Analysing…
                </div>
              ) : (
                <div className="flex-1 overflow-auto space-y-0.5">
                  {explanation.map((token, idx) => (
                    <div
                      key={idx}
                      className="flex items-baseline gap-3 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                      style={{ paddingLeft: `${8 + token.depth * 16}px` }}
                    >
                      <span
                        className={`font-mono text-xs shrink-0 min-w-[80px] ${
                          KIND_STYLES[token.kind] ?? "text-slate-300"
                        }`}
                      >
                        {token.label}
                      </span>
                      <span className="text-slate-500 text-xs">
                        {token.description}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {rightTab === "code" && (
            <div className="flex flex-col flex-1 min-h-0 gap-3">
              {!pattern ? (
                <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
                  Enter a pattern to generate code.
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-xs uppercase tracking-wider text-slate-500">
                      Language
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(Object.keys(LANGUAGE_LABELS) as Language[]).map(
                        (lang) => (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => {
                              languageManuallySet.current = true;
                              setCodeLanguage(lang);
                            }}
                            className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                              codeLanguage === lang
                                ? "bg-primary text-white"
                                : "bg-panel-light dark:bg-panel-dark text-slate-500 dark:text-slate-400 border border-border-light dark:border-border-dark hover:text-slate-700 dark:hover:text-slate-200"
                            }`}
                          >
                            {LANGUAGE_LABELS[lang]}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-auto">
                    <CodeBlock
                      code={generateCode(pattern, flags, codeLanguage)}
                      language={
                        codeLanguage === "typescript"
                          ? "typescript"
                          : codeLanguage === "javascript"
                            ? "typescript"
                            : "bash"
                      }
                      showCopyButton
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="border-t border-border-light dark:border-border-dark px-4 py-2 flex items-center gap-4">
        <button
          type="button"
          onClick={async () => {
            if (!matches.length) return;
            try {
              await navigator.clipboard.writeText(
                matches.map((m) => m.value).join("\n")
              );
            } catch {
              // ignore
            }
          }}
          disabled={matches.length === 0}
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Copy matches
        </button>
        <button
          type="button"
          onClick={async () => {
            if (!pattern) return;
            try {
              await navigator.clipboard.writeText(pattern);
            } catch {
              // ignore
            }
          }}
          disabled={!pattern}
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Copy pattern
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="ml-auto text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export default RegexTesterTool;

