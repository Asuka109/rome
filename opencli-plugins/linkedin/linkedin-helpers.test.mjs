import assert from "node:assert/strict";
import test from "node:test";
import {
  buildContactExtractionScript,
  buildProfileProbeScript,
  openLinkedInContactSection,
} from "./linkedin-browser.mjs";
import {
  contactInfoUrl,
  normalizeContactHref,
  normalizeContactPayload,
  normalizeLinkedInProfile,
  normalizeProfileProbe,
} from "./linkedin-helpers.mjs";

test("profile inputs normalize URLs, paths, identifiers, and me", () => {
  const expected = {
    identifier: "alice-smith",
    profile_url: "https://www.linkedin.com/in/alice-smith/",
  };
  assert.deepEqual(normalizeLinkedInProfile("alice-smith"), expected);
  assert.deepEqual(normalizeLinkedInProfile("@alice-smith"), expected);
  assert.deepEqual(normalizeLinkedInProfile("in/alice-smith"), expected);
  assert.deepEqual(normalizeLinkedInProfile("/in/alice-smith/"), expected);
  assert.deepEqual(
    normalizeLinkedInProfile(
      "https://www.linkedin.com/in/alice-smith/overlay/contact-info/?trk=profile",
    ),
    expected,
  );
  assert.deepEqual(normalizeLinkedInProfile("me"), {
    identifier: "me",
    profile_url: "https://www.linkedin.com/in/me/",
  });
  assert.equal(
    contactInfoUrl("alice-smith"),
    "https://www.linkedin.com/in/alice-smith/overlay/contact-info/",
  );
});

test("profile inputs reject unsafe hosts, protocols, credentials, and invalid identifiers", () => {
  assert.throws(() => normalizeLinkedInProfile(""), /profile is required/);
  assert.throws(() => normalizeLinkedInProfile("https://example.com/in/alice"), /linkedin/i);
  assert.throws(() => normalizeLinkedInProfile("http://www.linkedin.com/in/alice"), /https/);
  assert.throws(
    () => normalizeLinkedInProfile("https://alice:secret@www.linkedin.com/in/alice"),
    /credentials/,
  );
  assert.throws(() => normalizeLinkedInProfile("alice/other"), /public identifier/);
  assert.throws(
    () => normalizeLinkedInProfile("https://www.linkedin.com/company/openai"),
    /\/in\//,
  );
});

test("profile probes resolve /in/me redirects and classify missing profiles", () => {
  const requested = normalizeLinkedInProfile("me");
  assert.deepEqual(
    normalizeProfileProbe(
      {
        current_url: "https://www.linkedin.com/in/alice-smith/?trk=profile",
        name: " Alice Smith ",
        unavailable: false,
      },
      requested,
    ),
    {
      identifier: "alice-smith",
      profile_url: "https://www.linkedin.com/in/alice-smith/",
      name: "Alice Smith",
      auth_wall: false,
      unavailable: false,
      unavailable_reason: "",
    },
  );
  const unavailable = normalizeProfileProbe(
    {
      current_url: "https://www.linkedin.com/in/does-not-exist/",
      name: "",
      unavailable: true,
      unavailable_reason: "Profile not found",
    },
    normalizeLinkedInProfile("does-not-exist"),
  );
  assert.equal(unavailable.unavailable, true);
  assert.equal(unavailable.unavailable_reason, "Profile not found");
});

test("contact URLs allow safe web, email, and phone links and unwrap LinkedIn safety links", () => {
  assert.equal(
    normalizeContactHref("mailto:alice@example.com?subject=hello"),
    "mailto:alice@example.com",
  );
  assert.equal(normalizeContactHref("tel:+1-415-555-0100"), "tel:+1-415-555-0100");
  assert.equal(
    normalizeContactHref(
      "https://www.linkedin.com/safety/go/?url=https%3A%2F%2Fexample.com%2Fabout",
    ),
    "https://example.com/about",
  );
  assert.equal(normalizeContactHref("javascript:alert(1)"), "");
  assert.equal(normalizeContactHref("https://user:secret@example.com"), "");
});

