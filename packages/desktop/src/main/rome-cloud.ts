// The Rome cloud (Rome Cloud) origin this desktop build talks to. Both the
// enrollment flow (browser consent + token exchange) and the VM runtime env
// (PANTHEON_BASE_ORIGIN) resolve through here so the app and the instance it
// boots always agree on which cloud they belong to.
// Overridable for staging/dev; production builds use the default.
// Exported because the window CSP has to name it too: the dashboard's own copy
// of the origin is baked into the image at web build time and does not follow
// this process's override, so production stays allowed even on a staging build.
export const ROME_CLOUD_PRODUCTION_ORIGIN = "https://romeos.cc";

export const ROME_CLOUD_ORIGIN =
  process.env.ROME_DESKTOP_PANTHEON_ORIGIN?.trim() || ROME_CLOUD_PRODUCTION_ORIGIN;
