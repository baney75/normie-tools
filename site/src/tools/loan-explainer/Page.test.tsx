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

describe("Loan Explainer page", () => {
  it("shows the empty state and no answer", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: "Loan Explainer" })).toBeInTheDocument();
    expect(screen.getByText("Type the numbers from your loan. Your answer shows below.")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Step \d of \d|You are here/);
    expect(screen.getByLabelText("Monthly payment")).toHaveTextContent(COPY.waiting);
    expect(screen.getByLabelText("Amount borrowed")).toHaveFocus();
    const intro = screen.getByText(COPY.intro);
    const privacy = screen.getByText(/no Send button/);
    expect(intro.compareDocumentPosition(privacy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(privacy.compareDocumentPosition(screen.getByLabelText("Amount borrowed")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText(/NaN|undefined|Infinity/)).toBeNull();
  });

  it("has labels above inputs, decimal keypads, no autofill", () => {
    render(<Page />);
    for (const name of ["Amount borrowed", "Yearly interest rate", "Upfront fees", "Extra each month"]) {
      const box = screen.getByLabelText(name, { exact: false });
      expect(box).toHaveAttribute("inputmode", "decimal");
      expect(box).toHaveAttribute("autocomplete", "off");
    }
    expect(screen.getByLabelText(/How long is the loan/)).toHaveAttribute("inputmode", "numeric");
  });

  it("shows the exact answer as the person types", async () => {
    render(<Page />);
    await fill("Amount borrowed", "$10,000");
    await fill("Yearly interest rate", "6");
    await fill("How long", "36");
    const card = screen.getByLabelText("Monthly payment");
    expect(card).toHaveTextContent("$304.22");
    expect(card).toHaveTextContent("Total paid$10,951.88");
    expect(card).toHaveTextContent("Total interest$951.88");
    expect(card).toHaveTextContent("Cost of borrowing$951.88");
    expect(screen.queryByText("With your extra payment")).toBeNull();
  });

  it("counts years and shows fees, extra payment savings and the by-year table", async () => {
    render(<Page />);
    await fill("Amount borrowed", "$20,000");
    await fill("Yearly interest rate", "7.25%");
    await fill("How long", "5");
    await userEvent.click(screen.getByLabelText("Years"));
    await fill("Upfront fees", "$500");
    await fill("Extra each month", "$100");
    expect(screen.getByLabelText("Monthly payment")).toHaveTextContent("$398.39");
    expect(screen.getByLabelText("Monthly payment")).toHaveTextContent("Loan length60 months");
    expect(screen.getByLabelText("Monthly payment")).toHaveTextContent("Cost of borrowing$4,403.20");
    const extra = screen.getByRole("region", { name: "With your extra payment" });
    expect(extra).toHaveTextContent("Paid off after47 months");
    expect(extra).toHaveTextContent("Months saved13");
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(1 + 4);
    expect(within(table).getAllByRole("row")[4]).toHaveTextContent("$0.00");
  });

  it("asks only for what is still needed", async () => {
    render(<Page />);
    await fill("Amount borrowed", "5000");
    expect(screen.getByText(/Still needed/)).toHaveTextContent("Still needed: Yearly interest rate, How long is the loan?.");
    expect(screen.getByLabelText("Monthly payment")).toHaveTextContent(COPY.waiting);
  });

  it("shows a calm error that names the field on junk, never NaN", async () => {
    render(<Page />);
    await fill("Amount borrowed", "lots");
    await fill("Yearly interest rate", "6");
    await fill("How long", "36");
    expect(screen.getByText(/Amount borrowed: use a number above zero/)).toBeInTheDocument();
    expect(screen.getByLabelText("Amount borrowed")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(COPY.fixFirst)).toBeInTheDocument();
    expect(screen.getByLabelText("Monthly payment")).toHaveTextContent(COPY.waiting);
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("says it is an estimate, keeps the yearly cost line in the closed words list only, and explains the words", () => {
    render(<Page />);
    expect(screen.getByText("This is an estimate, a close guess from the numbers you typed. Your lender statement is the final word. This page helps you understand the numbers.")).toBeInTheDocument();
    expect(screen.getAllByText(/The yearly cost of the loan, with some fees/)).toHaveLength(1);
    expect(screen.getByText(/The yearly cost of the loan, with some fees/).closest("details")).not.toBeNull();
    for (const k of COPY.key.items) expect(screen.getByText(k.term, { selector: "dt" })).toBeInTheDocument();
  });

  it("offers to use saved numbers and brings them back", async () => {
    const first = render(<Page />);
    await fill("Amount borrowed", "1200");
    first.unmount();
    render(<Page />);
    expect(screen.getByText(COPY.resume.title, { exact: false })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.getByLabelText("Amount borrowed")).toHaveValue("1200");
  });

  it("starts fresh when asked", async () => {
    const first = render(<Page />);
    await fill("Amount borrowed", "1200");
    first.unmount();
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.no }));
    expect(screen.getByLabelText("Amount borrowed")).toHaveValue("");
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
  });

  it("offers Save or print once there is an answer", async () => {
    render(<Page />);
    expect(screen.queryByText(COPY.save.title)).toBeNull();
    await fill("Amount borrowed", "10000");
    await fill("Yearly interest rate", "0");
    await fill("How long", "10");
    expect(screen.getByText(COPY.save.title)).toBeInTheDocument();
    expect(screen.getByText(COPY.save.title).closest("details")).toBeNull();
    expect(document.querySelectorAll(".primary")).toHaveLength(1);
    expect(screen.getByLabelText("Monthly payment")).toHaveTextContent("$1,000.00");
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
  });
});

describe("Loan Explainer copy", () => {
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
    expect(strings.join(" ")).not.toMatch(/\byou should\b|\bwe recommend\b|\bbest loan\b|\btake this loan\b/i);
  });
});

describe("loan-explainer Start over", () => {
  it("clears the first box and the saved copy, then puts it back", async () => {
    render(<Page />);
    const box = () => screen.getAllByRole("textbox")[0];
    await userEvent.type(box(), "1234");
    expect(window.localStorage.getItem("nt:flow:loan-explainer")).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    expect(box()).toHaveValue("");
    expect(window.localStorage.getItem("nt:flow:loan-explainer")).toBeNull();
    expect(screen.getByText(/Your numbers are cleared\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Put it back" }));
    expect(box()).toHaveValue("1234");
  });
});

describe("loan-explainer Start over can be called off", () => {
  it("keeps the numbers when asked to", async () => {
    render(<Page />);
    await userEvent.type(screen.getAllByRole("textbox")[0], "55");
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Keep my numbers" }));
    expect(screen.getAllByRole("textbox")[0]).toHaveValue("55");
  });
});

describe("loan-explainer filled screen", () => {
  it("shows the estimate sentence once, no APR, one answer line, and a short save preview", async () => {
    render(<Page />);
    await fill("Amount borrowed", "$10,000");
    await fill("Yearly interest rate", "6");
    await fill("How long", "36");
    const body = document.body.textContent ?? "";
    expect(body.split("Your lender statement is the final word").length - 1).toBe(1);
    expect(body.split("That is your answer").length - 1).toBe(1);
    expect(screen.getByRole("group", { name: "Preview" })).toHaveTextContent(COPY.save.preview);
    expect(screen.getByRole("group", { name: "Preview" })).not.toHaveTextContent("$");
    const open = body.replace(/What the words mean[\s\S]*$/, "");
    expect(open).not.toMatch(/APR|HOA/);
  });
});