test("visible contact sections become typed, deduplicated structured rows", () => {
  const profile = {
    identifier: "alice-smith",
    profile_url: "https://www.linkedin.com/in/alice-smith/",
    name: "Alice Smith",
  };
  const rows = normalizeContactPayload(
    {
      dialog_found: true,
      sections: [
        {
          heading: "Your profile",
          icon: "linkedin-bug-medium",
          blocks: ["linkedin.com/in/alice-smith"],
          links: [
            {
              text: "linkedin.com/in/alice-smith",
              href: "https://www.linkedin.com/in/alice-smith/",
              context: "linkedin.com/in/alice-smith",
            },
          ],
        },
        {
          heading: "Websites",
          icon: "link-medium",
          blocks: ["Alice Labs (Company)"],
          links: [
            {
              text: "Alice Labs",
              href: "https://www.linkedin.com/safety/go/?url=https%3A%2F%2Falice.example%2F",
              context: "Alice Labs (Company)",
            },
          ],
        },
        {
          heading: "Email",
          icon: "envelope-medium",
          blocks: ["alice@example.com"],
          links: [
            {
              text: "alice@example.com",
              href: "mailto:alice@example.com",
              context: "alice@example.com",
            },
          ],
        },
        {
          heading: "Phone",
          icon: "phone-handset-medium",
          blocks: ["+1 415 555 0100 (Mobile)"],
          links: [
            {
              text: "+1 415 555 0100",
              href: "tel:+14155550100",
              context: "+1 415 555 0100 (Mobile)",
            },
          ],
        },
        {
          heading: "Address",
          icon: "address-book-medium",
          blocks: ["San Francisco, California"],
          links: [],
        },
        {
          heading: "Custom contact field",
          icon: "custom-medium",
          blocks: ["Visible custom value"],
          links: [],
        },
      ],
    },
    profile,
  );

  assert.deepEqual(
    rows.map(({ type, label, value, url }) => ({ type, label, value, url })),
    [
      {
        type: "profile",
        label: "Your profile",
        value: "linkedin.com/in/alice-smith",
        url: "https://www.linkedin.com/in/alice-smith/",
      },
      {
        type: "website",
        label: "Websites (Company)",
        value: "Alice Labs",
        url: "https://alice.example/",
      },
      {
        type: "email",
        label: "Email",
        value: "alice@example.com",
        url: "mailto:alice@example.com",
      },
      {
        type: "phone",
        label: "Phone (Mobile)",
        value: "+1 415 555 0100",
        url: "tel:+14155550100",
      },
      {
        type: "address",
        label: "Address",
        value: "San Francisco, California",
        url: null,
      },
      {
        type: "other",
        label: "Custom contact field",
        value: "Visible custom value",
        url: null,
      },
    ],
  );
  assert.ok(rows.every((row) => row.status === "available"));
  assert.ok(rows.every((row) => row.name === "Alice Smith"));
});

test("missing, private, and unavailable contact information return status rows", () => {
  const profile = {
    identifier: "alice",
    profile_url: "https://www.linkedin.com/in/alice/",
    name: "Alice",
  };
  assert.equal(
    normalizeContactPayload({ dialog_found: true, sections: [] }, profile)[0].status,
    "no_visible_contact_info",
  );
  assert.equal(
    normalizeContactPayload({ dialog_found: false, restricted: true }, profile)[0].status,
    "contact_info_restricted",
  );
  assert.equal(
    normalizeContactPayload({ dialog_found: false }, profile)[0].status,
    "contact_info_unavailable",
  );
  assert.equal(
    normalizeContactPayload(
      { dialog_found: false },
      { ...profile, unavailable: true, unavailable_reason: "Profile not found" },
    )[0].status,
    "profile_unavailable",
  );
});

