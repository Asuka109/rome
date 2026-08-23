// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import i18n from "@/i18n";
import PeoplePage from "./PeoplePage";

// The bond filter above "Known persons" narrows the list below it. Which chip
// is active therefore has to reach assistive tech as *state*, not as a fill
// color — and the count each chip carries has to stay legible once that fill
// flips to `--primary`.

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const persons = [
  { id: "p1", displayName: "Ada", bondLevel: "inner-circle", channelMappings: [] },
  { id: "p2", displayName: "Bo", bondLevel: "acquaintance", channelMappings: [] },
  { id: "p3", displayName: "Cy", bondLevel: "stranger", channelMappings: [] },
];

function mockFetch() {
  vi.spyOn(globalThis, "fetch").mockImplementation((async (input: RequestInfo | URL) => {
    const url = String(input);
    const json = url.includes("/api/persons") && !url.includes("/unknown") ? persons : [];
    return { ok: true, status: 200, json: async () => json } as Response;
  }) as typeof fetch);
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PeoplePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function bondFilter() {
  return await screen.findByRole("radiogroup", { name: /filter known persons by bond/i });
}

function chip(group: HTMLElement, name: string | RegExp) {
  return within(group).getByRole("radio", { name });
}

function countOf(group: HTMLElement, name: RegExp) {
  return within(chip(group, name)).getByText(
    (_, el) => el?.getAttribute("data-slot") === "filter-chip-count",
  );
}

describe("PeoplePage bond filter", () => {
  it("exposes the selected chip as checked and the rest as unchecked", async () => {
    mockFetch();
    renderPage();

    const group = await bondFilter();
    const chips = within(group).getAllByRole("radio");
    expect(chips).toHaveLength(4);

    // "All" is the default selection, and it is the only checked one.
    expect(chips.filter((c) => c.getAttribute("aria-checked") === "true")).toHaveLength(1);
    expect(chip(group, /^All/).getAttribute("aria-checked")).toBe("true");
    expect(chip(group, /^Inner circle/).getAttribute("aria-checked")).toBe("false");
  });

  it("moves the selection when a chip is clicked", async () => {
    mockFetch();
    const user = userEvent.setup();
    renderPage();

    const group = await bondFilter();
    await user.click(chip(group, /^Inner circle/));

    expect(chip(group, /^Inner circle/).getAttribute("aria-checked")).toBe("true");
    expect(chip(group, /^All/).getAttribute("aria-checked")).toBe("false");
    // The list below the filter narrowed with it.
    expect(screen.getByText("Ada")).toBeTruthy();
    expect(screen.queryByText("Bo")).toBeNull();
  });

  it("paints the selected chip's count with the chip's own foreground", async () => {
    mockFetch();
    const user = userEvent.setup();
    renderPage();

    const group = await bondFilter();
    const countClass = (name: RegExp) => countOf(group, name).className;

    // Unselected chips sit on the quiet surface fill and keep the quiet count.
    expect(countClass(/^Inner circle/)).toContain("text-subtle-foreground");
    // The selected chip's fill is `--primary`, so its count has to be the
    // partner foreground rather than the light-surface subtle color.
    expect(countClass(/^All/)).toContain("text-primary-foreground");
    expect(countClass(/^All/)).not.toContain("text-subtle-foreground");

    await user.click(chip(group, /^Inner circle/));
    expect(countClass(/^Inner circle/)).toContain("text-primary-foreground");
    expect(countClass(/^All/)).toContain("text-subtle-foreground");
  });

  it("keeps counting every person, not just the filtered ones", async () => {
    mockFetch();
    const user = userEvent.setup();
    renderPage();

    const group = await bondFilter();
    await user.click(chip(group, /^Inner circle/));

    expect(countOf(group, /^All/).textContent).toBe("3");
    expect(countOf(group, /^Inner circle/).textContent).toBe("1");
  });
});
