#!/usr/bin/env node
// Entry point: apply every as-code ClickStack dashboard module against the
// target service in one pass (shared source resolution). Add a module by
// importing it and listing it below — each exports { ownerTag, requiredSources,
// buildDashboards }. See ./clickstack.mjs for auth, env, and DRY_RUN.

import * as agentTraces from "./agent-traces.mjs";
import * as chatSessionAudit from "./chat-session-audit.mjs";
import * as guardianUsage from "./guardian-usage.mjs";
import * as logVolumeStorage from "./log-volume-storage.mjs";
import { applyAll } from "./clickstack.mjs";

applyAll([agentTraces, chatSessionAudit, guardianUsage, logVolumeStorage]).catch((e) => {
  console.error(e.message);
  process.exit(1);
});
