// The browse URL is baked in at build time (see rsbuild.config.ts). The
// build fails when neither PANTHEON_BASE_ORIGIN nor PANTHEON_DOMAIN is set,
// so this value is always a real URL at runtime.
export const APP_STORE_BROWSE_URL = `${import.meta.env.ROME_CLOUD_ORIGIN}/store`;
