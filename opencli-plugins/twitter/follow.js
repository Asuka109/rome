import { CommandExecutionError } from "@jackwener/opencli/errors";
import { cli, Strategy } from "@jackwener/opencli/registry";

// Overrides the built-in twitter/follow: plugins are discovered last at opencli
// startup, so this cli() call wins the "twitter/follow" registry key while every
// other twitter command stays built-in. Diff base: clis/twitter/follow.js in
// @yunfanye/opencli@1.8.6 - the only addition is the --only-follow-back gate.
cli({
  site: "twitter",
  name: "follow",
  access: "write",
  description: "Follow a Twitter user",
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
    {
      name: "only-follow-back",
      type: "boolean",
      default: false,
      help: 'Only follow when the button reads "Follow back" (the account already follows you); error otherwise',
    },
  ],
  columns: ["status", "message"],
  func: async (page, kwargs) => {
    if (!page) throw new CommandExecutionError("Browser session required for twitter follow");
    const username = kwargs.username.replace(/^@/, "");
    const onlyFollowBack = kwargs["only-follow-back"] === true;
    await page.goto(`https://x.com/${username}`);
    await page.wait({ selector: '[data-testid="primaryColumn"]' });
    const result = await page.evaluate(`(async () => {
        try {
            let attempts = 0;
            let followBtn = null;
            let unfollowTestId = null;

            while (attempts < 20) {
                // Check if already following (button shows screen_name-unfollow)
                unfollowTestId = document.querySelector('[data-testid$="-unfollow"]');
                if (unfollowTestId) {
                    return { ok: true, message: 'Already following @${username}.' };
                }

                // Look for the Follow button
                followBtn = document.querySelector('[data-testid$="-follow"]');
                if (followBtn) break;

                await new Promise(r => setTimeout(r, 500));
                attempts++;
            }

            if (!followBtn) {
                return { ok: false, message: 'Could not find Follow button. Are you logged in?' };
            }

            if (${onlyFollowBack}) {
                const label = (followBtn.textContent || '').trim();
                if (!/follow back/i.test(label)) {
                    return { ok: false, refused: true, message: 'only-follow-back: @${username} does not follow you (button reads "' + label + '"); not following.' };
                }
            }

            followBtn.click();
            await new Promise(r => setTimeout(r, 1500));

            // Verify
            const verify = document.querySelector('[data-testid$="-unfollow"]');
            if (verify) {
                return { ok: true, message: 'Successfully followed @${username}.' };
            } else {
                return { ok: false, message: 'Follow action initiated but UI did not update.' };
            }
        } catch (e) {
            return { ok: false, message: e.toString() };
        }
    })()`);
    if (result.refused) throw new CommandExecutionError(result.message);
    if (result.ok) await page.wait(2);
    return [
      {
        status: result.ok ? "success" : "failed",
        message: result.message,
      },
    ];
  },
});
