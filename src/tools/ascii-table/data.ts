export type CharBlock =
  | "control"
  | "ascii-printable"
  | "latin-supplement"
  | "currency"
  | "math"
  | "arrows"
  | "box-drawing"
  | "block-elements"
  | "geometric"
  | "misc-symbols"
  | "emoji";

export interface CharEntry {
  cp: number;
  ch: string;
  name: string;
  abbr?: string;
  block: CharBlock;
}

const CONTROL_C0: Array<{ cp: number; abbr: string; name: string }> = [
  { cp: 0, abbr: "NUL", name: "NULL" },
  { cp: 1, abbr: "SOH", name: "START OF HEADING" },
  { cp: 2, abbr: "STX", name: "START OF TEXT" },
  { cp: 3, abbr: "ETX", name: "END OF TEXT" },
  { cp: 4, abbr: "EOT", name: "END OF TRANSMISSION" },
  { cp: 5, abbr: "ENQ", name: "ENQUIRY" },
  { cp: 6, abbr: "ACK", name: "ACKNOWLEDGE" },
  { cp: 7, abbr: "BEL", name: "BELL" },
  { cp: 8, abbr: "BS", name: "BACKSPACE" },
  { cp: 9, abbr: "HT", name: "HORIZONTAL TAB" },
  { cp: 10, abbr: "LF", name: "LINE FEED" },
  { cp: 11, abbr: "VT", name: "VERTICAL TAB" },
  { cp: 12, abbr: "FF", name: "FORM FEED" },
  { cp: 13, abbr: "CR", name: "CARRIAGE RETURN" },
  { cp: 14, abbr: "SO", name: "SHIFT OUT" },
  { cp: 15, abbr: "SI", name: "SHIFT IN" },
  { cp: 16, abbr: "DLE", name: "DATA LINK ESCAPE" },
  { cp: 17, abbr: "DC1", name: "DEVICE CONTROL 1" },
  { cp: 18, abbr: "DC2", name: "DEVICE CONTROL 2" },
  { cp: 19, abbr: "DC3", name: "DEVICE CONTROL 3" },
  { cp: 20, abbr: "DC4", name: "DEVICE CONTROL 4" },
  { cp: 21, abbr: "NAK", name: "NEGATIVE ACKNOWLEDGE" },
  { cp: 22, abbr: "SYN", name: "SYNCHRONOUS IDLE" },
  { cp: 23, abbr: "ETB", name: "END OF TRANSMISSION BLOCK" },
  { cp: 24, abbr: "CAN", name: "CANCEL" },
  { cp: 25, abbr: "EM", name: "END OF MEDIUM" },
  { cp: 26, abbr: "SUB", name: "SUBSTITUTE" },
  { cp: 27, abbr: "ESC", name: "ESCAPE" },
  { cp: 28, abbr: "FS", name: "FILE SEPARATOR" },
  { cp: 29, abbr: "GS", name: "GROUP SEPARATOR" },
  { cp: 30, abbr: "RS", name: "RECORD SEPARATOR" },
  { cp: 31, abbr: "US", name: "UNIT SEPARATOR" },
];

