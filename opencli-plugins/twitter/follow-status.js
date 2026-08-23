import { CommandExecutionError } from "@jackwener/opencli/errors";
import { cli, Strategy } from "@jackwener/opencli/registry";

// New command (no built-in twitter/follow-status exists to override): reports the
// follow relationship with a user from the profile follow button's text — "Follow"
// (no relationship), "Follow back" (they follow you), or "Following" (you follow them).
// Modeled on the twitter/follow override in ./follow.js.
cli({
  site: "twitter",
  name: "follow-status",
  access: "read",
  description:
    "Check the follow relationship with a Twitter user from their profile's follow button",
  domain: "x.com",
  strategy: Strategy.UI,
  browser: true,
  args: [
    {
      name: "username",
      type: "string",
      positional: true,
      required: true,
      help: "Twitter screen name (without @)",
    },
  ],
  columns: ["status", "button", "message"],
  func: async (page, kwargs) => {
    if (!page)
      throw new CommandExecutionError("Browser session required for twitter follow-status");
    const username = kwargs.username.replace(/^@/, "");
    await page.goto(`https://x.com/${username}`);
    await page.wait({ selector: '[data-testid="primaryColumn"]' });
    const result = await page.evaluate(`(async () => {
        try {
            let attempts = 0;
            let btn = null;

            while (attempts < 20) {
                // Following state renders as screen_name-unfollow, the other two as
                // screen_name-follow ("-follow" does not suffix-match "-unfollow").
                btn = document.querySelector('[data-testid$="-unfollow"]')
                    || document.querySelector('[data-testid$="-follow"]');
                if (btn) break;

                await new Promise(r => setTimeout(r, 500));
                attempts++;
            }

            if (!btn) {
                return { ok: false, message: 'Could not find the follow button. Are you logged in?' };
            }

            const label = (btn.textContent || '').trim();
            if (/follow back/i.test(label)) {
                return { ok: true, status: 'follow-back', button: label, message: '@${username} follows you, but you are not following them.' };
            }
            if (/^following$/i.test(label)) {
                return { ok: true, status: 'following', button: label, message: 'You are following @${username}.' };
            }
            if (/^follow$/i.test(label)) {
                return { ok: true, status: 'not-following', button: label, message: 'You are not following @${username}, and they do not follow you.' };
            }
            // The unfollow button swaps its label on hover ("Following" -> "Unfollow");
            // fall back to the testid so a mid-hover read still resolves.
            if (btn.getAttribute('data-testid').endsWith('-unfollow')) {
                return { ok: true, status: 'following', button: label, message: 'You are following @${username}.' };
            }
            return { ok: false, message: 'Unrecognized follow button text: "' + label + '".' };
        } catch (e) {
            return { ok: false, message: e.toString() };
        }
    })()`);
    if (!result.ok) throw new CommandExecutionError(result.message);
    return [
      {
        status: result.status,
        button: result.button,
        message: result.message,
      },
    ];
  },
});
