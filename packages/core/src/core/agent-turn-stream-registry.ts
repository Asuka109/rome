import type { StreamAgentMessage } from "./agent-session.js";

export interface ActiveAgentTurnStream {
  sessionId: string;
  turnId: string;
  agentName: string;
  startedAt: string;
  finished: boolean;
  messages(): readonly StreamAgentMessage[];
  subscribe(listener: (message: StreamAgentMessage) => void): () => void;
  waitForFinish(): Promise<void>;
  /** Present only when the owner can safely interrupt this turn in isolation. */
  interrupt?(reason?: string): Promise<void>;
}

interface MutableAgentTurnStream extends ActiveAgentTurnStream {
  publish(message: StreamAgentMessage): void;
  finish(): void;
}

export interface AgentTurnStreamRegistry {
  register(input: {
    sessionId: string;
    turnId: string;
    agentName: string;
    interrupt?(reason?: string): Promise<void>;
  }): MutableAgentTurnStream;
  get(turnId: string): ActiveAgentTurnStream | undefined;
  listBySession(sessionId: string): ActiveAgentTurnStream[];
}

const FINISHED_STREAM_TTL_MS = 30_000;

export function createAgentTurnStreamRegistry(): AgentTurnStreamRegistry {
  const streams = new Map<string, MutableAgentTurnStream>();

  return {
    register(input) {
      if (streams.has(input.turnId)) {
        throw new Error(`Turn stream "${input.turnId}" is already registered`);
      }
      const values: StreamAgentMessage[] = [];
      const listeners = new Set<(message: StreamAgentMessage) => void>();
      let resolveFinished!: () => void;
      const finishedPromise = new Promise<void>((resolve) => {
        resolveFinished = resolve;
      });
      const stream: MutableAgentTurnStream = {
        sessionId: input.sessionId,
        turnId: input.turnId,
        agentName: input.agentName,
        startedAt: new Date().toISOString(),
        finished: false,
        messages: () => values,
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        waitForFinish: () => finishedPromise,
        interrupt: input.interrupt,
        publish(message) {
          if (stream.finished) return;
          values.push(message);
          for (const listener of listeners) listener(message);
        },
        finish() {
          if (stream.finished) return;
          stream.finished = true;
          resolveFinished();
          setTimeout(() => {
            if (streams.get(input.turnId) === stream) streams.delete(input.turnId);
          }, FINISHED_STREAM_TTL_MS).unref?.();
        },
      };
      streams.set(input.turnId, stream);
      return stream;
    },

    get(turnId) {
      return streams.get(turnId);
    },

    listBySession(sessionId) {
      return [...streams.values()].filter(
        (stream) => stream.sessionId === sessionId && !stream.finished,
      );
    },
  };
}
