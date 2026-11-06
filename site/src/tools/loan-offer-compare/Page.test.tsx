import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { gradeOf } from "../../../../scripts/check-reading-level.mjs";
import { buildMatchers, loadTerms } from "../../../../scripts/check-banned-jargon.mjs";
import { Page } from "./Page";
import { COPY } from "./copy";

beforeEach(() => {
  window.localStorage.clear();
  window.scrollTo = () => {};
});

async function fill(label: string, text: string) {
  const box = screen.getByLabelText(label, { exact: false });
  await userEvent.clear(box);
  if (text) await userEvent.type(box, text);
}

const cont = () => userEvent.click(screen.getByRole("button", { name: "Continue" }));
const see = () => userEvent.click(screen.getByRole("button", { name: COPY.see }));
const back = () => userEvent.click(screen.getByRole("button", { name: "Back" }));
const changeMine = () => userEvent.click(screen.getByRole("button", { name: "Change my numbers" }));
const addThird = () => userEvent.click(screen.getByRole("button", { name: "Add a third offer" }));

type OfferValues = { amount: string; rate: string; term: string; fees?: string; unit?: "Months" | "Years" };

/** Offer n, first step: amount and rate, then Continue. */
async function amountRate(n: number, v: Pick<OfferValues, "amount" | "rate">) {
  await fill(`Offer ${n}: Amount borrowed`, v.amount);
  await fill(`Offer ${n}: Yearly interest rate`, v.rate);
  await cont();
}

/** Offer n, second step: length, the Months or Years chip, and fees. Then Continue, or the last button when it is the last offer. */
async function lengthFees(n: number, v: Pick<OfferValues, "term" | "fees" | "unit">, last: boolean) {
  await fill(`Offer ${n}: How long`, v.term);
  await userEvent.click(screen.getByRole("radio", { name: v.unit ?? "Months" }));
  await fill(`Offer ${n}: Upfront fees`, v.fees ?? "");
  await (last ? see() : cont());
}

/** Walks one offer's two steps. Every box is cleared first, and the unit chip is set. */
async function walkOffer(n: number, v: OfferValues, last: boolean) {
  await amountRate(n, v);
  await lengthFees(n, v, last);
}

/** From step 1, walks the offers in order and lands on the answer screen. */
async function walkOffers(...offers: OfferValues[]) {
  for (const [i, v] of offers.entries()) await walkOffer(i + 1, v, i === offers.length - 1);
}

/** From step 1, presses Continue until the person is n steps in (0 is step 1). The boxes must be ready. */
async function toStep(n: number) {
  for (let i = 0; i < n; i++) await cont();
}

const TEN_YEARS: OfferValues = { amount: "10000", rate: "0", term: "10" };
const TWENTY_YEARS: OfferValues = { amount: "10000", rate: "0", term: "20" };

/** Writes a saved copy the way the page does, so "Use them" has something to bring back. */
function seed(step: number, offers: Partial<Record<"amount" | "rate" | "term" | "fees" | "termUnit", string>>[]) {
  const full = offers.map((o) => ({ amount: "", rate: "", term: "", termUnit: "months", fees: "", ...o }));
  window.localStorage.setItem("nt:flow:loan-offer-compare", JSON.stringify({ v: 1, step, at: new Date().toISOString(), value: { offers: full } }));
}

const card = () => screen.getByLabelText(COPY.facts.lowestCost);
const more = () => screen.getByText(COPY.more.summary).closest("details") as HTMLElement;
/** One row of the all-offers table, like "Total paid$10,951.88$12,000.00". */
const row = (label: string) => (within(within(more()).getByRole("table")).getByRole("rowheader", { name: label }).closest("tr") as HTMLElement);

function expectWaiting() {
  expect(card()).toHaveTextContent(COPY.waiting);
  expect(card()).not.toHaveTextContent(/Offer \d/);
}

