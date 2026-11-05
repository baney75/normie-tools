import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { gradeOf } from "../../../../scripts/check-reading-level.mjs";
import { buildMatchers, loadTerms } from "../../../../scripts/check-banned-jargon.mjs";
import { PRACTICE_SHEET } from "../../../../tools/tax-filing-helper/calc.mjs";
import { Page } from "./Page";
import { COPY } from "./copy";

beforeEach(() => window.localStorage.clear());

const click = (name: string | RegExp) => userEvent.click(screen.getByRole("button", { name }));

async function typeInto(label: string, text: string) {
  const box = screen.getByLabelText(label);
  await userEvent.clear(box);
  if (text) await userEvent.type(box, text);
}

const SCREEN_ITEMS: [string, string][][] = [
  [["First name", "Sample"], ["Last name", "Person"], ["Email", "sample.person@example.com"]],
  [["Employer name", "Example Bakery"], ["Pay for the year", "32450"], ["Tax already taken out of your pay", "2810.5"]],
  [["Bank name", "Example Credit Union"], ["Interest from your bank", "12.34"]],
];

async function toStep3() {
  await click(COPY.next);
  await click(COPY.next);
}

async function fillAll(overrides: Record<string, string> = {}) {
  await toStep3();
  for (let s = 0; s < SCREEN_ITEMS.length; s++) {
    for (const [label, text] of SCREEN_ITEMS[s]) await typeInto(label, overrides[label] ?? text);
    await click(s < 2 ? COPY.nextScreen : COPY.toReview);
  }
}

