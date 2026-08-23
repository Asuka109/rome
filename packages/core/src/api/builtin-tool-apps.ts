import type { AppRefDto } from "@rome/api-types/trace-segments";

const ROME_LOGO_URL = "/icon.svg";

export const SYSTEM_PSEUDO_APP: AppRefDto = {
  id: "rome",
  name: "Rome",
  iconUrl: ROME_LOGO_URL,
};

export const BUILTIN_TOOL_APPS = {
  files: { id: "files", name: "Files", iconUrl: "/builtin-icons/files.svg" },
  terminal: { id: "terminal", name: "Terminal", iconUrl: "/builtin-icons/terminal.svg" },
  search: { id: "search", name: "Search", iconUrl: "/builtin-icons/search.svg" },
  browser: { id: "browser", name: "Browser", iconUrl: "/builtin-icons/browser.svg" },
  tasks: { id: "tasks", name: "Tasks", iconUrl: "/builtin-icons/tasks.svg" },
  subagent: { id: "subagent", name: "Subagent", iconUrl: "/builtin-icons/subagent.svg" },
  notebook: { id: "notebook", name: "Notebook", iconUrl: "/builtin-icons/notebook.svg" },
  image: { id: "image-generation", name: "Image Generation", iconUrl: "/builtin-icons/image.svg" },
} as const satisfies Record<string, AppRefDto>;

export type BuiltinToolAppKey = keyof typeof BUILTIN_TOOL_APPS;

export const TOOL_TO_BUILTIN: Record<string, BuiltinToolAppKey> = {
  Read: "files",
  Edit: "files",
  Write: "files",
  Bash: "terminal",
  Grep: "search",
  Glob: "search",
  WebSearch: "browser",
  WebFetch: "browser",
  TodoWrite: "tasks",
  NotebookEdit: "notebook",
  Task: "subagent",
  ImageGeneration: "image",
  image_generation: "image",
  image_generation_call: "image",
  image_gen: "image",
};

export const DISCOVERY_SHIM_TOOLS: ReadonlySet<string> = new Set([
  "list",
  "describe",
  "search",
  "list_actions",
  "read_action",
  "search_actions",
  "list_skills",
  "search_skills",
  "read_skill",
]);