/** The resume screen stands in for step 1: its own question, one filled button, and nothing else. */
function expectResumeScreen(container: HTMLElement) {
  expect(screen.getByRole("heading", { level: 1, name: COPY.resume.title })).toBeInTheDocument();
  expect(screen.getByText(COPY.resume.body)).toBeInTheDocument();
  expect(screen.getByText(COPY.title)).toBeInTheDocument();
  expect(container.querySelectorAll(".primary")).toHaveLength(1);
  expect(screen.getByRole("button", { name: COPY.resume.yes })).toHaveClass("primary");
  expect(screen.getByRole("button", { name: COPY.resume.no })).not.toHaveClass("primary");
  expect(screen.queryByText(/Step \d of \d/)).toBeNull();
  expect(screen.queryByRole("progressbar")).toBeNull();
  expect(screen.queryByRole("link", { name: "How this page handles your numbers" })).toBeNull();
  expect(screen.queryByRole("link", { name: "Back to tools" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
  expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  expect(screen.queryAllByRole("radio")).toHaveLength(0);
  expect(screen.queryAllByRole("combobox")).toHaveLength(0);
}

describe("Loan Offer Compare steps", () => {
  it("opens on step 1 with offer 1's question as the h1, the trust line and Back to tools", () => {
    const { container } = render(<Page />);
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.amountRate[0] })).toBeInTheDocument();
    expect(screen.getByText(COPY.title)).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Step 1 of 5 progress" })).toHaveAttribute("value", "1");
    expect(screen.getByRole("progressbar", { name: "Step 1 of 5 progress" })).toHaveAttribute("max", "5");
    expect(screen.getByRole("link", { name: "How this page handles your numbers" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "How this page handles your numbers" })).toHaveAttribute("href", "#/private");
    expect(screen.getByRole("link", { name: "Back to tools" })).toHaveAttribute("href", "#/");
    expect(document.body.textContent).not.toMatch(/There is no Send button/);
    expect(screen.queryByText(/These are example numbers/)).toBeNull();
    expect(screen.getByRole("group", { name: "Offer 1" })).toBeInTheDocument();
    expect(screen.getByLabelText("Offer 1: Amount borrowed")).toHaveValue("");
    expect(screen.getByLabelText("Offer 1: Yearly interest rate")).toHaveValue("");
    // Everything else waits on a later screen.
    expect(screen.queryByRole("group", { name: "Offer 2" })).toBeNull();
    expect(screen.queryByRole("group", { name: "Offer 3" })).toBeNull();
    expect(screen.queryByLabelText("Offer 1: How long", { exact: false })).toBeNull();
    expect(screen.queryByLabelText("Offer 1: Upfront fees", { exact: false })).toBeNull();
    expect(screen.queryByLabelText(COPY.facts.lowestCost)).toBeNull();
    expect(screen.queryByRole("button", { name: "Add a third offer" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Change my numbers" })).toBeNull();
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Continue" })).toHaveClass("primary");
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("puts the cursor nowhere on load", () => {
    render(<Page />);
    expect(document.body).toHaveFocus();
  });

  it("has two steps per offer, with the right question and the cursor in the first box of each", async () => {
    render(<Page />);
    await amountRate(1, { amount: "10000", rate: "5" });
    expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.lengthFees[0] })).toBeInTheDocument();
    expect(screen.getByLabelText("Offer 1: How long", { exact: false })).toHaveFocus();
    expect(screen.queryByRole("link", { name: "How this page handles your numbers" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Back to tools" })).toBeNull();
    await lengthFees(1, { term: "12" }, false);
    expect(screen.getByText("Step 3 of 5")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.amountRate[1] })).toBeInTheDocument();
    expect(screen.getByLabelText("Offer 2: Amount borrowed")).toHaveFocus();
    await amountRate(2, { amount: "10000", rate: "5" });
    expect(screen.getByText("Step 4 of 5")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.lengthFees[1] })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Offer 2" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Offer 1" })).toBeNull();
  });

  it("has decimal keypads and no autofill on every box", async () => {
    render(<Page />);
    for (const n of [1, 2]) {
      for (const name of ["Amount borrowed", "Yearly interest rate"]) {
        const box = screen.getByLabelText(`Offer ${n}: ${name}`, { exact: false });
        expect(box).toHaveAttribute("inputmode", "decimal");
        expect(box).toHaveAttribute("autocomplete", "off");
      }
      await amountRate(n, { amount: "5000", rate: "4" });
      const fees = screen.getByLabelText(`Offer ${n}: Upfront fees`, { exact: false });
      expect(fees).toHaveAttribute("inputmode", "decimal");
      expect(fees).toHaveAttribute("autocomplete", "off");
      expect(screen.getByLabelText(`Offer ${n}: How long`, { exact: false })).toHaveAttribute("inputmode", "numeric");
      expect(screen.getByLabelText(`Offer ${n}: How long`, { exact: false })).toHaveAttribute("autocomplete", "off");
      if (n === 1) await lengthFees(1, { term: "12" }, false);
    }
  });

  it("keeps the Months and Years chips on each offer's length step, with Months picked", async () => {
    render(<Page />);
    for (const n of [1, 2]) {
      await amountRate(n, { amount: "5000", rate: "4" });
      expect(screen.getByRole("radio", { name: "Months" })).toBeChecked();
      expect(screen.getByRole("radio", { name: "Years" })).not.toBeChecked();
      expect(screen.getByRole("group", { name: `Offer ${n}: Months or years?` })).toBeInTheDocument();
      if (n === 1) await lengthFees(1, { term: "12" }, false);
    }
    await userEvent.click(screen.getByRole("radio", { name: "Years" }));
    expect(screen.getByRole("radio", { name: "Years" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Months" })).not.toBeChecked();
  });

  it("Continue with the amount and rate empty stays on step 1 and says what is missing", async () => {
    render(<Page />);
    expect(screen.queryByText(COPY.steps.amountRateMissing)).toBeNull();
    await cont();
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(COPY.steps.amountRateMissing);
    expect(screen.getByLabelText("Offer 1: Amount borrowed")).toHaveFocus();
    expect(screen.queryByLabelText("Offer 1: How long", { exact: false })).toBeNull();
  });

  it("Continue with only the amount typed stays on step 1 and the cursor goes to the empty rate", async () => {
    render(<Page />);
    await fill("Offer 1: Amount borrowed", "5000");
    await cont();
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(COPY.steps.amountRateMissing);
    await fill("Offer 1: Yearly interest rate", "4");
    await cont();
    expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();
  });

  it("Continue without a length stays on the length step, says fees can stay empty, and lets Continue pass with fees empty", async () => {
    render(<Page />);
    await amountRate(1, { amount: "5000", rate: "4" });
    await cont();
    expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(COPY.steps.lengthFeesMissing);
    expect(screen.getByLabelText("Offer 1: How long", { exact: false })).toHaveFocus();
    await fill("Offer 1: How long", "24");
    expect(screen.getByLabelText("Offer 1: Upfront fees", { exact: false })).toHaveValue("");
    await cont();
    expect(screen.getByText("Step 3 of 5")).toBeInTheDocument();
  });

  it("Continue with junk stays on the step and shows a calm error that names the offer and field, never NaN", async () => {
    render(<Page />);
    await walkOffer(1, { amount: "1000", rate: "5", term: "12" }, false);
    await fill("Offer 2: Amount borrowed", "lots");
    await fill("Offer 2: Yearly interest rate", "5");
    expect(screen.getByText(/Offer 2: Amount borrowed: use a number above zero/)).toBeInTheDocument();
    expect(screen.getByLabelText("Offer 2: Amount borrowed")).toHaveAttribute("aria-invalid", "true");
    await cont();
    expect(screen.getByText("Step 3 of 5")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(COPY.steps.amountRateMissing);
    expect(screen.getByLabelText("Offer 2: Amount borrowed")).toHaveFocus();
    expect(screen.queryByLabelText(COPY.facts.lowestCost)).toBeNull();
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
    await fill("Offer 2: Amount borrowed", "1000");
    expect(screen.getByLabelText("Offer 2: Amount borrowed")).not.toHaveAttribute("aria-invalid");
    await cont();
    expect(screen.getByText("Step 4 of 5")).toBeInTheDocument();
  });

  it("Continue with a bad rate puts the cursor in the rate box, not the amount box before it", async () => {
    render(<Page />);
    await fill("Offer 1: Amount borrowed", "5000");
    await fill("Offer 1: Yearly interest rate", "lots");
    await cont();
    expect(screen.getByLabelText("Offer 1: Yearly interest rate")).toHaveFocus();
  });

  it("Back returns to the step before with the typed numbers kept", async () => {
    render(<Page />);
    await amountRate(1, { amount: "5000", rate: "4" });
    await back();
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.amountRate[0] })).toBeInTheDocument();
    expect(screen.getByLabelText("Offer 1: Amount borrowed")).toHaveValue("5000");
    expect(screen.getByLabelText("Offer 1: Yearly interest rate")).toHaveValue("4");
    expect(screen.getByRole("link", { name: "Back to tools" })).toBeInTheDocument();
  });

  it("the last button, See which costs less, is the filled button on the last step and shows the answer screen", async () => {
    const { container } = render(<Page />);
    await walkOffer(1, TEN_YEARS, false);
    await amountRate(2, TWENTY_YEARS);
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
    expect(screen.getByRole("button", { name: COPY.see })).toHaveClass("primary");
    expect(screen.getByRole("button", { name: COPY.see }).closest("details")).toBeNull();
    await lengthFees(2, TWENTY_YEARS, true);
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(screen.getByText(COPY.title)).toBeInTheDocument();
    expect(screen.getByText("Step 5 of 5: your answer")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Step 5 of 5 progress" })).toHaveAttribute("value", "5");
    expect(screen.getByRole("progressbar", { name: "Step 5 of 5 progress" })).toHaveAttribute("max", "5");
    expect(screen.getByText("That is your estimate. You can stop here.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Offer 2: How long", { exact: false })).toBeNull();
    expect(screen.queryByRole("button", { name: COPY.see })).toBeNull();
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    expect(card()).toHaveAttribute("id", "nt-answer");
    expect(card()).toHaveAttribute("tabindex", "-1");
  });

  it("Change my numbers goes back to step 1 with every offer kept", async () => {
    render(<Page />);
    await walkOffers({ amount: "5000", rate: "4", term: "24", fees: "50" }, { amount: "6000", rate: "5", term: "2", unit: "Years" });
    await changeMine();
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.amountRate[0] })).toBeInTheDocument();
    expect(screen.getByLabelText("Offer 1: Amount borrowed")).toHaveValue("5000");
    await toStep(1);
    expect(screen.getByLabelText("Offer 1: Upfront fees", { exact: false })).toHaveValue("50");
    await toStep(1);
    expect(screen.getByLabelText("Offer 2: Amount borrowed")).toHaveValue("6000");
    await toStep(1);
    expect(screen.getByLabelText("Offer 2: How long", { exact: false })).toHaveValue("2");
    expect(screen.getByRole("radio", { name: "Years" })).toBeChecked();
  });

  it("hands the one filled button back from Done to Continue when the person changes their numbers", async () => {
    const { container } = render(<Page />);
    await walkOffers(TEN_YEARS, TWENTY_YEARS);
    expect(screen.getByRole("link", { name: "I'm done" })).toHaveClass("primary");
    expect(screen.getByRole("link", { name: "I'm done" })).toHaveAttribute("href", "#/");
    expect(screen.getByRole("button", { name: "Print or save" })).not.toHaveClass("primary");
    await changeMine();
    await fill("Offer 1: Yearly interest rate", "");
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Continue" })).toHaveClass("primary");
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    expect(screen.queryByRole("link", { name: "I'm done" })).toBeNull();
    await cont();
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
  });
});