describe("Tax Filing Helper page", () => {
  it("opens on step 1 with the practice banner and one filled button", () => {
    const { container } = render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: "Tax Filing Helper" })).toBeInTheDocument();
    expect(screen.getByText("Practice only. Use the made-up answers shown. Nothing is filed.")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 4: Pick your way")).toBeInTheDocument();
    expect(container.querySelectorAll("button.primary")).toHaveLength(1);
    expect(screen.getByRole("button", { name: COPY.next })).toHaveClass("primary");
    expect(screen.getByRole("radio", { name: /Guided Free File/ })).toHaveFocus();
  });

  it("shows both ways, the closed note, the source link and Who does what", () => {
    render(<Page />);
    expect(screen.getByRole("radio", { name: /Free File Fillable Forms/ })).toBeInTheDocument();
    expect(screen.getByText(/\$95,000 or less last season/)).toBeInTheDocument();
    expect(screen.getByText("Free File opens again in January 2027. This practice works now.")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Most people pick/);
    expect(screen.getAllByRole("link", { name: /Source: IRS Free File/ })[0]).toHaveAttribute("href", expect.stringContaining("irs.gov"));
    const who = screen.getByRole("region", { name: "Who does what" });
    expect(within(who).getAllByRole("row")).toHaveLength(1 + COPY.who.rows.length);
    expect(who).toHaveTextContent("Press Submit");
  });

  it("step 2 shows the made-up answer sheet", async () => {
    const { container } = render(<Page />);
    await userEvent.click(screen.getByRole("radio", { name: /Fillable Forms/ }));
    await click(COPY.next);
    expect(screen.getByText("Step 2 of 4: Your answer sheet")).toBeInTheDocument();
    expect(screen.getByText(/These answers are made up/)).toBeInTheDocument();
    expect(screen.getByText("Sample")).toBeInTheDocument();
    expect(screen.getByText("$32,450.00")).toBeInTheDocument();
    expect(screen.getByText("sample.person@example.com")).toBeInTheDocument();
    expect(container.querySelectorAll("button.primary")).toHaveLength(1);
  });

  it("step 3 shows one practice screen at a time in big text, with Next screen as the only filled button", async () => {
    const { container } = render(<Page />);
    await toStep3();
    expect(screen.getByText("Step 3 of 4: Copy the answers in")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /Practice screen 1 of 3: About you/ })).toBeInTheDocument();
    expect(screen.getByLabelText("First name")).toHaveFocus();
    expect(container.querySelectorAll(".nt-tfh-big")).toHaveLength(3);
    expect(container.querySelectorAll("button.primary")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Next screen" })).toHaveClass("primary");
    await click("Next screen");
    expect(screen.getByRole("heading", { level: 2, name: /Practice screen 2 of 3/ })).toBeInTheDocument();
    expect(screen.queryByLabelText("First name")).toBeNull();
    await click(COPY.back);
    expect(screen.getByLabelText("First name")).toBeInTheDocument();
  });

  it("step 4 says all match, and stops with no Submit button and no form", async () => {
    const { container } = render(<Page />);
    await fillAll();
    expect(screen.getByText("Step 4 of 4: Check your answers")).toBeInTheDocument();
    expect(screen.getByLabelText(COPY.review.resultLabel)).toHaveTextContent("All 8 answers match.");
    expect(screen.getByText(COPY.review.stop)).toBeInTheDocument();
    expect(screen.getByText("You press Submit yourself, on the free filing site you pick on IRS.gov.")).toBeInTheDocument();
    // No way to submit: no form, no submit input, no button that files, sends, pays or submits.
    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector('input[type="submit"], button[type="submit"]')).toBeNull();
    for (const b of screen.getAllByRole("button")) {
      expect(b.getAttribute("type")).toBe("button");
      expect(b.textContent ?? "").not.toMatch(/submit|file|send|pay|sign/i);
    }
    expect(container.querySelectorAll("button.primary")).toHaveLength(0);
    expect(container.querySelectorAll(".nt-sheet-primary")).toHaveLength(1);
    expect(screen.getAllByText(COPY.review.stop)).toHaveLength(1);
    expect(screen.queryByText("That is your answer", { exact: false })).toBeNull();
  });

  it("step 4 puts the sheet next to what was typed and names each mix-up", async () => {
    render(<Page />);
    await fillAll({ "First name": "Sampel", "Interest from your bank": "12.3", "Last name": "" });
    expect(screen.getByLabelText(COPY.review.resultLabel)).toHaveTextContent("5 of 8 answers match. 3 need a look.");
    const rows = within(screen.getByRole("region", { name: COPY.review.tableCaption })).getAllByRole("listitem");
    expect(rows).toHaveLength(8);
    expect(rows[0]).toHaveTextContent("First nameDifferentAnswer sheet: SampleYou typed: Sampel");
    expect(rows[1]).toHaveTextContent("Last nameNot typedAnswer sheet: PersonYou typed: (nothing)");
    expect(rows[2]).toHaveTextContent("EmailMatches");
    expect(rows[7]).toHaveTextContent("DifferentAnswer sheet: $12.34You typed: 12.3");
  });

  it("lists what to watch out for on the review page, with a source", async () => {
    render(<Page />);
    await fillAll();
    const watch = screen.getByRole("region", { name: "Watch out for these" });
    expect(watch).toHaveTextContent("Extra charges");
    expect(watch).toHaveTextContent("Fake or look-alike sites");
    expect(watch).toHaveTextContent("money to get your refund faster");
    expect(within(watch).getByRole("link")).toHaveAttribute("href", expect.stringContaining("irs.gov"));
  });

  it("keeps the eight answers once: the save sheet shows one sentence", async () => {
    render(<Page />);
    await fillAll();
    const sheet = screen.getByRole("group", { name: "Preview" });
    expect(sheet).toHaveTextContent("All 8 answers match.");
    expect(within(sheet).queryAllByText(/: matches\./)).toHaveLength(0);
  });

  it("review page: Save a copy is the one filled button, Print is outline, and the source shows once", async () => {
    const { container } = render(<Page />);
    await fillAll();
    expect(screen.getByRole("button", { name: "Save a copy" })).toHaveClass("nt-sheet-primary");
    expect(screen.getByRole("button", { name: "Print" })).toHaveClass("nt-sheet-secondary");
    expect(screen.getAllByRole("link", { name: COPY.review.watch.sourceLabel })).toHaveLength(1);
    const watch = screen.getByRole("region", { name: "Watch out for these" });
    expect(within(watch).getAllByRole("listitem").length).toBeGreaterThanOrEqual(6);
    expect(within(watch).getByText(/audit protection \(paid help/)).toBeInTheDocument();
    expect(container.querySelectorAll(".nt-tfh-row p")).toHaveLength(0);
  });

  it("start page keeps Who does what in a closed section and cites the advice line", () => {
    const { container } = render(<Page />);
    const d = container.querySelector("details");
    expect(d).not.toBeNull();
    expect(d).not.toHaveAttribute("open");
    expect(screen.getAllByRole("link", { name: COPY.pick.sourceLabel })[0]).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/IRS partner site|signing number/);
  });

  it("copy-in page says the boxes start empty", async () => {
    render(<Page />);
    await toStep3();
    expect(screen.getByText(/The boxes start empty\. Type the sample answers shown\./)).toBeInTheDocument();
  });

  it("the practice banner shows on every step and no link is empty", async () => {
    render(<Page />);
    const banner = "Practice only. Use the made-up answers shown. Nothing is filed.";
    for (let i = 0; i < 3; i++) {
      expect(screen.getByText(banner)).toBeInTheDocument();
      for (const a of document.querySelectorAll("a")) expect((a.textContent ?? "").trim()).not.toBe("");
      if (i < 2) await click(COPY.next);
    }
    for (let i = 0; i < 3; i++) await click(i < 2 ? COPY.nextScreen : COPY.toReview);
    expect(screen.getByText(banner)).toBeInTheDocument();
    for (const a of document.querySelectorAll("a")) expect((a.textContent ?? "").trim()).not.toBe("");
  });

  it("shows Save or print on the review page", async () => {
    render(<Page />);
    await fillAll();
    expect(screen.getByText(COPY.save.title)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save a copy" })).toBeEnabled();
  });

  it("junk typing gives a plain different, never NaN", async () => {
    render(<Page />);
    await fillAll({ "Pay for the year": "lots", "Bank name": "\u{1F600}" });
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
    expect(screen.getByLabelText(COPY.review.resultLabel)).toHaveTextContent("6 of 8 answers match. 2 need a look.");
  });

  it("offers to pick up where the person stopped, and brings the typing back", async () => {
    const first = render(<Page />);
    await toStep3();
    await typeInto("First name", "Sample");
    first.unmount();
    render(<Page />);
    expect(screen.getByText(COPY.resume.title, { exact: false })).toBeInTheDocument();
    await click(COPY.resume.yes);
    expect(screen.getByText("Step 3 of 4: Copy the answers in")).toBeInTheDocument();
    expect(screen.getByLabelText("First name")).toHaveValue("Sample");
  });

  it("starts fresh when asked", async () => {
    const first = render(<Page />);
    await toStep3();
    first.unmount();
    render(<Page />);
    await click(COPY.resume.no);
    expect(screen.getByText("Step 1 of 4: Pick your way")).toBeInTheDocument();
  });

  it("survives damaged saved data", async () => {
    window.localStorage.setItem("nt:flow:tax-filing-helper", JSON.stringify({ v: 1, step: 0, at: "x", value: { step: 99, sub: "x", way: 5, typed: [1] } }));
    render(<Page />);
    await click(COPY.resume.yes);
    expect(screen.getByText("Step 1 of 4: Pick your way")).toBeInTheDocument();
    expect(screen.queryByText(/NaN|undefined/)).toBeNull();
  });

  it("Start over clears the typing and can put it back", async () => {
    render(<Page />);
    await toStep3();
    await typeInto("First name", "Sample");
    await click("Start over");
    await click("Clear the boxes");
    expect(screen.getByText("Step 1 of 4: Pick your way")).toBeInTheDocument();
    expect(window.localStorage.getItem("nt:flow:tax-filing-helper")).toBeNull();
    await click("Put it back");
    expect(screen.getByLabelText("First name")).toHaveValue("Sample");
  });

  it("keeps the privacy note", () => {
    render(<Page />);
    expect(screen.getByText(/stay on this phone/)).toBeInTheDocument();
  });
});

