# Example workflows

Plain-language prompts a guardian might type to start a workflow. Each is phrased
the way a non-technical person would describe an automation. They double as a
verification corpus: drive each one end to end through the `design-workflow` skill
and confirm it produces a sensible spec, the guardian approves it, and it installs
as a runnable workflow app.

1. "Every morning, check my GitHub repo for new bug reports, write a short summary of each one, and post the summaries to our team Slack channel."
2. "When a support ticket comes in, look up the customer and pull their recent orders at the same time, then draft a reply that uses both."
3. "Each Friday, gather my open invoices, add up everything that's owed, and email me the total along with the list."
4. "Watch my inbox — if a message looks urgent, alert me on Telegram right away; otherwise just file it for later."
5. "Collect the top news stories about a topic I care about, summarize them all into one digest, and save it to my notes every day."

## Office-worker examples (curated connectors only)

Everyday automations a knowledge worker would want, written to depend only on
Rome's curated Composio connectors — **Gmail, Google Calendar, Google Drive,
Slack, Notion, Linear**.

6. "Every Friday at 4pm, pull this week's Linear issues marked Done, summarize the top 5 themes, then save that summary as a Gmail draft to my team."
7. "When I get an email flagged important, at the same time search my Google Drive for related docs, check Linear for any open issue from that sender, and look up the last Slack thread mentioning them — then post all three findings to my Slack DMs."
8. "Go through every page in my Notion 'New Leads' database and, for each one, draft a personalized 2-line intro email and add it as a Gmail draft."
9. "For each new email in my inbox: if it's from a customer, draft a reply in Gmail and create a Linear issue; if it's a calendar invite, accept it in Google Calendar; otherwise just archive it."
10. "Every morning at 8am, grab my Google Calendar events for the day. For each meeting, in parallel pull the related Gmail thread and any shared Google Drive docs. If I'm the organizer, draft an agenda in Notion; if I'm just an attendee, write a one-line prep note. Then post the full brief to my Slack DMs."

## Follow-up edits

These mid-conversation edits exercise revising the spec before approval:

- "Only post if the bug looks like a real crash, otherwise just label it." (adds a decision to #1)
- "Also CC finance on that email." (extends the delivery step in #3)
- "Drop the parallel lookup — just get the orders." (simplifies #2)
- "Make it escalate when more than 5 are urgent." (adds a count + threshold to #4)
