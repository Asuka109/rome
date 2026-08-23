import { ArgumentError, AuthRequiredError, CommandExecutionError } from "@jackwener/opencli/errors";
import { cli, Strategy } from "@jackwener/opencli/registry";
import {
  extractProfileProbe,
  openLinkedInContactSection,
  waitForLinkedInPage,
} from "./linkedin-browser.mjs";
import {
  contactInfoUrl,
  normalizeContactPayload,
  normalizeLinkedInProfile,
  normalizeProfileProbe,
  unwrapEvaluateResult,
} from "./linkedin-helpers.mjs";

function requireAuthenticated(payload, context) {
  if (unwrapEvaluateResult(payload)?.auth_wall === true) {
    throw new AuthRequiredError(
      "www.linkedin.com",
      `${context} requires an active signed-in LinkedIn browser session.`,
    );
  }
}

cli({
  site: "linkedin",
  name: "contact-info",
  access: "read",
  description: "Read contact information visible to the logged-in account from a LinkedIn profile",
  example: "opencli linkedin contact-info satyanadella -f json",
  domain: "www.linkedin.com",
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    {
      name: "profile",
      type: "string",
      positional: true,
      required: true,
      help: "LinkedIn /in/ profile URL, /in/ path, @public-id, public-id, or me",
    },
  ],
  columns: [
    "profile_url",
    "profile_id",
    "name",
    "status",
    "type",
    "label",
    "value",
    "url",
    "message",
  ],
  func: async (page, kwargs) => {
    if (!page)
      throw new CommandExecutionError("Browser session required for linkedin contact-info");
    let requested;
    try {
      requested = normalizeLinkedInProfile(kwargs.profile);
    } catch (error) {
      throw new ArgumentError(error instanceof Error ? error.message : String(error));
    }

    await page.goto(requested.profile_url);
    await waitForLinkedInPage(page);
    const rawProbe = await extractProfileProbe(page);
    requireAuthenticated(rawProbe, "LinkedIn contact-info");
    let profile;
    try {
      profile = normalizeProfileProbe(rawProbe, requested);
    } catch (error) {
      throw new CommandExecutionError(error instanceof Error ? error.message : String(error));
    }
    if (profile.unavailable) {
      return normalizeContactPayload({ dialog_found: false }, profile);
    }

    let rawContact;
    try {
      rawContact = await openLinkedInContactSection(page, contactInfoUrl(profile.profile_url));
    } catch (error) {
      throw new CommandExecutionError(error instanceof Error ? error.message : String(error));
    }
    requireAuthenticated(rawContact, "LinkedIn contact-info");
    try {
      return normalizeContactPayload(rawContact, profile);
    } catch (error) {
      throw new CommandExecutionError(error instanceof Error ? error.message : String(error));
    }
  },
});
