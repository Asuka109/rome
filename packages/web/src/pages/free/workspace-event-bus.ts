import { createContext, useContext } from "react";

export interface WorkspaceEventBus {
  emit<T>(event: string, payload: T): void;
  on<T>(event: string, listener: (payload: T) => void): () => void;
}

export function createWorkspaceEventBus(): WorkspaceEventBus {
  const subs = new Map<string, Set<(payload: unknown) => void>>();

  return {
    emit: (event, payload) => {
      subs.get(event)?.forEach((fn) => fn(payload));
    },
    on: (event, listener) => {
      let bucket = subs.get(event);
      if (!bucket) {
        bucket = new Set();
        subs.set(event, bucket);
      }
      bucket.add(listener as (payload: unknown) => void);
      return () => {
        bucket!.delete(listener as (payload: unknown) => void);
      };
    },
  };
}

export const WorkspaceEventBusContext = createContext<WorkspaceEventBus | null>(null);

export function useWorkspaceEventBus(): WorkspaceEventBus | null {
  return useContext(WorkspaceEventBusContext);
}