const CONTROL_C1: Array<{ cp: number; abbr: string; name: string }> = [
  { cp: 128, abbr: "PAD", name: "PADDING CHARACTER" },
  { cp: 129, abbr: "HOP", name: "HIGH OCTET PRESET" },
  { cp: 130, abbr: "BPH", name: "BREAK PERMITTED HERE" },
  { cp: 131, abbr: "NBH", name: "NO BREAK HERE" },
  { cp: 132, abbr: "IND", name: "INDEX" },
  { cp: 133, abbr: "NEL", name: "NEXT LINE" },
  { cp: 134, abbr: "SSA", name: "START OF SELECTED AREA" },
  { cp: 135, abbr: "ESA", name: "END OF SELECTED AREA" },
  { cp: 136, abbr: "HTS", name: "CHARACTER TABULATION SET" },
  { cp: 137, abbr: "HTJ", name: "CHARACTER TABULATION WITH JUSTIFICATION" },
  { cp: 138, abbr: "VTS", name: "LINE TABULATION SET" },
  { cp: 139, abbr: "PLD", name: "PARTIAL LINE FORWARD" },
  { cp: 140, abbr: "PLU", name: "PARTIAL LINE BACKWARD" },
  { cp: 141, abbr: "RI", name: "REVERSE LINE FEED" },
  { cp: 142, abbr: "SS2", name: "SINGLE SHIFT TWO" },
  { cp: 143, abbr: "SS3", name: "SINGLE SHIFT THREE" },
  { cp: 144, abbr: "DCS", name: "DEVICE CONTROL STRING" },
  { cp: 145, abbr: "PU1", name: "PRIVATE USE ONE" },
  { cp: 146, abbr: "PU2", name: "PRIVATE USE TWO" },
  { cp: 147, abbr: "STS", name: "SET TRANSMIT STATE" },
  { cp: 148, abbr: "CCH", name: "CANCEL CHARACTER" },
  { cp: 149, abbr: "MW", name: "MESSAGE WAITING" },
  { cp: 150, abbr: "SPA", name: "START OF GUARDED AREA" },
  { cp: 151, abbr: "EPA", name: "END OF GUARDED AREA" },
  { cp: 152, abbr: "SOS", name: "START OF STRING" },
  { cp: 153, abbr: "SGCI", name: "SINGLE GRAPHIC CHARACTER INTRODUCER" },
  { cp: 154, abbr: "SCI", name: "SINGLE CHARACTER INTRODUCER" },
  { cp: 155, abbr: "CSI", name: "CONTROL SEQUENCE INTRODUCER" },
  { cp: 156, abbr: "ST", name: "STRING TERMINATOR" },
  { cp: 157, abbr: "OSC", name: "OPERATING SYSTEM COMMAND" },
  { cp: 158, abbr: "PM", name: "PRIVACY MESSAGE" },
  { cp: 159, abbr: "APC", name: "APPLICATION PROGRAM COMMAND" },
];

const ASCII_PUNCT_NAMES: Record<number, string> = {
  32: "SPACE",
  33: "EXCLAMATION MARK",
  34: "QUOTATION MARK",
  35: "NUMBER SIGN",
  36: "DOLLAR SIGN",
  37: "PERCENT SIGN",
  38: "AMPERSAND",
  39: "APOSTROPHE",
  40: "LEFT PARENTHESIS",
  41: "RIGHT PARENTHESIS",
  42: "ASTERISK",
  43: "PLUS SIGN",
  44: "COMMA",
  45: "HYPHEN-MINUS",
  46: "FULL STOP",
  47: "SOLIDUS",
  58: "COLON",
  59: "SEMICOLON",
  60: "LESS-THAN SIGN",
  61: "EQUALS SIGN",
  62: "GREATER-THAN SIGN",
  63: "QUESTION MARK",
  64: "COMMERCIAL AT",
  91: "LEFT SQUARE BRACKET",
  92: "REVERSE SOLIDUS",
  93: "RIGHT SQUARE BRACKET",
  94: "CIRCUMFLEX ACCENT",
  95: "LOW LINE",
  96: "GRAVE ACCENT",
  123: "LEFT CURLY BRACKET",
  124: "VERTICAL LINE",
  125: "RIGHT CURLY BRACKET",
  126: "TILDE",
};

const LATIN1_NAMES: Record<number, string> = {
  160: "NO-BREAK SPACE",
  161: "INVERTED EXCLAMATION MARK",
  162: "CENT SIGN",
  163: "POUND SIGN",
  164: "CURRENCY SIGN",
  165: "YEN SIGN",
  166: "BROKEN BAR",
  167: "SECTION SIGN",
  168: "DIAERESIS",
  169: "COPYRIGHT SIGN",
  170: "FEMININE ORDINAL INDICATOR",
  171: "LEFT-POINTING DOUBLE ANGLE QUOTATION MARK",
  172: "NOT SIGN",
  173: "SOFT HYPHEN",
  174: "REGISTERED SIGN",
  175: "MACRON",
  176: "DEGREE SIGN",
  177: "PLUS-MINUS SIGN",
  178: "SUPERSCRIPT TWO",
  179: "SUPERSCRIPT THREE",
  180: "ACUTE ACCENT",
  181: "MICRO SIGN",
  182: "PILCROW SIGN",
  183: "MIDDLE DOT",
  184: "CEDILLA",
  185: "SUPERSCRIPT ONE",
  186: "MASCULINE ORDINAL INDICATOR",
  187: "RIGHT-POINTING DOUBLE ANGLE QUOTATION MARK",
  188: "VULGAR FRACTION ONE QUARTER",
  189: "VULGAR FRACTION ONE HALF",
  190: "VULGAR FRACTION THREE QUARTERS",
  191: "INVERTED QUESTION MARK",
};

