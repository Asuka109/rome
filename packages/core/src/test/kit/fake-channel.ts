import { MockProviderAdapter, buildMessage } from "../helpers.js";
import type { NormalizedMessage, OutgoingMessage } from "../../types.js";

// FakeChannelEndpoint — drive a conversation from the user's side.
//
// The chat-network SDK (grammy, Baileys, …) is the genuine edge; everything
// inward of the adapter interface should run for real. This endpoint plays
// the remote network: `send()` injects an incoming message exactly where the
// SDK would, and `nextReply()` awaits what Rome sent back out.

export interface ChannelReply {
  channelUserId: string;
  threadId: string;
  message: OutgoingMessage;
}

interface ReplyWaiter {
  resolve: (reply: ChannelReply) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class FakeChannelEndpoint extends MockProviderAdapter {
  private waiters: ReplyWaiter[] = [];
  private readCursor = 0;

  override async sendMessage(
    channelUserId: string,
    threadId: string,
    message: OutgoingMessage,
  ): Promise<void> {
    await super.sendMessage(channelUserId, threadId, message);
    this.drainWaiters();
  }

  /** Inject an incoming user message, as if it arrived from the network. */
  async send(overrides: Partial<NormalizedMessage> = {}): Promise<void> {
    await this.simulateMessage(
      buildMessage({
        channel: this.channelName as NormalizedMessage["channel"],
        ...overrides,
      }),
    );
  }

  /** All messages Rome sent out on this channel so far. */
  replies(): ChannelReply[] {
    return [...this.sentMessages];
  }

  /**
   * Await the next outgoing message not yet consumed by a previous
   * `nextReply()` call. Rejects after `timeoutMs` (default 2s) so a missing
   * reply fails the test instead of hanging it.
   */
  async nextReply(opts: { timeoutMs?: number } = {}): Promise<ChannelReply> {
    if (this.readCursor < this.sentMessages.length) {
      return this.sentMessages[this.readCursor++];
    }
    const timeoutMs = opts.timeoutMs ?? 2_000;
    return new Promise<ChannelReply>((resolve, reject) => {
      const waiter: ReplyWaiter = {
        resolve,
        reject,
        timer: setTimeout(() => {
          this.waiters = this.waiters.filter((w) => w !== waiter);
          reject(new Error(`No reply on channel "${this.channelName}" within ${timeoutMs}ms`));
        }, timeoutMs),
      };
      waiter.timer.unref?.();
      this.waiters.push(waiter);
    });
  }

  private drainWaiters(): void {
    while (this.waiters.length > 0 && this.readCursor < this.sentMessages.length) {
      const waiter = this.waiters.shift()!;
      clearTimeout(waiter.timer);
      waiter.resolve(this.sentMessages[this.readCursor++]);
    }
  }
}