describe("Tax Filing Helper practice sheet", () => {
  it("is made up: no Social Security number shape and only example.com emails", () => {
    const blob = JSON.stringify(PRACTICE_SHEET);
    expect(blob).not.toMatch(/\b\d{3}-\d{2}-\d{4}\b/);
    for (const m of blob.match(/[\w.+-]+@[\w.-]+/g) ?? []) expect(m).toMatch(/@example\.com$/);
  });
});

describe("Tax Filing Helper copy", () => {
  const strings: string[] = [];
  (function walk(n: unknown) {
    if (typeof n === "string") strings.push(n);
    else if (Array.isArray(n)) n.forEach(walk);
    else if (n && typeof n === "object") Object.values(n).forEach(walk);
  })(COPY);
  const dash = new RegExp("[" + String.fromCharCode(0x2013, 0x2014) + "]");
  const matchers = buildMatchers(loadTerms(path.resolve(__dirname, "../../../..")));

  it("has no em or en dash", () => {
    for (const s of strings) expect(s).not.toMatch(dash);
  });
  it("uses no glossary term", () => {
    for (const s of strings) for (const { term, re } of matchers) if (re.test(s)) throw new Error(`"${term}" in: ${s}`);
  });
  it("reads at grade 7 or lower", () => {
    expect(gradeOf(strings.join("\n\n"))!.grade).toBeLessThanOrEqual(7);
  });
  it("never gives advice, never has a timer word, never asks for a secret", () => {
    const all = strings.join(" ");
    expect(all).not.toMatch(/\byou should\b|\bwe recommend\b|\btry to\b/i);
    expect(all).not.toMatch(/countdown|hurry|last chance|expires|deadline/i);
    expect(all).not.toMatch(/social security number|routing number|enter your password/i);
  });
});
