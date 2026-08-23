import type { AppRefDto, ToolUseBlock } from "./types.js";

const SYSTEM_PSEUDO_APP: AppRefDto = {
  id: "rome",
  name: "Rome",
  iconUrl: "/icon.svg",
};

const BUILTIN_TOOL_APPS: Record<string, AppRefDto> = {
  files: { id: "files", name: "Files", iconUrl: "/builtin-icons/files.svg" },
  terminal: { id: "terminal", name: "Terminal", iconUrl: "/builtin-icons/terminal.svg" },
  search: { id: "search", name: "Search", iconUrl: "/builtin-icons/search.svg" },
  browser: { id: "browser", name: "Browser", iconUrl: "/builtin-icons/browser.svg" },
  tasks: { id: "tasks", name: "Tasks", iconUrl: "/builtin-icons/tasks.svg" },
  subagent: { id: "subagent", name: "Subagent", iconUrl: "/builtin-icons/subagent.svg" },
  notebook: { id: "notebook", name: "Notebook", iconUrl: "/builtin-icons/notebook.svg" },
  image: { id: "image-generation", name: "Image Generation", iconUrl: "/builtin-icons/image.svg" },
};

const TOOL_TO_BUILTIN: Record<string, keyof typeof BUILTIN_TOOL_APPS> = {
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

const DISCOVERY_SHIM_TOOLS = new Set([
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

const EXECUTE_SHIM_TOOLS = new Set(["execute", "execute_action"]);

function readActionName(input: unknown): string | null {
  if (!input || typeof input !== "object") return null;
  const value =
    (input as { action_name?: unknown; actionName?: unknown }).action_name ??
    (input as { actionName?: unknown }).actionName;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function appRefFromActionName(actionName: string): AppRefDto | null {
  const separator = actionName.indexOf("_");
  if (separator <= 0) return null;
  const appId = actionName.slice(0, separator);
  if (!/^[a-z0-9-]+$/.test(appId)) return null;
  return {
    id: appId,
    name: appId
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    iconUrl: `/api/apps/${encodeURIComponent(appId)}/icon`,
  };
}

export function resolvePortableToolApp(block: ToolUseBlock): AppRefDto {
  if (EXECUTE_SHIM_TOOLS.has(block.tool)) {
    const actionName = readActionName(block.input);
    const appRef = actionName ? appRefFromActionName(actionName) : null;
    return appRef ?? SYSTEM_PSEUDO_APP;
  }
  if (DISCOVERY_SHIM_TOOLS.has(block.tool)) return SYSTEM_PSEUDO_APP;
  const key = TOOL_TO_BUILTIN[block.tool];
  if (key) return BUILTIN_TOOL_APPS[key];
  return SYSTEM_PSEUDO_APP;
}
