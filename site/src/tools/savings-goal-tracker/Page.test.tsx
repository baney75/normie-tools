import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { gradeOf } from "../../../../scripts/check-reading-level.mjs";
import { buildMatchers, loadTerms } from "../../../../scripts/check-banned-jargon.mjs";
import { Page } from "./Page";
import { COPY } from "./copy";

beforeEach(() => window.localStorage.clear());

async function fill(label: string, text: string) {
  const box = screen.getByLabelText(label, { exact: false });
  await userEvent.clear(box);
  if (text) await userEvent.type(box, text);
}

describe("Savings Goal Tracker page", () => {
  it("shows the empty state and no answer", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: "Savings Goal Tracker" })).toBeInTheDocument();
    expect(screen.getByText(COPY.empty)).toBeInTheDocument();
    expect(screen.getByLabelText("Months to your goal")).toHaveTextContent(COPY.waiting);
    expect(screen.getByLabelText("Months to your goal")).toHaveTextContent("Step 2 of 2: Read your answer");
    expect(screen.getByText("Step 1 of 2: Type your numbers")).toBeInTheDocument();
    expect(screen.queryByText(/NaN|undefined|Infinity/)).toBeNull();
  });

  it("focuses the first box", () => {
    render(<Page />);
    expect(screen.getByLabelText("Goal amount")).toHaveFocus();
  });

  it("has one filled button: Print", async () => {
    const { container } = render(<Page />);
    expect(container.querySelectorAll(".nt-sheet-primary")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Print" })).toBeDisabled();
  });

  it("says nothing is sent and links to the page code", () => {
    render(<Page />);
    expect(screen.getByText(/Nothing is sent\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "our public page" })).toHaveAttribute("href", expect.stringContaining("github.com"));
  });

  it("has labels above inputs, decimal keypads, no autofill", () => {
    render(<Page />);
    for (const name of ["Goal amount", "Already saved", "Saved each month", "Yearly interest rate"]) {
      const box = screen.getByLabelText(name, { exact: false });
      expect(box).toHaveAttribute("inputmode", "decimal");
      expect(box).toHaveAttribute("autocomplete", "off");
    }
    expect(screen.getByLabelText("Start month", { exact: false })).toHaveAttribute("autocomplete", "off");
  });

  it("shows the exact months and landing month as the person types", async () => {
    render(<Page />);
    await fill("Goal amount", "$5,000");
    await fill("Already saved", "500");
    await fill("Saved each month", "250");
    await fill("Start month", "2026-12");
    const card = screen.getByLabelText("Months to your goal");
    expect(card).toHaveTextContent("18 months");
    expect(card).toHaveTextContent("You reach your goal in May 2028.");
    expect(card).toHaveTextContent("That is1 year 6 months");
    expect(card).toHaveTextContent("Total you add$4,500.00");
    expect(card).toHaveTextContent("Interest earned$0.00");
    expect(card).toHaveTextContent("Saved at the end$5,000.00");
  });

  it("adds yearly interest each month and shows the year table", async () => {
    render(<Page />);
    await fill("Goal amount", "10000");
    await fill("Already saved", "1000");
    await fill("Saved each month", "300");
    await fill("Yearly interest rate", "4.5");
    await fill("Start month", "2026-01");
    const card = screen.getByLabelText("Months to your goal");
    expect(card).toHaveTextContent("29 months");
    expect(card).toHaveTextContent("May 2028");
    expect(card).toHaveTextContent("Interest earned$587.21");
    expect(card).toHaveTextContent("Saved at the end$10,287.21");
    const table = screen.getByRole("table", { hidden: true });
    expect(within(table).getAllByRole("row", { hidden: true })).toHaveLength(1 + 3);
  });

  it("works out the monthly amount for a chosen month", async () => {
    render(<Page />);
    await userEvent.click(screen.getByLabelText(COPY.mode.by));
    expect(screen.queryByLabelText("Saved each month", { exact: false })).toBeNull();
    await fill("Goal amount", "10,000");
    await fill("Already saved", "1,000");
    await fill("Start month", "2026-12");
    await fill("Goal month", "2027-11");
    const card = screen.getByLabelText("Save each month");
    expect(card).toHaveTextContent("$750.00");
    expect(card).toHaveTextContent("Months counted12 months");
    expect(card).toHaveTextContent("Goal monthNovember 2027");
  });

  it("says plainly when the goal is already reached, nothing is saved, or it takes too long", async () => {
    render(<Page />);
    await fill("Goal amount", "5000");
    await fill("Already saved", "6000");
    await fill("Saved each month", "0");
    expect(screen.getByLabelText("Months to your goal")).toHaveTextContent("Already there");
    await fill("Already saved", "500");
    expect(screen.getByLabelText("Months to your goal")).toHaveTextContent("Not reached");
    await fill("Goal amount", "1201");
    await fill("Already saved", "0");
    await fill("Saved each month", "1");
    expect(screen.getByLabelText("Months to your goal")).toHaveTextContent("Over 1,200 months");
  });

  it("asks only for what is still needed", async () => {
    render(<Page />);
    await fill("Goal amount", "5000");
    expect(screen.getByText("Still needed: Saved each month.")).toBeInTheDocument();
    expect(screen.getByLabelText("Months to your goal")).toHaveTextContent(COPY.waiting);
  });

  it("shows a calm error that names the field on junk, never NaN", async () => {
    render(<Page />);
    await fill("Goal amount", "lots");
    await fill("Saved each month", "100");
    expect(screen.getByText(/Goal amount: use a number above zero/)).toBeInTheDocument();
    expect(screen.getByLabelText("Goal amount")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(COPY.fixFirst)).toBeInTheDocument();
    expect(screen.getByLabelText("Months to your goal")).toHaveTextContent(COPY.waiting);
    await fill("Goal amount", "1000");
    await fill("Start month", "Dec 2026");
    expect(screen.getByText(/Start month: type the year/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("says it is an estimate and explains the words", () => {
    render(<Page />);
    expect(screen.getByText("This is an estimate from the numbers you typed. Your bank statement is the final word. This page helps you understand the numbers.")).toBeInTheDocument();
    for (const k of COPY.key.items) expect(screen.getByText(k.term, { selector: "dt" })).toBeInTheDocument();
  });

  it("offers to use saved numbers and brings them back", async () => {
    const first = render(<Page />);
    await fill("Goal amount", "1200");
    first.unmount();
    render(<Page />);
    expect(screen.getByText(COPY.resume.title, { exact: false })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.getByLabelText("Goal amount")).toHaveValue("1200");
  });

  it("starts fresh when asked", async () => {
    const first = render(<Page />);
    await fill("Goal amount", "1200");
    first.unmount();
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.no }));
    expect(screen.getByLabelText("Goal amount")).toHaveValue("");
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
  });

  it("always shows Save or print, and turns it on once there is an answer", async () => {
    render(<Page />);
    expect(screen.getByText("Keep your answer if you want")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save a copy" })).toBeDisabled();
    await fill("Goal amount", "1000");
    await fill("Saved each month", "100");
    expect(screen.getByRole("button", { name: "Save a copy" })).toBeEnabled();
    expect(screen.getByLabelText("Months to your goal")).toHaveTextContent("10 months");
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
  });
});

describe("Savings Goal Tracker copy", () => {
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
  it("never gives advice", () => {
    expect(strings.join(" ")).not.toMatch(/\byou should\b|\bwe recommend\b|\bbest way\b|\bsave more\b|\byou must\b/i);
  });
});

describe("savings-goal-tracker Start over", () => {
  it("clears the first box and the saved copy, then puts it back", async () => {
    render(<Page />);
    const box = () => screen.getAllByRole("textbox")[0];
    await userEvent.type(box(), "1234");
    expect(window.localStorage.getItem("nt:flow:savings-goal-tracker")).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Keep my numbers" }));
    expect(box()).toHaveValue("1234");
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    expect(box()).toHaveValue("");
    expect(window.localStorage.getItem("nt:flow:savings-goal-tracker")).toBeNull();
    expect(screen.getByText(/Your numbers are cleared\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Put it back" }));
    expect(box()).toHaveValue("1234");
  });
});
