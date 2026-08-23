import type { Octokit } from "@octokit/rest";

type GithubHookConfig = {
  url?: string;
  content_type?: string;
  secret?: string;
  insecure_ssl?: string;
};

export interface GithubHook {
  id: number;
  active?: boolean;
  events?: string[];
  config?: GithubHookConfig;
}

export interface GithubHookClient {
  listHooks(): Promise<GithubHook[]>;
  createHook(input: GithubHookMutationInput): Promise<GithubHook>;
  updateHook(hookId: number, input: GithubHookMutationInput): Promise<GithubHook>;
  deleteHook(hookId: number): Promise<void>;
}

export type GithubHookDeleteClient = Pick<GithubHookClient, "listHooks" | "deleteHook">;

export interface GithubHookMutationInput {
  active: true;
  events: string[];
  config: {
    url: string;
    content_type: "json";
    secret: string;
    insecure_ssl: "0";
  };
}

export type GithubHookTarget = { repo: string } | { org: string };

export function createGithubHookClient(
  octokit: Octokit,
  target: GithubHookTarget,
): GithubHookClient {
  return "repo" in target
    ? repoHookClient(octokit, target.repo)
    : orgHookClient(octokit, target.org);
}

function repoParts(repo: string): { owner: string; repo: string } {
  const [owner, name] = repo.split("/");
  return { owner, repo: name };
}

function toGithubHook(hook: {
  id: number;
  active?: boolean;
  events?: string[];
  config?: { url?: string; content_type?: string; secret?: string; insecure_ssl?: string | number };
}): GithubHook {
  return {
    id: hook.id,
    active: hook.active,
    events: hook.events,
    config: {
      url: hook.config?.url,
      content_type: hook.config?.content_type,
      secret: hook.config?.secret,
      insecure_ssl:
        hook.config?.insecure_ssl == null ? undefined : String(hook.config.insecure_ssl),
    },
  };
}

function repoHookClient(octokit: Octokit, repo: string): GithubHookClient {
  const target = repoParts(repo);
  return {
    listHooks: async () =>
      (await octokit.paginate(octokit.rest.repos.listWebhooks, { ...target, per_page: 100 })).map(
        toGithubHook,
      ),
    createHook: async (input) => {
      const res = await octokit.rest.repos.createWebhook({
        ...target,
        name: "web",
        ...input,
      });
      return toGithubHook(res.data);
    },
    updateHook: async (hookId, input) => {
      const res = await octokit.rest.repos.updateWebhook({
        ...target,
        hook_id: hookId,
        ...input,
      });
      return toGithubHook(res.data);
    },
    deleteHook: async (hookId) => {
      await octokit.rest.repos.deleteWebhook({ ...target, hook_id: hookId });
    },
  };
}

function orgHookClient(octokit: Octokit, org: string): GithubHookClient {
  return {
    listHooks: async () =>
      (await octokit.paginate(octokit.rest.orgs.listWebhooks, { org, per_page: 100 })).map(
        toGithubHook,
      ),
    createHook: async (input) => {
      const res = await octokit.rest.orgs.createWebhook({ org, name: "web", ...input });
      return toGithubHook(res.data);
    },
    updateHook: async (hookId, input) => {
      const res = await octokit.rest.orgs.updateWebhook({ org, hook_id: hookId, ...input });
      return toGithubHook(res.data);
    },
    deleteHook: async (hookId) => {
      await octokit.rest.orgs.deleteWebhook({ org, hook_id: hookId });
    },
  };
}
