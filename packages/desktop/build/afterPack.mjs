/**
 * electron-builder afterPack hook: sign the bundled `limactl` binary with
 * the Lima-specific entitlements BEFORE electron-builder's own signing pass.
 *
 * Why `afterPack` and not `afterSign`:
 *
 *   electron-builder's `afterSign` runs AFTER signing AND notarization — by
 *   then the .app has a stapled notarization ticket, and any subsequent
 *   `codesign --force` on the outer bundle silently invalidates that
 *   ticket. The packaged DMG ends up signed but not-validly-notarized, and
 *   Gatekeeper rejects it with "Apple could not verify ... is free of
 *   malware".
 *
 *   `afterPack` runs before signing. We pre-sign limactl here, and
 *   electron-builder's signing pass — with `mac.signIgnore` covering
 *   limactl — leaves our signature alone and seals the outer bundle around
 *   limactl's fixed CDHash. Notarization + stapling then happen exactly
 *   once on a bundle that is never touched again.
 *
 * Why custom entitlements:
 *
 *   Apple's container CLI used to come Apple-signed and inherit its VZ
 *   entitlement for free. Lima is a third-party Go binary; we sign it
 *   ourselves with the brew-baseline entitlements
 *   (`com.apple.security.virtualization`, network.client, network.server).
 *
 * Two paths:
 *  - With a Developer ID (CSC_NAME / mac.identity set): full sign with
 *    hardened runtime + timestamp, suitable for notarization.
 *  - Without an identity (typical local `pnpm run pack`): ad-hoc sign
 *    (`codesign --sign -`) which keeps the VZ entitlement so the local .app
 *    can actually start the VM. Hardened runtime / timestamp are
 *    incompatible with ad-hoc signing and are omitted on this path; the
 *    build is not notarizable but is fine for local use.
 */
import { execFileSync } from "child_process";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LIMA_ENTITLEMENTS = join(__dirname, "lima.entitlements.plist");
const TARGET_RELATIVE = "Contents/Resources/lima/bin/limactl";

export default async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;

  const appPath = join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  const limactl = join(appPath, TARGET_RELATIVE);
  if (!existsSync(limactl)) {
    console.warn(`[afterPack] Bundled limactl missing at ${limactl} — skipping.`);
    return;
  }

  const identity = process.env.CSC_NAME || context.packager.config?.mac?.identity || null;
  // Ad-hoc signing ("-") is incompatible with --options runtime and --timestamp.
  const adHoc = !identity;
  const signIdentity = identity ?? "-";
  const hardeningArgs = adHoc ? [] : ["--options", "runtime", "--timestamp"];

  // electron-builder lazily creates the temp keychain (decodes CSC_LINK,
  // imports the p12) the first time codeSigningInfo.value is awaited. Force
  // that here so our codesign call below can find the Developer ID identity
  // via --keychain. Without this, codesign hits the default search list at
  // afterPack time — which doesn't yet contain electron-builder's keychain —
  // and errors out with "The specified item could not be found in the
  // keychain".
  let keychainFile = null;
  if (!adHoc) {
    const info = await context.packager.codeSigningInfo.value;
    keychainFile = info?.keychainFile ?? null;
  }
  const keychainArgs = keychainFile ? ["--keychain", keychainFile] : [];

  if (adHoc) {
    console.log(
      "[afterPack] No signing identity (CSC_NAME / mac.identity unset) — " +
        "falling back to ad-hoc sign. Build will not be notarizable.",
    );
  }

  console.log(
    `[afterPack] Pre-signing ${limactl} with identity "${signIdentity}"` +
      (keychainFile ? ` (keychain: ${keychainFile})` : ""),
  );
  execFileSync(
    "codesign",
    [
      "--force",
      "--sign",
      signIdentity,
      "--entitlements",
      LIMA_ENTITLEMENTS,
      ...hardeningArgs,
      ...keychainArgs,
      limactl,
    ],
    { stdio: "inherit" },
  );
}
