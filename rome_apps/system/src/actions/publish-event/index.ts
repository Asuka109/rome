import { createAppLogger, defineAction, z } from "@rome-os/app-runtime";
import type {
  Action,
  ActionConfig,
  AppActionRuntimeDeps,
  EventPublisher,
} from "@rome-os/app-runtime";

const log = createAppLogger("publish-event");

export interface PublishEventDeps {
  /** The event publisher: the real `EventService` in the main process, an
   * `EventBusProxy` (RPC to main) in a worker. Injected per process so this
   * action never branches on where it runs. */
  eventBus: EventPublisher;
}

export const publishEventInputSchema = z.object({
  name: z
    .string()
    .describe(
      'Event type, e.g. "order.created". Routines with an event-bus trigger whose eventName equals this fire.',
    ),
  payload: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Event data passed to triggered routines as __triggerPayload."),
  source: z
    .string()
    .optional()
    .describe(
      "Optional producer id (matched against a routine's sourcePattern). Defaults to the app id.",
    ),
});

export type PublishEventInput = z.infer<typeof publishEventInputSchema>;

export function createPublishEventAction(
  config: ActionConfig,
  source: string,
  deps: PublishEventDeps,
): Action {
  return defineAction({
    config,
    schema: publishEventInputSchema,
    execute: async ({ name, payload, source: inputSource }) => {
      const result = await deps.eventBus.publish({
        name,
        source: inputSource ?? source,
        payload: payload ?? {},
      });
      log.info("published event", { name, source: inputSource ?? source });
      return { status: "ok", data: result };
    },
  });
}

export function createAction(
  config: ActionConfig,
  deps: AppActionRuntimeDeps<PublishEventDeps>,
): Action {
  return createPublishEventAction(config, deps.appContext.app.id, deps);
}
