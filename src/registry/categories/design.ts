import React from "react";
import type { Tool } from "../types";

export const designTools: Tool[] = [
  {
    id: "color-contrast",
    cliCommand: "contrast",
    name: "Colour Contrast Checker",
    description:
      "Check foreground/background colour pairs against WCAG AA and AAA contrast ratio requirements.",
    category: "design",
    displayCategory: "Design",
    displayCategoryIcon: "gradient",
    roles: ["frontend", "general"],
    icon: "contrast",
    platforms: ["desktop", "web"],
    rustCommand: "tool_color_contrast_process",
    keywords: [
      "colour",
      "color",
      "contrast",
      "wcag",
      "accessibility",
      "a11y",
      "hex",
      "foreground",
      "background",
      "ratio",
      "aa",
      "aaa",
    ],
    component: React.lazy(() =>
      import("../../tools/color-contrast/ColorContrastTool").then((m) => ({
        default: m.default,
      }))
    ),
    preload: () => { void import("../../tools/color-contrast/ColorContrastTool"); },
    implemented: true,
  },
  {
    id: "css-gradient",
    name: "CSS Gradient Generator",
    description:
      "Build linear, radial, and conic CSS gradients with a live preview.",
    category: "design",
    displayCategory: "Design",
    displayCategoryIcon: "gradient",
    roles: ["frontend", "general"],
    icon: "gradient",
    platforms: ["desktop", "web"],
    keywords: [
      "css",
      "gradient",
      "linear",
      "radial",
      "conic",
      "background",
      "color",
      "colour",
      "design",
      "ui",
      "style",
      "frontend",
    ],
    component: React.lazy(() =>
      import("../../tools/css-gradient/CssGradientTool").then((m) => ({
        default: m.default,
      }))
    ),
    preload: () => { void import("../../tools/css-gradient/CssGradientTool"); },
    implemented: true,
  },
  {
    id: "box-shadow-builder",
    name: "Box Shadow Builder",
    description:
      "Build layered box shadows interactively — offset, blur, spread, colour, and inset. Copy the ready-to-use CSS value.",
    category: "design",
    displayCategory: "Design",
    displayCategoryIcon: "gradient",
    roles: ["frontend", "general"],
    icon: "shadow",
    platforms: ["desktop", "web"],
    keywords: [
      "box-shadow",
      "shadow",
      "css",
      "design",
      "ui",
      "offset",
      "blur",
      "spread",
      "inset",
      "drop shadow",
      "layer",
      "frontend",
      "style",
    ],
    component: React.lazy(() =>
      import("../../tools/box-shadow-builder/BoxShadowBuilderTool").then((m) => ({
        default: m.default,
      }))
    ),
    preload: () => { void import("../../tools/box-shadow-builder/BoxShadowBuilderTool"); },
    implemented: true,
  },
];
