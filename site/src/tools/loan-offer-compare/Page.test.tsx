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

const offerBox = (n: number) => screen.getByRole("group", { name: `Offer ${n}` });

/** Types one offer. Every box is cleared first, and the unit chip is set. */
async function fillOffer(n: number, v: { amount: string; rate: string; term: string; fees?: string; unit?: "Months" | "Years" }) {
  await fill(`Offer ${n}: Amount borrowed`, v.amount);
  await fill(`Offer ${n}: Yearly interest rate`, v.rate);
  await fill(`Offer ${n}: How long`, v.term);
  await userEvent.click(within(offerBox(n)).getByRole("radio", { name: v.unit ?? "Months" }));
  await fill(`Offer ${n}: Upfront fees`, v.fees ?? "");
}

const card = () => screen.getByLabelText(COPY.facts.lowestCost);
const more = () => screen.getByText(COPY.more.summary).closest("details") as HTMLElement;
/** One row of the all-offers table, like "Total paid$10,951.88$12,000.00". */
const row = (label: string) => (within(within(more()).getByRole("table")).getByRole("rowheader", { name: label }).closest("tr") as HTMLElement);

function expectWaiting() {
  expect(card()).toHaveTextContent(COPY.waiting);
  expect(card()).not.toHaveTextContent(/Offer \d/);
}

const seeBtn = () => screen.getByRole("button", { name: COPY.see });

