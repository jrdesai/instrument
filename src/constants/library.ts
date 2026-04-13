// src/constants/library.ts
// Display category subtitles — one per display category.
// Everything else (icons, tool counts, category lists) is derived
// from the registry directly via getDisplayCategories().

export const categorySubtitles: Record<string, string> = {
  Encoding: "Convert and transform data formats safely.",
  Security: "Analyze and protect sensitive data.",
  Auth: "Decode, build, and inspect auth tokens.",
  "JSON Tools": "Manipulate and validate JSON structures.",
  Formatting: "Prettify and organize text and code.",
  "Date & Time": "Convert and format dates and timestamps.",
  Numbers: "Convert and compute numeric values.",
  Code: "Test, format, and analyze code.",
  Data: "Transform and convert data formats.",
  Network: "Parse and inspect network data.",
  Media: "Convert and transform media assets locally.",
};
