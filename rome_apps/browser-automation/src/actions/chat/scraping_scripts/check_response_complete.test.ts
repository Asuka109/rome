import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

const scriptSource = readFileSync(new URL("./check_response_complete.js", import.meta.url), "utf8");

function loadScript(responseFactory: () => unknown[]) {
  const document = {
    querySelectorAll: vi.fn((selector: string) => {
      if (selector === "article") {
        return responseFactory();
      }

      if (selector === "h4") {
        return [];
      }

      return [];
    }),
  };
  const context = {
    console,
    document,
    window: {},
    Date,
    setTimeout,
    clearTimeout,
    MouseEvent: function MouseEvent(type: string, init: Record<string, unknown>) {
      return { type, ...init };
    },
    __ROME_CHATGPT_CHECK_RESPONSE_COMPLETE_AUTORUN__: false,
  } as Record<string, unknown>;
  context.globalThis = context;

  vm.runInNewContext(scriptSource, context);

  return { context, document };
}

describe("check_response_complete script", () => {
  it("returns complete once the latest response exposes its toolbar actions", async () => {
    const scrollIntoView = vi.fn();
    const dispatchEvent = vi.fn();
    const parentElement = {
      dispatchEvent,
      querySelector: vi.fn(() => null),
    };
    const copyButton = { id: "copy" };
    const response = {
      parentElement,
      scrollIntoView,
      querySelector: vi.fn((selector: string) => {
        if (selector === '[data-message-author-role="assistant"]') {
          return { id: "assistant" };
        }

        if (selector === 'button[aria-label="Copy response"]') {
          return copyButton;
        }

        return null;
      }),
    };
    const { context } = loadScript(() => [response]);

    const result = await (
      context.waitForLatestChatGPTResponseComplete as (options?: {
        timeout?: number;
      }) => Promise<{ complete: boolean }>
    )({ timeout: 5_000 });

    expect(result).toEqual({ complete: true });
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: "center",
      inline: "nearest",
    });
    expect(dispatchEvent).toHaveBeenCalledTimes(3);
  });

  it("returns incomplete after the timeout window elapses", async () => {
    vi.useFakeTimers();
    try {
      const scrollIntoView = vi.fn();
      const dispatchEvent = vi.fn();
      const parentElement = {
        dispatchEvent,
        querySelector: vi.fn(() => null),
      };
      const response = {
        parentElement,
        scrollIntoView,
        querySelector: vi.fn((selector: string) => {
          if (selector === '[data-message-author-role="assistant"]') {
            return { id: "assistant" };
          }

          return null;
        }),
      };
      const { context } = loadScript(() => [response]);

      const resultPromise = (
        context.waitForLatestChatGPTResponseComplete as (options?: {
          timeout?: number;
        }) => Promise<{ complete: boolean }>
      )({ timeout: 400 });

      await vi.runAllTimersAsync();

      await expect(resultPromise).resolves.toEqual({ complete: false });
    } finally {
      vi.useRealTimers();
    }
  });
});
