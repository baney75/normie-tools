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

async function fillOffer(n: number, v: { amount: string; rate: string; term: string; fees?: string }) {
  await fill(`Offer ${n}: Amount borrowed`, v.amount);
  await fill(`Offer ${n}: Yearly interest rate`, v.rate);
  await fill(`Offer ${n}: How long`, v.term);
  if (v.fees) await fill(`Offer ${n}: Upfront fees`, v.fees);
}

function expectWaiting() {
  const card = screen.getByLabelText("Lowest cost of borrowing");
  expect(card).toHaveTextContent("Your answer shows here");
  expect(card).not.toHaveTextContent(/Offer \d/);
}

describe("Loan Offer Compare page", () => {
  it("starts with two offers, shows the empty state and no answer", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: "Loan Offer Compare" })).toBeInTheDocument();
    expect(screen.getByText("Type the numbers from two loan offers. Your answer shows below.")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Offer 1" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Offer 2" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Offer 3" })).toBeNull();
    expect(screen.getByRole("button", { name: "Add a third offer" })).toBeInTheDocument();
    expect(screen.getByText(COPY.addHint)).toBeInTheDocument();
    expectWaiting();
    expect(screen.queryByText(/NaN|undefined|Infinity/)).toBeNull();
  });

  it("has decimal keypads and no autofill on every box", () => {
    render(<Page />);
    for (const n of [1, 2]) {
      for (const name of ["Amount borrowed", "Yearly interest rate", "Upfront fees"]) {
        const box = screen.getByLabelText(`Offer ${n}: ${name}`, { exact: false });
        expect(box).toHaveAttribute("inputmode", "decimal");
        expect(box).toHaveAttribute("autocomplete", "off");
      }
      expect(screen.getByLabelText(`Offer ${n}: How long`, { exact: false })).toHaveAttribute("inputmode", "numeric");
    }
  });

  it("shows the exact numbers for each offer and names the lowest as facts", async () => {
    render(<Page />);
    await fillOffer(1, { amount: "$10,000", rate: "6", term: "36" });
    await fillOffer(2, { amount: "10000", rate: "5", term: "48", fees: "$200" });
    const one = screen.getByLabelText("Offer 1, monthly payment");
    expect(one).toHaveTextContent("$304.22");
    expect(one).toHaveTextContent("Total paid$10,951.88");
    expect(one).toHaveTextContent("Total interest$951.88");
    expect(one).toHaveTextContent("Cost of borrowing$951.88");
    const two = screen.getByLabelText("Offer 2, monthly payment");
    expect(two).toHaveTextContent("$230.29");
    expect(two).toHaveTextContent("Upfront fees$200.00");
    expect(two).toHaveTextContent("Cost of borrowing$1,254.11");
    expect(screen.getByLabelText("Lowest cost of borrowing")).toHaveTextContent("Offer 1");
    const card = screen.getByLabelText("Lowest cost of borrowing");
    expect(card).not.toHaveTextContent("Lowest monthly payment");
    expect(card).not.toHaveTextContent(COPY.facts.split);
    const more = screen.getByText("More about the offers").closest("details") as HTMLElement;
    expect(more).not.toHaveAttribute("open");
    expect(more).toHaveTextContent("Lowest monthly payment: Offer 2");
    expect(more).toHaveTextContent(COPY.facts.split);
    expect(screen.queryByLabelText("Lowest monthly payment")).toBeNull();
    expect(screen.getByText(COPY.facts.differ)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\bbest\b/i);
  });

  it("adds a third offer and compares all three", async () => {
    render(<Page />);
    await fillOffer(1, { amount: "20000", rate: "7.25", term: "60", fees: "500" });
    await fillOffer(2, { amount: "20000", rate: "6.5", term: "60", fees: "900" });
    await userEvent.click(screen.getByRole("button", { name: "Add a third offer" }));
    expect(screen.getByRole("group", { name: "Offer 3" })).toBeInTheDocument();
    expectWaiting();
    expect(screen.getByText(/Still needed/)).toHaveTextContent("Still needed: Offer 3: Amount borrowed");
    await fillOffer(3, { amount: "20000", rate: "8", term: "4" });
    await userEvent.click(screen.getByLabelText("Offer 3: Years"));
    expect(screen.getByLabelText("Offer 3, monthly payment")).toHaveTextContent("$488.26");
    expect(screen.getByLabelText("Lowest cost of borrowing")).toHaveTextContent("Offer 3");
    expect(screen.getByText("More about the offers").closest("details")).toHaveTextContent("Lowest monthly payment: Offer 2");
    await userEvent.click(screen.getByRole("button", { name: "Remove the third offer" }));
    expect(screen.queryByRole("group", { name: "Offer 3" })).toBeNull();
  });

  it("lists every offer when they tie", async () => {
    render(<Page />);
    await fillOffer(1, { amount: "5000", rate: "4", term: "24", fees: "50" });
    await fillOffer(2, { amount: "5,000", rate: "4.00", term: "24", fees: "50" });
    expect(screen.getByLabelText("Lowest cost of borrowing")).toHaveTextContent("Offer 1 and Offer 2");
    expect(screen.getByLabelText("Lowest cost of borrowing")).toHaveTextContent(COPY.facts.tieCost);
    expect(screen.getByLabelText("Lowest cost of borrowing")).not.toHaveTextContent(COPY.facts.tiePayment);
    expect(screen.queryByText(COPY.facts.differ)).toBeNull();
  });

  it("shows the table under the table summary", async () => {
    render(<Page />);
    await fillOffer(1, { amount: "10000", rate: "0", term: "10" });
    await fillOffer(2, { amount: "10000", rate: "0", term: "20" });
    await userEvent.click(screen.getByText("More about the offers"));
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader")).toHaveLength(3);
    expect(within(table).getAllByRole("row")[1]).toHaveTextContent("$1,000.00$500.00");
  });

  it("asks only for what is still needed", async () => {
    render(<Page />);
    await fill("Offer 1: Amount borrowed", "5000");
    expect(screen.getByText(/Still needed/)).toHaveTextContent("Still needed: Offer 1: Yearly interest rate, Offer 1: How long is the loan?, Offer 2: Amount borrowed");
    expectWaiting();
  });

  it("shows a calm error that names the offer and field on junk, never NaN", async () => {
    render(<Page />);
    await fillOffer(1, { amount: "1000", rate: "5", term: "12" });
    await fillOffer(2, { amount: "lots", rate: "5", term: "12" });
    expect(screen.getByText(/Offer 2: Amount borrowed: use a number above zero/)).toBeInTheDocument();
    expect(screen.getByLabelText("Offer 2: Amount borrowed")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Offer 1: Amount borrowed")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByText(COPY.fixFirst)).toBeInTheDocument();
    expectWaiting();
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("says it is an estimate, says the lender shows the yearly cost, and explains the words", () => {
    render(<Page />);
    expect(screen.getByText("This is an estimate, a close guess from the numbers you typed. Your lender statement is the final word. This page helps you understand the numbers.")).toBeInTheDocument();
    expect(screen.getAllByText(/The yearly cost of the loan, with some fees/)).toHaveLength(1);
    for (const k of COPY.key.items) expect(screen.getByText(k.term, { selector: "dt" })).toBeInTheDocument();
  });

  it("offers to use saved numbers and brings them back", async () => {
    const first = render(<Page />);
    await fill("Offer 1: Amount borrowed", "1200");
    first.unmount();
    render(<Page />);
    expect(screen.getByText(COPY.resume.title, { exact: false })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.getByLabelText("Offer 1: Amount borrowed")).toHaveValue("1200");
  });

  it("starts fresh when asked", async () => {
    const first = render(<Page />);
    await fill("Offer 1: Amount borrowed", "1200");
    first.unmount();
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.no }));
    expect(screen.getByLabelText("Offer 1: Amount borrowed")).toHaveValue("");
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
  });

  it("offers Save or print once there is an answer", async () => {
    render(<Page />);
    expect(screen.getByRole("button", { name: "Print" })).toBeDisabled();
    await fillOffer(1, { amount: "10000", rate: "0", term: "10" });
    await fillOffer(2, { amount: "10000", rate: "0", term: "20" });
    expect(screen.getByRole("heading", { name: "Keep your answer if you want" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print" })).toBeEnabled();
    expect(screen.getByLabelText("Offer 1, monthly payment")).toHaveTextContent("$1,000.00");
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
  });
});

describe("Loan Offer Compare first-time help", () => {
  it("shows a waiting answer from the start, with no step labels, and the privacy line under the intro", () => {
    render(<Page />);
    expect(document.body.textContent).not.toMatch(/Step \d of \d|You are here/);
    const intro = screen.getByText(COPY.intro);
    const privacy = screen.getByText(/no Send button/);
    expect(intro.compareDocumentPosition(privacy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(privacy.compareDocumentPosition(screen.getByLabelText("Offer 1: Amount borrowed", { exact: false })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expectWaiting();
  });

  it("puts the cursor in the first box", () => {
    render(<Page />);
    expect(screen.getByLabelText("Offer 1: Amount borrowed", { exact: false })).toHaveFocus();
  });

  it("has one primary button, always in view, outside any fold", async () => {
    render(<Page />);
    // Nothing typed yet: the one filled button sends the person to the first box.
    expect(screen.getByRole("button", { name: "Show my answer" })).toHaveClass("primary");
    expect(screen.getByRole("heading", { name: "Keep your answer if you want" }).closest("details")).toBeNull();
  });

  it("uses the shared privacy note with a place to check it", () => {
    render(<Page />);
    expect(screen.getByText(/There is no Send button on this page\. Your numbers are worked out here\./)).toBeInTheDocument();
  });

  it("explains Remove, then lets the person put the third offer back", async () => {
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: "Add a third offer" }));
    expect(screen.getByText("Remove takes out one line. Put it back brings it back.")).toBeInTheDocument();
    await fill("Offer 3: Amount borrowed", "7777");
    await userEvent.click(screen.getByRole("button", { name: "Remove the third offer" }));
    expect(screen.queryByRole("group", { name: "Offer 3" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Put it back" }));
    expect(screen.getByLabelText("Offer 3: Amount borrowed")).toHaveValue("7777");
    expect(screen.queryByRole("button", { name: "Put it back" })).toBeNull();
  });
});

describe("Loan Offer Compare copy", () => {
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
  it("never gives advice and never says best", () => {
    expect(strings.join(" ")).not.toMatch(/\byou should\b|\bwe recommend\b|\bbest\b|\btake this loan\b|\bpick\b/i);
  });
});

describe("loan-offer-compare Start over", () => {
  it("clears the first box and the saved copy, then puts it back", async () => {
    render(<Page />);
    const box = () => screen.getAllByRole("textbox")[0];
    await userEvent.type(box(), "1234");
    expect(window.localStorage.getItem("nt:flow:loan-offer-compare")).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(box()).toHaveValue("1234");
    await userEvent.click(screen.getByRole("button", { name: "Keep my numbers" }));
    expect(box()).toHaveValue("1234");
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    expect(box()).toHaveValue("");
    expect(window.localStorage.getItem("nt:flow:loan-offer-compare")).toBeNull();
    expect(screen.getByText(/Your numbers are cleared\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Put it back" }));
    expect(box()).toHaveValue("1234");
  });
});

describe("loan-offer-compare filled screen", () => {
  it("shows the estimate sentence once, no APR, one answer line, and a short save preview", async () => {
    render(<Page />);
    await fillOffer(1, { amount: "$10,000", rate: "6", term: "36" });
    await fillOffer(2, { amount: "10000", rate: "5", term: "48", fees: "$200" });
    const body = document.body.textContent ?? "";
    expect(body.split("Your lender statement is the final word").length - 1).toBe(1);
    expect(body.split("That is your answer").length - 1).toBe(1);
    expect(body.split("Each month for the whole loan").length - 1).toBe(0);
    expect(body.split(COPY.result.costHelp).length - 1).toBe(1);
    expect(screen.getByRole("group", { name: "Preview" })).toHaveTextContent(COPY.save.preview);
    expect(screen.getByRole("group", { name: "Preview" })).not.toHaveTextContent("$");
    const open = body.replace(/What the words mean[\s\S]*$/, "");
    expect(open).not.toMatch(/APR|HOA/);
  });
});
