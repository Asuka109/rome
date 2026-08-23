import type {
  BrowserCapabilityDiscovery as CapabilityDiscovery,
  RunDiscoveredBrowserScriptResult,
  RunDiscoveredBrowserScriptOptions,
} from "@rome-os/app-runtime/browser";
import {
  buildBrowserScriptExpression as buildBrowserScriptExpressionBase,
  loadCachedScriptSource as loadCachedScriptSourceBase,
  runDiscoveredBrowserScript as runDiscoveredBrowserScriptBase,
} from "@rome-os/app-runtime/browser";

export type {
  BuildBrowserScriptExpressionOptions,
  RunDiscoveredBrowserScriptOptions,
} from "@rome-os/app-runtime/browser";

export const loadCachedScriptSource = loadCachedScriptSourceBase;
export const buildBrowserScriptExpression = buildBrowserScriptExpressionBase;

export async function runDiscoveredBrowserScript<TResult>(
  capabilityDiscovery: CapabilityDiscovery,
  options: RunDiscoveredBrowserScriptOptions,
): Promise<RunDiscoveredBrowserScriptResult<TResult>> {
  return await runDiscoveredBrowserScriptBase<TResult>(capabilityDiscovery, options);
}
