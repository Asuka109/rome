import { fetch as expoFetch } from "expo/fetch";
import { CloudApi } from "./cloud-api";
import { ROME_CLOUD_ORIGIN } from "./config";
import { credentialVault } from "./credential-vault-runtime";
import { InstanceSessionCoordinator } from "./instance-session-coordinator";
import { webViewCookieStore } from "./webview-cookie-store";

export const nativeFetch = expoFetch as unknown as typeof fetch;
export const cloudApi = new CloudApi(ROME_CLOUD_ORIGIN, nativeFetch);
export const sessionCoordinator = new InstanceSessionCoordinator(
  cloudApi,
  credentialVault,
  webViewCookieStore,
  nativeFetch,
);