function pushAsciiPrintable(out: CharEntry[]) {
  for (let cp = 32; cp <= 126; cp += 1) {
    let name = ASCII_PUNCT_NAMES[cp];
    if (!name && cp >= 48 && cp <= 57) name = `DIGIT ${String.fromCodePoint(cp)}`;
    if (!name && cp >= 65 && cp <= 90) name = `LATIN CAPITAL LETTER ${String.fromCodePoint(cp)}`;
    if (!name && cp >= 97 && cp <= 122) name = `LATIN SMALL LETTER ${String.fromCodePoint(cp)}`;
    out.push({ cp, ch: String.fromCodePoint(cp), name: name ?? `U+${cp.toString(16).toUpperCase()}`, block: "ascii-printable" });
  }
}

function pushLatin1(out: CharEntry[]) {
  for (const c of CONTROL_C1) out.push({ cp: c.cp, ch: "", name: c.name, abbr: c.abbr, block: "latin-supplement" });
  for (let cp = 160; cp <= 255; cp += 1) {
    out.push({
      cp,
      ch: String.fromCodePoint(cp),
      name: LATIN1_NAMES[cp] ?? `LATIN-1 U+${cp.toString(16).toUpperCase()}`,
      block: "latin-supplement",
    });
  }
}

function addChars(out: CharEntry[], chars: string[], block: CharBlock, prefix: string) {
  for (const ch of chars) {
    const cp = ch.codePointAt(0);
    if (cp == null) continue;
    if (out.some((e) => e.cp === cp)) continue;
    out.push({
      cp,
      ch,
      name: `${prefix} U+${cp.toString(16).toUpperCase().padStart(4, "0")}`,
      block,
    });
  }
}

const CHAR_DATA_BUILD: CharEntry[] = [];
for (const c of CONTROL_C0) CHAR_DATA_BUILD.push({ cp: c.cp, ch: "", name: c.name, abbr: c.abbr, block: "control" });
pushAsciiPrintable(CHAR_DATA_BUILD);
CHAR_DATA_BUILD.push({ cp: 127, ch: "", abbr: "DEL", name: "DELETE", block: "control" });
pushLatin1(CHAR_DATA_BUILD);