describe("Loan Offer Compare page", () => {
  it("opens with two empty offers and only the waiting words in the answer card", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(screen.getByText(COPY.title)).toBeInTheDocument();
    expect(screen.queryByText(/These are example numbers/)).toBeNull();
    expect(screen.getByRole("group", { name: "Offer 1" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Offer 2" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Offer 3" })).toBeNull();
    expect(screen.getByRole("button", { name: "Add a third offer" })).toBeInTheDocument();
    for (const n of [1, 2]) {
      expect(screen.getByLabelText(`Offer ${n}: Amount borrowed`)).toHaveValue("");
      expect(screen.getByLabelText(`Offer ${n}: Upfront fees`, { exact: false })).toHaveValue("");
    }
    expectWaiting();
    expect(card().querySelector(".nt-result-label")).toBeNull();
    expect(card().querySelector(".nt-result-tag")).toBeNull();
    expect(card()).toHaveAttribute("id", "nt-answer");
    expect(card()).toHaveAttribute("tabindex", "-1");
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("says it is free and sends nothing, and links to the code", () => {
    render(<Page />);
    expect(screen.getByText(/Your numbers stay on this phone or computer\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "How we know" })).toHaveAttribute("href", "#/private");
    expect(document.body.textContent).not.toMatch(/There is no Send button/);
  });

  it("puts the answer first, with no autofocus, no step labels and no old hints", () => {
    render(<Page />);
    const box = screen.getByLabelText("Offer 1: Amount borrowed", { exact: false });
    expect(card().compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(box).not.toHaveFocus();
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/Step \d of \d|You are here/);
    expect(text).not.toMatch(/Show my answer|That is your answer|Done\. Back to home|Change a number|Type my own numbers/);
  });

  it("the See which costs less button is the one main button while there is no answer, and it focuses the first empty box", async () => {
    render(<Page />);
    expect(document.querySelectorAll(".primary")).toHaveLength(1);
    expect(seeBtn()).toHaveClass("primary");
    expect(seeBtn().closest("details")).toBeNull();
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    await userEvent.click(seeBtn());
    expect(screen.getByLabelText("Offer 1: Amount borrowed")).toHaveFocus();
    await fill("Offer 1: Amount borrowed", "5000");
    await userEvent.click(seeBtn());
    expect(screen.getByLabelText("Offer 1: Yearly interest rate")).toHaveFocus();
  });

  it("once there is an answer, Done is the one main link, Print or save is an outline, and See which costs less is gone", async () => {
    render(<Page />);
    await fillOffer(1, { amount: "10000", rate: "0", term: "10" });
    await fillOffer(2, { amount: "10000", rate: "0", term: "20" });
    expect(document.querySelectorAll(".primary")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "I'm done" })).toHaveClass("primary");
    expect(screen.getByRole("link", { name: "I'm done" })).toHaveAttribute("href", "#/");
    expect(screen.getByRole("button", { name: "Print or save" })).not.toHaveClass("primary");
    expect(screen.getByRole("button", { name: "Print or save" }).closest("details")).toBeNull();
    expect(screen.queryByRole("button", { name: COPY.see })).toBeNull();
    expect(screen.queryByRole("button", { name: "Go up to my answer" })).toBeNull();
  });

  it("shows Start over once something is typed, with its undo note, and clearing shows the waiting words", async () => {
    render(<Page />);
    expect(screen.queryByText("You can put your numbers back.")).toBeNull();
    await fill("Offer 1: Amount borrowed", "9000");
    expect(screen.getByText("You can put your numbers back.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    expectWaiting();
    expect(screen.getByLabelText("Offer 1: Amount borrowed")).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
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
    expect(card()).toHaveTextContent("Offer 1");
    expect(card()).toHaveTextContent("Offer 1 costs $302.23 less in interest and fees. Offer 2 costs $73.93 less each month.");
    expect(card()).toHaveTextContent("Offer 1, interest and fees$951.88");
    expect(card()).toHaveTextContent("Offer 2, interest and fees$1,254.11");
    expect(card()).toHaveTextContent("Offer 1, each month$304.22");
    expect(card()).toHaveTextContent("Offer 2, each month$230.29");
    expect(card()).not.toHaveTextContent("Lowest monthly payment");
    expect(card()).not.toHaveTextContent(COPY.facts.split);
    expect(row(COPY.result.paymentLabel)).toHaveTextContent("$304.22$230.29");
    expect(row("Total paid")).toHaveTextContent("$10,951.88");
    expect(row("Total interest")).toHaveTextContent("$951.88");
    expect(row("Upfront fees")).toHaveTextContent("$0.00$200.00");
    expect(row("Cost of borrowing")).toHaveTextContent("$951.88$1,254.11");
    expect(more()).not.toHaveAttribute("open");
    expect(more()).toHaveTextContent("Lowest monthly payment: Offer 2");
    expect(more()).toHaveTextContent(COPY.facts.split);
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
    await fillOffer(3, { amount: "20000", rate: "8", term: "4", unit: "Years" });
    expect(card()).toHaveTextContent("Offer 3, each month$488.26");
    expect(card()).toHaveTextContent("Offer 3");
    expect(row(COPY.result.paymentLabel)).toHaveTextContent("$488.26");
    expect(more()).toHaveTextContent("Lowest monthly payment: Offer 2");
    await userEvent.click(screen.getByRole("button", { name: "Remove the third offer" }));
    expect(screen.queryByRole("group", { name: "Offer 3" })).toBeNull();
  });

  it("lists every offer when they tie", async () => {
    render(<Page />);
    await fillOffer(1, { amount: "5000", rate: "4", term: "24", fees: "50" });
    await fillOffer(2, { amount: "5,000", rate: "4.00", term: "24", fees: "50" });
    expect(card()).toHaveTextContent("Offer 1 and Offer 2");
    expect(card()).toHaveTextContent(COPY.facts.tieCost);
    expect(card()).not.toHaveTextContent(COPY.facts.tiePayment);
    expect(more()).toHaveTextContent(COPY.facts.tiePayment);
    expect(screen.queryByText(COPY.facts.differ)).toBeNull();
  });

  it("shows the table under the table summary", async () => {
    render(<Page />);
    await fillOffer(1, { amount: "10000", rate: "0", term: "10" });
    await fillOffer(2, { amount: "10000", rate: "0", term: "20" });
    await userEvent.click(screen.getByText(COPY.more.summary));
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
    expect(screen.getByText(COPY.notes.estimate)).toBeInTheDocument();
    expect(screen.getAllByText(/The yearly cost of the loan, with some fees/)).toHaveLength(1);
    const words = within(screen.getByText(COPY.key.summary).closest("details") as HTMLElement);
    for (const k of COPY.key.items) expect(words.getByText(k.term, { selector: "dt" })).toBeInTheDocument();
  });

  it("offers to use saved numbers and brings them back", async () => {
    const first = render(<Page />);
    await fill("Offer 1: Amount borrowed", "1200");
    first.unmount();
    render(<Page />);
    expect(screen.getByText(COPY.resume.title, { exact: false })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.getByLabelText("Offer 1: Amount borrowed")).toHaveValue("1200");
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
  });

  it("drops the saved copy and the prompt when the person says no thanks", async () => {
    const first = render(<Page />);
    await fill("Offer 1: Amount borrowed", "1200");
    first.unmount();
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.no }));
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
    expect(window.localStorage.getItem("nt:flow:loan-offer-compare")).toBeNull();
    expect(screen.getByLabelText("Offer 1: Amount borrowed")).toHaveValue("");
    expectWaiting();
  });

  it("shows the resume prompt only while the boxes are blank", async () => {
    const first = render(<Page />);
    await fill("Offer 1: Amount borrowed", "1200");
    first.unmount();
    render(<Page />);
    expect(screen.getByText(COPY.resume.title, { exact: false })).toBeInTheDocument();
    await fill("Offer 1: Amount borrowed", "7");
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
  });

  it("offers Print or save once there is an answer, and opens Print and Save a copy", async () => {
    render(<Page />);
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    await fillOffer(1, { amount: "10000", rate: "0", term: "10" });
    await fillOffer(2, { amount: "10000", rate: "0", term: "20" });
    expect(card()).toHaveTextContent("Offer 1, each month$1,000.00");
    expect(document.querySelectorAll(".primary")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "I'm done" })).toHaveClass("primary");
    expect(screen.getByRole("link", { name: "I'm done" })).toHaveAttribute("href", "#/");
    expect(screen.getByRole("button", { name: "Print or save" })).not.toHaveClass("primary");
    expect(screen.queryByRole("button", { name: "Print" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Print or save" }));
    expect(screen.getByRole("button", { name: "Print" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Save a copy" })).toBeEnabled();
    expect(screen.getByText(COPY.save.preview)).toBeInTheDocument();
  });
});

describe("Loan Offer Compare answer-first page", () => {
  it("keeps the Months and Years chips inside each offer", () => {
    render(<Page />);
    for (const n of [1, 2]) {
      const box = within(offerBox(n));
      expect(box.getByRole("radio", { name: "Months" })).toBeChecked();
      expect(box.getByRole("radio", { name: "Years" })).not.toBeChecked();
    }
  });

  it("hands the one main button back from Done to See which costs less when the answer goes away", async () => {
    render(<Page />);
    await fillOffer(1, { amount: "10000", rate: "0", term: "10" });
    await fillOffer(2, { amount: "10000", rate: "0", term: "20" });
    expect(screen.getByRole("link", { name: "I'm done" })).toHaveClass("primary");
    expect(screen.getByRole("link", { name: "I'm done" })).toHaveAttribute("href", "#/");
    expect(screen.getByRole("button", { name: "Print or save" })).not.toHaveClass("primary");
    await fill("Offer 1: Yearly interest rate", "");
    expect(document.querySelectorAll(".primary")).toHaveLength(1);
    expect(seeBtn()).toHaveClass("primary");
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    expect(screen.queryByRole("link", { name: "I'm done" })).toBeNull();
  });

  it("lets the person remove the third offer, then put it back", async () => {
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: "Add a third offer" }));
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
    await fill("Offer 1: Amount borrowed", "1234");
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
  it("shows the estimate sentence once, no APR, and a short save preview", async () => {
    render(<Page />);
    await fillOffer(1, { amount: "$10,000", rate: "6", term: "36" });
    await fillOffer(2, { amount: "10000", rate: "5", term: "48", fees: "$200" });
    const body = document.body.textContent ?? "";
    expect(body.split(COPY.notes.estimate).length - 1).toBe(1);
    expect(body.split(COPY.result.costHelp).length - 1).toBe(1);
    await userEvent.click(screen.getByRole("button", { name: "Print or save" }));
    expect(screen.getByRole("group", { name: "Preview" })).toHaveTextContent(COPY.save.preview);
    expect(screen.getByRole("group", { name: "Preview" })).not.toHaveTextContent("$");
    const open = (document.body.textContent ?? "").replace(/What the words mean[\s\S]*$/, "");
    expect(open).not.toMatch(/APR|HOA/);
  });
});
