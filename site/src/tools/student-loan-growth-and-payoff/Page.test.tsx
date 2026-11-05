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

async function fillGolden() {
  await fill("Loan balance", "$20,000");
  await fill("Yearly interest rate", "5");
  await fill("Months with no payments", "6");
  await fill("Monthly payment", "300");
  await fill("First payment month", "2026-09");
  await fill("Years you want", "10");
}

describe("Student Loan Growth and Payoff page", () => {
  it("shows the empty state and no answer", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: "Student Loan Growth and Payoff" })).toBeInTheDocument();
    expect(screen.getByText(COPY.intro)).toBeInTheDocument();
    expect(screen.getByLabelText("Balance when payments start")).toHaveTextContent("Your answer shows here");
    expect(screen.queryByText(/Step \d of \d/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
    expect(screen.getByLabelText("Loan balance", { exact: false })).toHaveFocus();
    expect(screen.getByText(/no Send button/)).toBeInTheDocument();
    expect(screen.queryByText(/NaN|undefined|Infinity/)).toBeNull();
  });

  it("keeps every closed section labeled and has one way home", async () => {
    const { container } = render(<Page />);
    await fillGolden();
    const sums = Array.from(container.querySelectorAll("summary"));
    expect(sums.length).toBeLessThanOrEqual(2);
    for (const el of sums) expect((el.textContent ?? "").trim()).not.toBe("");
    expect(screen.getAllByText(/Back to home/)).toHaveLength(1);
  });

  it("has labels above inputs, a keypad that fits each box, no autofill", () => {
    render(<Page />);
    for (const name of ["Loan balance", "Yearly interest rate", "Monthly payment"]) {
      const box = screen.getByLabelText(name, { exact: false });
      expect(box).toHaveAttribute("inputmode", "decimal");
      expect(box).toHaveAttribute("autocomplete", "off");
    }
    expect(screen.getByLabelText(/Months with no payments/)).toHaveAttribute("inputmode", "numeric");
    expect(screen.getByLabelText(/First payment month/)).toHaveAttribute("inputmode", "text");
    expect(screen.getByLabelText(/First payment month/)).toHaveAttribute("autocomplete", "off");
  });

  it("shows the exact answers as the person types, toggle off", async () => {
    render(<Page />);
    await fillGolden();
    const card = screen.getByLabelText("Balance when payments start");
    expect(card).toHaveTextContent("$20,499.98");
    expect(card).toHaveTextContent("Interest that grew before your first payment$499.98");
    expect(card).toHaveTextContent("Months to pay off81");
    expect(card).toHaveTextContent("Total interest$4,171.44");
    expect(card).toHaveTextContent("Payoff monthMay 2033");
    expect(card).toHaveTextContent("Smallest payment to finish in 10 years$217.39");
  });

  it("changes the answer when unpaid interest is added to the balance", async () => {
    render(<Page />);
    await fillGolden();
    await userEvent.click(screen.getByLabelText(/Add the unpaid interest/));
    const card = screen.getByLabelText("Balance when payments start");
    expect(card).toHaveTextContent("Total interest$4,176.47");
    expect(card).toHaveTextContent("Smallest payment to finish in 10 years$217.44");
  });

  it("shows only the balance when no payment is typed", async () => {
    render(<Page />);
    await fill("Loan balance", "5000");
    await fill("Yearly interest rate", "4.5");
    await fill("Months with no payments", "12");
    const card = screen.getByLabelText("Balance when payments start");
    expect(card).toHaveTextContent("$5,225.00");
    expect(card).not.toHaveTextContent("Months to pay off");
  });

  it("opens the year-by-year sections", async () => {
    render(<Page />);
    await fillGolden();
    await userEvent.click(screen.getByText("Show year by year"));
    const years = document.querySelectorAll(".nt-slg-year");
    expect(years).toHaveLength(7);
    expect(within(years[6] as HTMLElement).getByText(/Year 7/)).toBeInTheDocument();
    expect(years[6]).toHaveTextContent("Still owe$0.00");
  });

  it("puts the privacy line right under the intro", () => {
    render(<Page />);
    const intro = screen.getByText(COPY.intro);
    expect(intro.nextElementSibling).toHaveTextContent(/no Send button/);
  });

  it("says why no interest grew when no months passed", async () => {
    render(<Page />);
    await fill("Loan balance", "5000");
    await fill("Yearly interest rate", "5.5");
    const card = screen.getByLabelText("Balance when payments start");
    expect(card).toHaveTextContent("$5,000.00");
    expect(card).toHaveTextContent(COPY.result.noGrowth);
    expect(card).toHaveTextContent("That is your answer. You can stop here. Or change a number to try again. Your numbers stay.");
    await fill("Months with no payments", "6");
    expect(card).not.toHaveTextContent(COPY.result.noGrowth);
  });

  it("asks only for what is still needed", async () => {
    render(<Page />);
    await fill("Loan balance", "5000");
    expect(screen.getByText("Still needed: Yearly interest rate.")).toBeInTheDocument();
    expect(screen.getByLabelText("Balance when payments start")).toHaveTextContent("Your answer shows here");
  });

  it("shows a calm error that names the field on junk, never NaN", async () => {
    render(<Page />);
    await fill("Loan balance", "lots");
    await fill("Yearly interest rate", "5");
    expect(screen.getByText(/Loan balance: use a number above zero/)).toBeInTheDocument();
    expect(screen.getByLabelText("Loan balance")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(COPY.fixFirst)).toBeInTheDocument();
    expect(screen.getByLabelText("Balance when payments start")).toHaveTextContent("Your answer shows here");
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("explains a bad start month and a payment that is too small", async () => {
    render(<Page />);
    await fill("Loan balance", "10000");
    await fill("Yearly interest rate", "6");
    await fill("First payment month", "9/2026");
    expect(screen.getByText(/Payments start: type the year/)).toBeInTheDocument();
    await fill("First payment month", "");
    await fill("Monthly payment", "50");
    expect(screen.getByText(/too small to pay off the loan in 100 years/)).toBeInTheDocument();
  });

  it("says the loan statement is the final word", () => {
    render(<Page />);
    expect(screen.getByText("Your loan statement is the final word. This page helps you understand it.")).toBeInTheDocument();
  });

  it("offers to use saved numbers and brings them back", async () => {
    const first = render(<Page />);
    await fill("Loan balance", "1200");
    first.unmount();
    render(<Page />);
    expect(screen.getByText(COPY.resume.title, { exact: false })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.getByLabelText("Loan balance")).toHaveValue("1200");
  });

  it("starts fresh when asked", async () => {
    const first = render(<Page />);
    await fill("Loan balance", "1200");
    first.unmount();
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.no }));
    expect(screen.getByLabelText("Loan balance")).toHaveValue("");
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
  });

  it("offers Save or print once there is an answer", async () => {
    render(<Page />);
    expect(screen.getByText("Keep your answer if you want")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print" })).toBeDisabled();
    await fill("Loan balance", "12000");
    await fill("Yearly interest rate", "0");
    await fill("Monthly payment", "250");
    expect(screen.getByLabelText("Balance when payments start")).toHaveTextContent("Months to pay off48");
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
  });
});

describe("Student Loan Growth and Payoff copy", () => {
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
    expect(strings.join(" ")).not.toMatch(/\byou should\b|\bwe recommend\b|\bbest\b|\btake this loan\b|\bpay it off first\b/i);
  });
});

describe("student-loan-growth-and-payoff Start over", () => {
  it("clears the first box and the saved copy, then puts it back", async () => {
    render(<Page />);
    const box = () => screen.getAllByRole("textbox")[0];
    await userEvent.type(box(), "1234");
    expect(window.localStorage.getItem("nt:flow:student-loan-growth-and-payoff")).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    expect(box()).toHaveValue("");
    expect(window.localStorage.getItem("nt:flow:student-loan-growth-and-payoff")).toBeNull();
    expect(screen.getByText(/Your numbers are cleared\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Put it back" }));
    expect(box()).toHaveValue("1234");
  });
});
