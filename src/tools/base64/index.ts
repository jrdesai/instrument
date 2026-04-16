/**
 * Base64 tool: registry metadata and lazy-loaded component.
 * Used by the main registry and by routes that render this tool.
 */

import type { Tool } from "../../registry";

/** Registry metadata for the Base64 encoder/decoder tool. */
export const base64ToolMeta: Pick<
  Tool,
  "id" | "name" | "description" | "category" | "roles" | "icon" | "platforms" | "rustCommand" | "keywords"
> = {
  id: "base64-encoder",
  name: "Base64 Encoder",
  description: "Encode and decode text or binary using Base64.",
  category: "encoding",
  roles: ["frontend", "backend", "general"],
  icon: "data_array",
  platforms: ["desktop", "web"],
  rustCommand: "tool_base64_process",
  keywords: ["base64", "encode", "decode", "binary"],
};

export { default } from "./Base64Tool";
