import React from "react";
import type { Tool } from "../types";

export const mediaTools: Tool[] = [
  {
    id: "image-converter",
    name: "Image Converter",
    description:
      "Convert images between formats with resize, rotate, flip, and quality control.",
    category: "media",
    displayCategory: "Media",
    displayCategoryIcon: "image",
    roles: ["frontend", "general"],
    icon: "image",
    platforms: ["desktop"],
    rustCommand: "tool_image_convert",
    keywords: [
      "image",
      "convert",
      "png",
      "jpeg",
      "jpg",
      "webp",
      "bmp",
      "tiff",
      "ico",
      "tga",
      "gif",
      "resize",
      "rotate",
      "flip",
      "compress",
      "format",
      "photo",
    ],
    component: React.lazy(() =>
      import("../../tools/image-converter/ImageConverterTool").then((m) => ({
        default: m.default,
      }))
    ),
    preload: () => { void import("../../tools/image-converter/ImageConverterTool"); },
    implemented: true,
  },
];
