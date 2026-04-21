import { useMemo, useState } from "react";
import { CopyButton } from "../../components/tool";
import { useDraftInput, useRestoreStringDraft } from "../../hooks/useDraftInput";

const TOOL_ID = "morse-code";

const MORSE: Record<string, string> = {
  A: ".-",
  B: "-...",
  C: "-.-.",
  D: "-..",
  E: ".",
  F: "..-.",
  G: "--.",
  H: "....",
  I: "..",
  J: ".---",
  K: "-.-",
  L: ".-..",
  M: "--",
  N: "-.",
  O: "---",
  P: ".--.",
  Q: "--.-",
  R: ".-.",
  S: "...",
  T: "-",
  U: "..-",
  V: "...-",
  W: ".--",
  X: "-..-",
  Y: "-.--",
  Z: "--..",
  "0": "-----",
  "1": ".----",
  "2": "..---",
  "3": "...--",
  "4": "....-",
  "5": ".....",
  "6": "-....",
  "7": "--...",
  "8": "---..",
  "9": "----.",
  ".": ".-.-.-",
  ",": "--..--",
  "?": "..--..",
  "'": ".----.",
  "!": "-.-.--",
  "/": "-..-.",
  "(": "-.--.",
  ")": "-.--.-",
  "&": ".-...",
  ":": "---...",
  ";": "-.-.-.",
  "=": "-...-",
  "+": ".-.-.",
  "-": "-....-",
  _: "..--.-",
  '"': ".-..-.",
  $: "...-..-",
  "@": ".--.-.",
};

const FROM_MORSE: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE).map(([char, code]) => [code, char])
);

function encodeToMorse(text: string): string {
  return text
    .toUpperCase()
    .split("")
    .map((ch) => {
      if (ch === " ") return "/";
      return MORSE[ch] ?? "?";
    })
    .join(" ");
}

function decodeFromMorse(morse: string): string {
  return morse
    .trim()
    .split(/\s*\/\s*/)
    .map((word) =>
      word
        .trim()
        .split(/\s+/)
        .map((code) => FROM_MORSE[code] ?? "?")
        .join("")
    )
    .join(" ");
}

export default function MorseCodeTool() {
  const { setDraft } = useDraftInput(TOOL_ID);
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [input, setInput] = useState("");
  useRestoreStringDraft(TOOL_ID, setInput);

  const output = useMemo(() => {
    if (!input.trim()) return "";
    return mode === "encode" ? encodeToMorse(input) : decodeFromMorse(input);
  }, [input, mode]);

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
        {(["encode", "decode"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
              mode === m
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5 flex-1">
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {mode === "encode" ? "Text" : "Morse Code"}
        </label>
        <textarea
          value={input}
          onChange={(e) => {
            const v = e.target.value;
            setInput(v);
            setDraft(v);
          }}
          placeholder={
            mode === "encode"
              ? "Type text to encode…"
              : "Paste Morse code (use spaces between letters, / between words)…"
          }
          className="flex-1 min-h-[120px] resize-none rounded-lg border border-border-light dark:border-border-dark bg-input-light dark:bg-input-dark px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-primary/40"
          spellCheck={false}
        />
      </div>

      <div className="flex flex-col gap-1.5 flex-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {mode === "encode" ? "Morse Code" : "Text"}
          </label>
          {output ? <CopyButton value={output} /> : null}
        </div>
        <div className="flex-1 min-h-[120px] rounded-lg border border-border-light dark:border-border-dark bg-output-light dark:bg-output-dark px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100 overflow-auto">
          {output || (
            <span className="text-slate-400 dark:text-slate-500">
              {mode === "encode" ? "Morse output appears here…" : "Decoded text appears here…"}
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Spaces separate letters · <span className="font-mono">/</span> separates words · Unknown characters become{" "}
        <span className="font-mono">?</span>
      </p>
    </div>
  );
}
