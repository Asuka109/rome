import type {
  AppRuntimeRepositories,
  AppSettingsRepository,
  ConversationRepository,
  WebChatRecapRepository,
} from "@rome-os/app-runtime";
import type { SettingsRepository } from "../db/repositories/settings.js";
import type { WebChatRepository } from "../db/repositories/webchat.js";

export interface CreateAppRuntimeRepositoriesDeps {
  settingsRepo: SettingsRepository;
  webchatRepo: WebChatRepository;
}

export function createAppRuntimeRepositories(
  deps: CreateAppRuntimeRepositoriesDeps,
): AppRuntimeRepositories {
  return {
    settings: createAppSettingsRepository(deps.settingsRepo),
    webchatRecaps: createWebChatRecapRepository(deps.webchatRepo),
    conversations: createConversationRepository(deps.webchatRepo),
  };
}

function createConversationRepository(repo: WebChatRepository): ConversationRepository {
  return {
    ensureChannelConversation: (input) => repo.ensureChannelConversation(input),
    addMessage: (input) => repo.addConversationMessage(input),
    promoteMessageToUser: (sessionId, platformMessageId) =>
      repo.promoteConversationMessageToUser(sessionId, platformMessageId),
    recordOutboundMessage: (input) => repo.recordOutboundConversationMessage(input),
  };
}

function createAppSettingsRepository(repo: SettingsRepository): AppSettingsRepository {
  return {
    get: (key) => repo.get(key),
    set: (key, value) => repo.set(key, value),
  };
}

function createWebChatRecapRepository(repo: WebChatRepository): WebChatRecapRepository {
  return {
    getSession: (id) => repo.getSession(id),
    getMessages: (sessionId) => repo.getMessages(sessionId),
    addTurnRecapMessage: (input) => repo.addTurnRecapMessage(input),
  };
}
