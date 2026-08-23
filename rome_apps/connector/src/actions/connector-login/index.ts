import {
  defineAction,
  z,
  type Action,
  type ActionConfig,
  type AppActionRuntimeDeps,
} from "@rome-os/app-runtime";

import { loadConnectorClient } from "../../shared.js";

const inputSchema = z.object({});

export function createAction(config: ActionConfig, _deps: AppActionRuntimeDeps): Action {
  return defineAction({
    config,
    schema: inputSchema,
    execute: async () => {
      const client = await loadConnectorClient();
      if (client) {
        // Already signed in — idempotent so the agent can call this defensively
        // without ever stacking a second sign-in card.
        return { status: "ok", data: { status: "signed_in" } };
      }
      // Not signed in: render the single inline sign-in card. Login is
      // request-host-coupled (the authorize tab opens in the owner's browser),
      // so it must originate in the component, not headlessly here. Sign-in is
      // account-wide, so this is the one place a login card is ever rendered —
      // connector_connect points the agent here instead of rendering its own,
      // which is what stops duplicate login cards when several toolkits are
      // connected in one turn.
      return {
        status: "pending_interaction",
        interaction: {
          appId: "connector",
          promptText:
            "Sign in to Composio using the shown card. This authorizes Rome account-wide — once signed in, re-run connector_connect for each toolkit you want to connect.",
          render: { kind: "inline", componentId: "login-card", props: {} },
        },
      };
    },
  });
}