test("browser extraction scripts are valid standalone page JavaScript", () => {
  assert.doesNotThrow(() => new Function(`return (${buildProfileProbeScript()})`));
  assert.doesNotThrow(() => new Function(`return (${buildContactExtractionScript()})`));
});

test("contact section opens through the profile link and falls back to direct navigation", async () => {
  const clickCalls = [];
  const clickPage = {
    evaluate: async (source) =>
      source.startsWith("Boolean") ? true : { dialog_found: true, sections: [] },
    click: async (selector) => clickCalls.push(selector),
    wait: async () => {},
    goto: async () => assert.fail("direct navigation should not run after a successful click"),
  };
  const clicked = await openLinkedInContactSection(
    clickPage,
    "https://www.linkedin.com/in/alice/overlay/contact-info/",
  );
  assert.equal(clicked.dialog_found, true);
  assert.deepEqual(clickCalls, ['a[href*="/overlay/contact-info"]']);

  const gotoCalls = [];
  const fallbackPage = {
    evaluate: async (source) =>
      source.startsWith("Boolean") ? false : { dialog_found: false, sections: [] },
    click: async () => assert.fail("click should not run without a contact link"),
    wait: async () => {},
    goto: async (url) => gotoCalls.push(url),
  };
  const fallbackUrl = "https://www.linkedin.com/in/alice/overlay/contact-info/";
  const fallback = await openLinkedInContactSection(fallbackPage, fallbackUrl);
  assert.equal(fallback.dialog_found, false);
  assert.deepEqual(gotoCalls, [fallbackUrl]);
});

test("contact extraction reads modern icon rows and ignores non-contact upsells", () => {
  const source = buildContactExtractionScript();
  const link = {
    innerText: "alice@example.com",
    textContent: "alice@example.com",
    href: "mailto:alice@example.com",
    getAttribute: () => "mailto:alice@example.com",
    closest: () => ({ innerText: "alice@example.com", textContent: "alice@example.com" }),
  };
  const heading = { innerText: "Email", textContent: "Email" };
  const icon = { tagName: "svg", id: "envelope-medium" };
  const row = {
    children: [icon, {}],
    innerText: "Email\nalice@example.com",
    textContent: "Email alice@example.com",
    querySelector: (selector) => (selector.includes("p") ? heading : null),
    querySelectorAll: (selector) => {
      if (selector === "p, address") return [heading, link.closest()];
      if (selector === "a[href]") return [link];
      return [];
    },
  };
  const column = { children: [row, { children: [{ tagName: "div" }] }] };
  const header = { innerText: "Contact info", textContent: "Contact info" };
  const dialog = {
    innerText: "Contact info Email alice@example.com",
    textContent: "Contact info Email alice@example.com",
    querySelector: (selector) => {
      if (selector === "header h1, header h2, h1, h2") return header;
      if (selector === "section.pv-contact-info") return null;
      return null;
    },
    querySelectorAll: (selector) => {
      if (selector === '[data-testid="lazy-column"]') return [column];
      if (selector === "section.pv-contact-info__contact-type") return [];
      return [];
    },
  };
  const documentFixture = {
    title: "Alice | LinkedIn",
    body: { innerText: "Contact info Email alice@example.com" },
    querySelector: (selector) => (selector === "section.pv-contact-info" ? null : null),
    querySelectorAll: (selector) => (selector === 'dialog, [role="dialog"]' ? [dialog] : []),
  };
  const result = new Function("document", "location", `return (${source})`)(documentFixture, {
    href: "https://www.linkedin.com/in/alice/overlay/contact-info/",
  });
  assert.equal(result.dialog_found, true);
  assert.equal(result.sections.length, 1);
  assert.equal(result.sections[0].heading, "Email");
  assert.equal(result.sections[0].links[0].href, "mailto:alice@example.com");
});