describe("Loan Offer Compare answers", () => {
  it("once there is an answer, Done is the one main link, Print or save is an outline, and the step buttons are gone", async () => {
    render(<Page />);
    await walkOffers(TEN_YEARS, TWENTY_YEARS);
    expect(document.querySelectorAll(".primary")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "I'm done" })).toHaveClass("primary");
    expect(screen.getByRole("link", { name: "I'm done" })).toHaveAttribute("href", "#/");
    expect(screen.getByRole("button", { name: "Print or save" })).not.toHaveClass("primary");
    expect(screen.getByRole("button", { name: "Print or save" }).closest("details")).toBeNull();
    expect(screen.queryByRole("button", { name: COPY.see })).toBeNull();
    expect(screen.queryByRole("button", { name: "Go up to my answer" })).toBeNull();
  });

  it("shows the exact numbers for each offer and names the lowest as facts", async () => {
    render(<Page />);
    await walkOffers({ amount: "$10,000", rate: "6", term: "36" }, { amount: "10000", rate: "5", term: "48", fees: "$200" });
    expect(card()).toHaveTextContent("Offer 1");
    expect(card()).toHaveTextContent("Offer 1 costs $302.23 less in interest and fees. Offer 2 costs $73.93 less each month.");
    expect(card()).toHaveTextContent("Offer 1, interest and fees$951.88");
    expect(card()).toHaveTextContent("Offer 2, interest and fees$1,254.11");
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
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("shows each offer's monthly payment under its interest and fees number in the card", async () => {
    render(<Page />);
    await walkOffers({ amount: "$10,000", rate: "6", term: "36" }, { amount: "10000", rate: "5", term: "48", fees: "$200" });
    const lines = Array.from(card().querySelectorAll("dl > div"));
    expect(lines).toHaveLength(2);
    const [one, two] = lines.map((el) => ({
      label: el.querySelector("dt")?.textContent,
      cost: el.querySelector("dd")?.firstChild?.textContent?.trim(),
      month: el.querySelector("dd .nt-offers-month")?.textContent,
    }));
    expect(one).toEqual({ label: "Offer 1, interest and fees", cost: "$951.88", month: "$304.22 a month" });
    expect(two).toEqual({ label: "Offer 2, interest and fees", cost: "$1,254.11", month: "$230.29 a month" });
    // The same payments stay in the table.
    expect(row(COPY.result.paymentLabel)).toHaveTextContent("$304.22$230.29");
  });

  it("shows the monthly payment for a third offer too", async () => {
    render(<Page />);
    await walkOffers(TEN_YEARS, TWENTY_YEARS);
    await addThird();
    await walkOffer(3, { amount: "12000", rate: "0", term: "24" }, true);
    const months = Array.from(card().querySelectorAll("dl .nt-offers-month")).map((el) => el.textContent);
    expect(months).toEqual(["$1,000.00 a month", "$500.00 a month", "$500.00 a month"]);
  });

  it("reads the length in years as months", async () => {
    render(<Page />);
    await walkOffers({ amount: "10000", rate: "0", term: "2", unit: "Years" }, { amount: "10000", rate: "0", term: "24" });
    expect(row(COPY.result.lengthLabel)).toHaveTextContent("24 months24 months");
    expect(screen.queryByText(COPY.facts.differ)).toBeNull();
  });

  it("lists every offer when they tie", async () => {
    render(<Page />);
    await walkOffers({ amount: "5000", rate: "4", term: "24", fees: "50" }, { amount: "5,000", rate: "4.00", term: "24", fees: "50" });
    expect(card()).toHaveTextContent("Offer 1 and Offer 2");
    expect(card()).toHaveTextContent(COPY.facts.tieCost);
    expect(card()).not.toHaveTextContent(COPY.facts.tiePayment);
    expect(more()).toHaveTextContent(COPY.facts.tiePayment);
    expect(screen.queryByText(COPY.facts.differ)).toBeNull();
  });

  it("shows the table under the table summary", async () => {
    render(<Page />);
    await walkOffers(TEN_YEARS, TWENTY_YEARS);
    await userEvent.click(screen.getByText(COPY.more.summary));
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader")).toHaveLength(3);
    expect(within(table).getAllByRole("row")[1]).toHaveTextContent("$1,000.00$500.00");
    expect(card()).toHaveTextContent("Offer 1, interest and fees$0.00");
  });

  it("shows the waiting words, not an answer, when saved offers are not finished", async () => {
    seed(4, [{ amount: "5000" }, {}]);
    const { container } = render(<Page />);
    expectResumeScreen(container);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expectWaiting();
    expect(card().querySelector(".nt-result-label")).toBeNull();
    expect(card().querySelector(".nt-result-tag")).toBeNull();
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    expect(screen.queryByRole("link", { name: "I'm done" })).toBeNull();
    expect(screen.queryByText(COPY.fixFirst)).toBeNull();
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("shows the red-note line, not an answer, when saved offers have a bad box", async () => {
    seed(4, [{ amount: "1000", rate: "5", term: "12" }, { amount: "lots", rate: "5", term: "12" }]);
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.getByText(COPY.fixFirst)).toBeInTheDocument();
    expectWaiting();
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("says it is an estimate, says the lender shows the yearly cost, and explains the words", async () => {
    render(<Page />);
    await walkOffers(TEN_YEARS, TWENTY_YEARS);
    expect(screen.getByText(COPY.notes.estimate)).toBeInTheDocument();
    expect(screen.getAllByText(/The yearly cost of the loan, with some fees/)).toHaveLength(1);
    const words = within(screen.getByText(COPY.key.summary).closest("details") as HTMLElement);
    for (const k of COPY.key.items) expect(words.getByText(k.term, { selector: "dt" })).toBeInTheDocument();
  });

  it("offers Print or save once there is an answer, and opens Print and Save a copy", async () => {
    render(<Page />);
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    await walkOffers(TEN_YEARS, TWENTY_YEARS);
    expect(row(COPY.result.paymentLabel)).toHaveTextContent("$1,000.00");
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

  it("shows the estimate sentence once, no APR, and a short save preview", async () => {
    render(<Page />);
    await walkOffers({ amount: "$10,000", rate: "6", term: "36" }, { amount: "10000", rate: "5", term: "48", fees: "$200" });
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

describe("Loan Offer Compare third offer", () => {
  it("Add a third offer on the answer screen opens step 5, offer 3's first step", async () => {
    render(<Page />);
    await walkOffers(TEN_YEARS, TWENTY_YEARS);
    await addThird();
    expect(screen.getByText("Step 5 of 7")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.amountRate[2] })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Offer 3" })).toBeInTheDocument();
    expect(screen.getByLabelText("Offer 3: Amount borrowed")).toHaveFocus();
    expect(screen.getByLabelText("Offer 3: Amount borrowed")).toHaveValue("");
    expect(screen.queryByLabelText(COPY.facts.lowestCost)).toBeNull();
    await cont();
    expect(screen.getByText("Step 5 of 7")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(COPY.steps.amountRateMissing);
  });

  it("adds a third offer and compares all three", async () => {
    render(<Page />);
    await walkOffers({ amount: "20000", rate: "7.25", term: "60", fees: "500" }, { amount: "20000", rate: "6.5", term: "60", fees: "900" });
    await addThird();
    await walkOffer(3, { amount: "20000", rate: "8", term: "4", unit: "Years" }, true);
    expect(card()).toHaveTextContent("Offer 3");
    expect(card()).toHaveTextContent("Offer 3, interest and fees$3,436.41");
    expect(row("Cost of borrowing")).toHaveTextContent("$4,403.20$4,379.43$3,436.41");
    expect(row(COPY.result.paymentLabel)).toHaveTextContent("$488.26");
    expect(row(COPY.result.lengthLabel)).toHaveTextContent("60 months60 months48 months");
    expect(more()).toHaveTextContent("Lowest monthly payment: Offer 2");
    expect(screen.queryByRole("button", { name: "Add a third offer" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Remove the third offer" }));
    expect(screen.queryByText("Offer 3, interest and fees")).toBeNull();
    await changeMine();
    await toStep(3);
    expect(screen.queryByRole("group", { name: "Offer 3" })).toBeNull();
    expect(screen.getByText("Step 4 of 5")).toBeInTheDocument();
  });

  it("lets the person remove the third offer, then put it back", async () => {
    render(<Page />);
    await walkOffers(TEN_YEARS, TWENTY_YEARS);
    await addThird();
    await walkOffer(3, { amount: "7777", rate: "3", term: "30" }, true);
    expect(card()).toHaveTextContent("Offer 3, interest and fees");
    await userEvent.click(screen.getByRole("button", { name: "Remove the third offer" }));
    expect(card()).not.toHaveTextContent("Offer 3");
    expect(screen.getByRole("status")).toHaveTextContent(COPY.removedDone);
    await userEvent.click(screen.getByRole("button", { name: "Put it back" }));
    expect(card()).toHaveTextContent("Offer 3, interest and fees");
    expect(screen.queryByRole("button", { name: "Put it back" })).toBeNull();
    await changeMine();
    await toStep(4);
    expect(screen.getByText("Step 5 of 7")).toBeInTheDocument();
    expect(screen.getByLabelText("Offer 3: Amount borrowed")).toHaveValue("7777");
  });
});

describe("Loan Offer Compare saved numbers", () => {
  it("saves the new offer and step 5 as soon as Add a third offer is tapped", async () => {
    render(<Page />);
    await walkOffers(TEN_YEARS, TWENTY_YEARS);
    await addThird();
    const saved = JSON.parse(window.localStorage.getItem("nt:flow:loan-offer-compare") as string);
    expect(saved.step).toBe(4);
    expect(saved.value.offers).toHaveLength(3);
    expect(saved.value.offers[2]).toEqual({ amount: "", rate: "", term: "", termUnit: "months", fees: "" });
  });

  it("Use them after Add a third offer brings back step 5 with offer 3's box", async () => {
    const first = render(<Page />);
    await walkOffers(TEN_YEARS, TWENTY_YEARS);
    await addThird();
    first.unmount();
    const { container } = render(<Page />);
    expectResumeScreen(container);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.getByText("Step 5 of 7")).toBeInTheDocument();
    expect(screen.getByLabelText("Offer 3: Amount borrowed")).toHaveValue("");
  });

  it("shows the resume screen instead of step 1 and brings the numbers back", async () => {
    const first = render(<Page />);
    await fill("Offer 1: Amount borrowed", "1200");
    first.unmount();
    const { container } = render(<Page />);
    expectResumeScreen(container);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
    expect(screen.getByLabelText("Offer 1: Amount borrowed")).toHaveValue("1200");
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
  });

  it("shows step 1, not the resume screen, when nothing is saved", () => {
    render(<Page />);
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
  });

  it("Use them brings back the step the person was on", async () => {
    const first = render(<Page />);
    await amountRate(1, { amount: "5000", rate: "4" });
    await fill("Offer 1: How long", "36");
    first.unmount();
    const { container } = render(<Page />);
    expectResumeScreen(container);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();
    expect(screen.getByLabelText("Offer 1: How long", { exact: false })).toHaveValue("36");
  });

  it("Use them brings back the answer screen when that is where the person was", async () => {
    const first = render(<Page />);
    await walkOffers(TEN_YEARS, TWENTY_YEARS);
    first.unmount();
    const { container } = render(<Page />);
    expectResumeScreen(container);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.queryByRole("heading", { level: 1, name: COPY.resume.title })).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(card()).toHaveTextContent("Offer 1, interest and fees$0.00");
  });

  it("drops the saved copy and shows step 1 with blank boxes when the person says no thanks", async () => {
    const first = render(<Page />);
    await fill("Offer 1: Amount borrowed", "1200");
    first.unmount();
    const { container } = render(<Page />);
    expectResumeScreen(container);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.no }));
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
    expect(window.localStorage.getItem("nt:flow:loan-offer-compare")).toBeNull();
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.amountRate[0] })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "How this page handles your numbers" })).toBeInTheDocument();
    expect(screen.getByLabelText("Offer 1: Amount borrowed")).toHaveValue("");
  });

  it("does not bring the resume screen back after Use them, Back or Change my numbers", async () => {
    const first = render(<Page />);
    await walkOffers(TEN_YEARS, TWENTY_YEARS);
    first.unmount();
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    await changeMine();
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
    await cont();
    await back();
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
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
  it("is only on the answer screen, with its undo note, and asks first", async () => {
    render(<Page />);
    await fill("Offer 1: Amount borrowed", "9000");
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
    expect(screen.queryByText("You can put your numbers back.")).toBeNull();
    await fill("Offer 1: Amount borrowed", "");
    await walkOffers(TEN_YEARS, TWENTY_YEARS);
    expect(window.localStorage.getItem("nt:flow:loan-offer-compare")).not.toBeNull();
    await userEvent.click(screen.getByText("More options"));
    expect(screen.getByText("You can put your numbers back.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.getByRole("status")).toHaveTextContent("This clears every box. You can put your numbers back right after.");
    await userEvent.click(screen.getByRole("button", { name: "Keep my numbers" }));
    expect(card()).toHaveTextContent("Offer 1, interest and fees$0.00");
    expect(window.localStorage.getItem("nt:flow:loan-offer-compare")).not.toBeNull();
  });

  it("Clear the boxes stays on the answer screen with the waiting words, and Put it back restores the numbers and the answer", async () => {
    render(<Page />);
    await walkOffers({ amount: "1234", rate: "4", term: "12" }, TWENTY_YEARS);
    const answer = card().textContent;
    await userEvent.click(screen.getByText("More options"));
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    expect(window.localStorage.getItem("nt:flow:loan-offer-compare")).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(screen.getByText("Step 5 of 5: your answer")).toBeInTheDocument();
    expectWaiting();
    expect(card().querySelector(".nt-result-label")).toBeNull();
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    expect(screen.queryByRole("link", { name: "I'm done" })).toBeNull();
    expect(screen.getByText(/Your numbers are cleared\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Put it back" }));
    expect(card().textContent).toBe(answer);
    expect(screen.getByRole("button", { name: "Print or save" })).toBeInTheDocument();
    expect(window.localStorage.getItem("nt:flow:loan-offer-compare")).not.toBeNull();
    expect(screen.queryByText(/Your numbers are cleared\./)).toBeNull();
  });

  it("Change my numbers after Clear the boxes goes to step 1 with every box empty", async () => {
    render(<Page />);
    await walkOffers({ amount: "1234", rate: "4", term: "12" }, TWENTY_YEARS);
    await userEvent.click(screen.getByText("More options"));
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    await changeMine();
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.amountRate[0] })).toBeInTheDocument();
    expect(screen.getByLabelText("Offer 1: Amount borrowed")).toHaveValue("");
    expect(screen.getByLabelText("Offer 1: Yearly interest rate")).toHaveValue("");
    await cont();
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(COPY.steps.amountRateMissing);
  });
});

describe("Loan Offer Compare review fixes (PR #6, round 1)", () => {
  it("Continue with only the amount typed puts the cursor in the empty rate box, not the filled amount", async () => {
    render(<Page />);
    await fill("Offer 1: Amount borrowed", "5000");
    await cont();
    expect(screen.getByLabelText("Offer 1: Yearly interest rate")).toHaveFocus();
  });

  it("a third offer added by mistake can be removed from its own steps, back to the two-offer answer", async () => {
    render(<Page />);
    await walkOffers(TEN_YEARS, TWENTY_YEARS);
    await addThird();
    expect(screen.getByText("Step 5 of 7")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.removeThird }));
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(screen.getByText("Step 5 of 5: your answer")).toBeInTheDocument();
    expect(screen.queryByText(/Offer 3/)).toBeNull();
  });
});
