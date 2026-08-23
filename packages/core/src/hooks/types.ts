export interface ChannelMessageHook {
  register(): Promise<void>;
  registerConnection(connectionId: string, service: string): void;
}