addChars(CHAR_DATA_BUILD, ["€", "₿", "₹", "₣", "₦", "₨", "₭", "₺", "₽", "￥", "￡", "￠"], "currency", "CURRENCY");
addChars(CHAR_DATA_BUILD, "∀ ∂ ∃ ∅ ∇ ∈ ∉ ∋ ∏ ∑ − ∓ ∔ ∕ ∗ ∘ √ ∝ ∞ ∟ ∠ ∡ ∢ ∣ ∧ ∨ ∩ ∪ ∫ ∬ ∭ ∮ ∯ ∰ ≈ ≉ ≠ ≡ ≢ ≤ ≥ ≦ ≧ ≪ ≫ ⊂ ⊃ ⊄ ⊆ ⊇ ⊕ ⊗ ⊙ ⊥ ⋅ ⋮ ⋯ π μ Σ Ω α β γ δ ε θ λ φ".split(" "), "math", "MATH");
addChars(CHAR_DATA_BUILD, "← ↑ → ↓ ↔ ↕ ↖ ↗ ↘ ↙ ↚ ↛ ↞ ↠ ↣ ↦ ↩ ↪ ↫ ↬ ↭ ↮ ↯ ↰ ↱ ↲ ↳ ↴ ↵ ↶ ↷ ↺ ↻ ↼ ↽ ↾ ↿ ⇀ ⇁ ⇂ ⇃ ⇄ ⇅ ⇆ ⇇ ⇈ ⇉ ⇊ ⇋ ⇌ ⇍ ⇎ ⇏ ⇐ ⇑ ⇒ ⇓ ⇔ ⇕ ⇖ ⇗ ⇘ ⇙ ⟹ ⟺ ⟵ ⟶ ⟷".split(" "), "arrows", "ARROW");
for (let cp = 0x2500; cp <= 0x257f; cp += 1) addChars(CHAR_DATA_BUILD, [String.fromCodePoint(cp)], "box-drawing", "BOX DRAWING");
for (let cp = 0x2580; cp <= 0x259f; cp += 1) addChars(CHAR_DATA_BUILD, [String.fromCodePoint(cp)], "block-elements", "BLOCK ELEMENT");
addChars(CHAR_DATA_BUILD, "■ □ ▢ ▣ ▤ ▥ ▦ ▧ ▨ ▩ ▪ ▫ ▬ ▭ ▮ ▯ ▰ ▱ ▲ △ ▴ ▵ ▶ ▷ ▸ ▹ ► ▻ ▼ ▽ ▾ ▿ ◀ ◁ ◂ ◃ ◄ ◅ ◆ ◇ ◈ ◉ ◊ ○ ◌ ◍ ◎ ● ◐ ◑ ◒ ◓ ◔ ◕ ◖ ◗ ◘ ◙ ◚ ◛ ◜ ◝ ◞ ◟ ◠ ◡ ◢ ◣ ◤ ◥ ◦ ◧ ◨ ◩ ◪ ◫ ◬ ◭ ◮ ◯".split(" "), "geometric", "GEOMETRIC");
addChars(CHAR_DATA_BUILD, "☀ ☁ ☂ ☃ ☄ ★ ☆ ☇ ☈ ☉ ☊ ☋ ☌ ☍ ☎ ☏ ☐ ☑ ☒ ☓ ☔ ☕ ☖ ☗ ☘ ☙ ☚ ☛ ☜ ☝ ☞ ☟ ☠ ☡ ☢ ☣ ☤ ☥ ☦ ☧ ☨ ☩ ☪ ☫ ☬ ☭ ☮ ☯ ☰ ☱ ☲ ☳ ☴ ☵ ☶ ☷ ☸ ☹ ☺ ☻ ☼ ☽ ☾ ♀ ♂ ♠ ♡ ♢ ♣ ♤ ♥ ♦ ♧ ♨ ♩ ♪ ♫ ♬ ♭ ♮ ♯ ✀ ✁ ✂ ✃ ✄ ✅ ✆ ✇ ✈ ✉ ✊ ✋ ✌ ✍ ✎ ✏ ✐ ✑ ✒ ✓ ✔ ✕ ✖ ✗ ✘ ✙ ✚ ✛ ✜ ✝ ✞ ✟ ✠ ✡ ✢ ✣ ✤ ✥ ✦ ✧ ✨ ✩ ✪ ✫ ✬ ✭ ✮ ✯ ✰ ✱ ✲ ✳ ✴ ✵ ✶ ✷ ✸ ✹ ✺ ✻ ✼ ✽ ✾ ✿ ❀ ❁ ❂ ❃ ❄ ❅ ❆ ❇ ❈ ❉ ❊ ❋ ❌ ❍ ❎ ❏ ❐ ❑ ❒ ❓ ❔ ❕ ❖ ❗ ❘ ❙ ❚ ❛ ❜ ❝ ❞ ™".split(" "), "misc-symbols", "SYMBOL");
addChars(
  CHAR_DATA_BUILD,
  "😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 😉 😍 🥰 😘 😋 😛 😜 🤪 😎 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😨 😰 😱 🤔 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 🤒 🤕 🤑 🤠 😈 👿 👹 👺 💀 ☠️ 👻 👽 👾 🤖 🎃 😺 👋 🤚 🖐 ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✝️ ☪️ 🕉️ ✡️ 🔯 🕎 ☯️ 🎉 🎊 🎈 🎁 🎀 🎗️ 🎟️ 🎫 🏆 🥇 🥈 🥉 🏅 🎖️ 🚀 🌟 ⭐ 💫 ✨ 🌈 ☀️ 🌤️ ⛅ 🌦️ 🌧️ ⛈️ 🌩️ 🌨️ ✅ ❌ ⚠️ 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟤 🔶 🔷 🔸 🔹 🔺 🔻 💠 🔘 🔲 🔳 ▪️ ▫️ ◾ ◽ ◼️ ◻️ ⬛ ⬜".split(" "),
  "emoji",
  "EMOJI"
);

export const CHAR_DATA: CharEntry[] = CHAR_DATA_BUILD;
