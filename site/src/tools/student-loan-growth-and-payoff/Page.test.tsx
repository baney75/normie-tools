import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { gradeOf } from "../../../../scripts/check-reading-level.mjs";
import { buildMatchers, loadTerms } from "../../../../scripts/check-banned-jargon.mjs";
import { writeSaved } from "../../lib/useAutosave";
import { Page } from "./Page";
import { COPY } from "./copy";

beforeEach(() => {
  window.localStorage.clear();
  // jsdom has no scrolling. The step flow scrolls to the top after each move.
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

const SAVED_KEY = "nt:flow:student-loan-growth-and-payoff";
const EMPTY = { balance: "", rate: "", waitMonths: "", capitalize: false, payment: "", start: "", years: "" };

async function fill(label: string, text: string) {
  const box = screen.getByLabelText(label, { exact: false });
  await userEvent.clear(box);
  if (text) await userEvent.type(box, text);
}

/** The one filled button: Continue, or the tool's own words on the last step. */
const cont = () => userEvent.click(screen.getByRole("button", { name: new RegExp(`^(Continue|${COPY.see})$`) }));
const back = () => userEvent.click(screen.getByRole("button", { name: "Back" }));
const change = () => userEvent.click(screen.getByRole("button", { name: "Change my numbers" }));
const stepText = (n: number) => screen.getByText(`Step ${n} of 4`);
const saved = () => JSON.parse(window.localStorage.getItem(SAVED_KEY) ?? "null");

/** The school months and other details wait inside the closed "More options" next to Start over. */
const moreDetails = () => screen.getByText("More options", { selector: "summary" }).closest("details") as HTMLDetailsElement;
async function showMore() {
  await userEvent.click(screen.getByText("More options", { selector: "summary" }));
}

/** Types steps 1 and 2 and stops on step 3, the monthly payment. */
async function toPayment(balance = "$20,000", rate = "5") {
  await fill("Loan balance", balance);
  await cont();
  await fill("Yearly interest rate", rate);
  await cont();
}

/** Walks all three steps the way a person does and lands on the answer screen. The payment is optional. */
async function walk(balance = "$20,000", rate = "5", payment = "") {
  await toPayment(balance, rate);
  if (payment) await fill("Monthly payment", payment);
  await cont();
}

async function fillGolden() {
  await walk("$20,000", "5", "300");
  await showMore();
  await fill("Months with no payments", "6");
  await fill("First payment month", "2026-09");
  await fill("Years you want", "10");
}

/** Brings back a saved copy at a given step, to see screens a person cannot reach by typing. */
async function resumeAt(step: number, value: Partial<typeof EMPTY>) {
  writeSaved("student-loan-growth-and-payoff", step, { ...EMPTY, ...value });
  render(<Page />);
  await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
}

const paidOff = () => screen.getByLabelText(COPY.result.paidOffLabel);
const balanceCard = () => screen.getByLabelText(COPY.result.balanceLabel);
const more = () => screen.getByText(COPY.more.summary).closest("details") as HTMLElement;

describe("Student Loan Growth and Payoff step 1", () => {
  it("opens on step 1 with the question as the h1, the trust line and Back to tools", () => {
    const { container } = render(<Page />);
    expect(stepText(1)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "1");
    expect(screen.getByRole("progressbar")).toHaveAttribute("max", "4");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.balance })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: COPY.question })).toBeNull();
    expect(screen.getByText(COPY.title)).toBeInTheDocument();
    expect(screen.getByText(/Your numbers stay on this phone or computer\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "How we know" })).toHaveAttribute("href", "#/private");
    expect(screen.getByRole("link", { name: "Back to tools" })).toHaveAttribute("href", "#/");
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    expect(screen.getByLabelText("Loan balance", { exact: false })).toHaveValue("");
    expect(screen.getByLabelText("Loan balance", { exact: false })).not.toHaveFocus();
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Continue" })).toHaveClass("primary");
    expect(screen.getByRole("button", { name: "Continue" })).toHaveAttribute("type", "submit");
    expect(screen.queryByText(/These are example numbers/)).toBeNull();
    expect(document.body.textContent).not.toMatch(/There is no Send button/);
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("shows only the one question: no answer card, no other boxes, no details, no Start over", () => {
    render(<Page />);
    expect(screen.queryByLabelText(COPY.result.balanceLabel)).toBeNull();
    expect(screen.queryByLabelText(COPY.result.paidOffLabel)).toBeNull();
    expect(document.getElementById("nt-answer")).toBeNull();
    expect(screen.queryByLabelText("Yearly interest rate")).toBeNull();
    expect(screen.queryByLabelText("Monthly payment", { exact: false })).toBeNull();
    expect(screen.queryByText("More options")).toBeNull();
    expect(screen.queryByLabelText(/Months with no payments/)).toBeNull();
    expect(screen.queryByLabelText(/Years you want/)).toBeNull();
    expect(screen.queryByRole("button", { name: COPY.see })).toBeNull();
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Change my numbers" })).toBeNull();
    expect(screen.queryByText(COPY.notes.estimate)).toBeNull();
    expect(document.body.textContent).not.toMatch(/Show my answer|That is your answer|Done\. Back to home|Change a number|Type my own numbers/);
  });

  it("has a labeled box with a decimal keypad and no autofill", () => {
    render(<Page />);
    const box = screen.getByLabelText("Loan balance", { exact: false });
    expect(box).toHaveAttribute("inputmode", "decimal");
    expect(box).toHaveAttribute("autocomplete", "off");
  });

  it("Continue with an empty box stays on step 1, says what is missing and focuses the box", async () => {
    render(<Page />);
    await cont();
    expect(stepText(1)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.balance })).toBeInTheDocument();
    expect(screen.getByText(COPY.steps.balanceMissing)).toBeInTheDocument();
    expect(screen.getByLabelText("Loan balance", { exact: false })).toHaveFocus();
  });

  it("Continue with a bad balance stays put, names the field and never shows NaN", async () => {
    render(<Page />);
    await fill("Loan balance", "lots");
    await cont();
    expect(stepText(1)).toBeInTheDocument();
    expect(screen.getByText(COPY.steps.balanceMissing)).toBeInTheDocument();
    expect(screen.getByText(/Loan balance: use a number above zero/)).toBeInTheDocument();
    expect(screen.getByLabelText("Loan balance")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Loan balance")).toHaveFocus();
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("Continue when ready moves to step 2 and puts the cursor in its box", async () => {
    render(<Page />);
    await fill("Loan balance", "5000");
    await cont();
    expect(stepText(2)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "2");
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.rate })).toBeInTheDocument();
    expect(screen.getByLabelText("Yearly interest rate")).toHaveFocus();
  });

  it("Enter in the box moves on, the same as Continue", async () => {
    render(<Page />);
    await userEvent.type(screen.getByLabelText("Loan balance"), "5000{Enter}");
    expect(stepText(2)).toBeInTheDocument();
  });
});

describe("Student Loan Growth and Payoff steps 2 and 3", () => {
  it("step 2 asks for the rate, has Back, and drops the trust line", async () => {
    render(<Page />);
    await fill("Loan balance", "5000");
    await cont();
    expect(screen.queryByText(/Your numbers stay on this phone or computer\./)).toBeNull();
    expect(screen.queryByRole("link", { name: "Back to tools" })).toBeNull();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    const box = screen.getByLabelText("Yearly interest rate");
    expect(box).toHaveValue("");
    expect(box).toHaveAttribute("inputmode", "decimal");
    expect(box).toHaveAttribute("autocomplete", "off");
    expect(screen.queryByLabelText("Loan balance")).toBeNull();
  });

  it("step 2 Continue with an empty rate stays and says what is missing", async () => {
    render(<Page />);
    await fill("Loan balance", "5000");
    await cont();
    await cont();
    expect(stepText(2)).toBeInTheDocument();
    expect(screen.getByText(COPY.steps.rateMissing)).toBeInTheDocument();
    expect(screen.getByLabelText("Yearly interest rate")).toHaveFocus();
  });

  it("Back returns to step 1 with the balance still there", async () => {
    render(<Page />);
    await fill("Loan balance", "5000");
    await cont();
    await back();
    expect(stepText(1)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.balance })).toBeInTheDocument();
    expect(screen.getByLabelText("Loan balance")).toHaveValue("5000");
    expect(screen.getByLabelText("Loan balance")).toHaveFocus();
  });

  it("step 3 asks for the payment, which is optional, and the last button is See my answer", async () => {
    const { container } = render(<Page />);
    await toPayment("5000", "4");
    expect(stepText(3)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "3");
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.payment })).toBeInTheDocument();
    const box = screen.getByLabelText("Monthly payment", { exact: false });
    expect(box).toHaveValue("");
    expect(box).toHaveAttribute("inputmode", "decimal");
    expect(box).toHaveAttribute("autocomplete", "off");
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    expect(screen.getByRole("button", { name: COPY.see })).toHaveClass("primary");
    expect(screen.getByRole("button", { name: COPY.see }).closest("details")).toBeNull();
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
  });

  it("See my answer with the payment left empty is allowed and shows the balance answer", async () => {
    render(<Page />);
    await toPayment("5000", "4");
    await cont();
    expect(screen.getByText("Step 4 of 4: your answer")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(balanceCard()).toHaveTextContent("$5,000.00");
    expect(screen.queryByLabelText(COPY.result.paidOffLabel)).toBeNull();
  });

  it("a payment that is too small holds the person on step 3 with a calm note", async () => {
    render(<Page />);
    await toPayment("10000", "6");
    await fill("Monthly payment", "50");
    await cont();
    expect(stepText(3)).toBeInTheDocument();
    expect(screen.getByText(/too small to pay off the loan in 100 years/)).toBeInTheDocument();
    expect(screen.getByText(COPY.steps.paymentMissing)).toBeInTheDocument();
    expect(screen.getByLabelText("Monthly payment", { exact: false })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Monthly payment", { exact: false })).toHaveFocus();
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("goes back from step 3 to step 2 with the rate still there", async () => {
    render(<Page />);
    await toPayment("5000", "4.5");
    await back();
    expect(stepText(2)).toBeInTheDocument();
    expect(screen.getByLabelText("Yearly interest rate")).toHaveValue("4.5");
  });

  it("tells the person what is missing on the first two steps, in order", async () => {
    render(<Page />);
    await cont();
    expect(screen.getByText(COPY.steps.balanceMissing)).toBeInTheDocument();
    await fill("Loan balance", "5000");
    await cont();
    await cont();
    expect(screen.getByText(COPY.steps.rateMissing)).toBeInTheDocument();
    expect(stepText(2)).toBeInTheDocument();
  });
});

describe("Student Loan Growth and Payoff answer screen", () => {
  it("shows the tool question as the h1 and the answer as the last step, with a full progress bar", async () => {
    render(<Page />);
    await walk("5000", "4");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(screen.getByText(COPY.title)).toBeInTheDocument();
    expect(screen.getByText("Step 4 of 4: your answer")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "4");
    expect(screen.getByRole("progressbar")).toHaveAttribute("max", "4");
    expect(screen.queryByLabelText("Loan balance")).toBeNull();
    expect(balanceCard()).toHaveAttribute("id", "nt-answer");
    expect(balanceCard()).toHaveAttribute("tabindex", "-1");
    expect(balanceCard().querySelector(".nt-result-tag")).toBeNull();
  });

  it("has Done as the one main link, Print or save as an outline, a quiet Change my numbers and no See my answer", async () => {
    render(<Page />);
    await walk("5000", "4");
    expect(document.querySelectorAll(".primary")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "I'm done" })).toHaveClass("primary");
    expect(screen.getByRole("link", { name: "I'm done" })).toHaveAttribute("href", "#/");
    expect(screen.getByRole("button", { name: "Print or save" })).not.toHaveClass("primary");
    expect(screen.getByRole("button", { name: "Print or save" }).closest("details")).toBeNull();
    expect(screen.getByRole("button", { name: "Change my numbers" })).not.toHaveClass("primary");
    expect(screen.queryByRole("button", { name: COPY.see })).toBeNull();
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Go up to my answer" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Back to tools" })).toBeNull();
  });

  it("Change my numbers goes back to step 1 with every number kept", async () => {
    render(<Page />);
    await walk("$20,000", "5", "300");
    await change();
    expect(stepText(1)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.balance })).toBeInTheDocument();
    expect(screen.getByLabelText("Loan balance")).toHaveValue("$20,000");
    expect(screen.getByLabelText("Loan balance")).toHaveFocus();
    await cont();
    expect(screen.getByLabelText("Yearly interest rate")).toHaveValue("5");
    await cont();
    expect(screen.getByLabelText("Monthly payment", { exact: false })).toHaveValue("300");
  });

  it("an answer screen with nothing typed shows only the waiting words, no money and no buttons for a result", async () => {
    await resumeAt(3, {});
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(balanceCard()).toHaveTextContent(COPY.waiting);
    expect(balanceCard()).not.toHaveTextContent("$");
    expect(balanceCard().querySelector(".nt-result-label")).toBeNull();
    expect(balanceCard().querySelector(".nt-result-tag")).toBeNull();
    expect(balanceCard()).toHaveAttribute("id", "nt-answer");
    expect(balanceCard()).toHaveAttribute("tabindex", "-1");
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    expect(screen.queryByRole("link", { name: "I'm done" })).toBeNull();
    expect(document.querySelectorAll(".primary")).toHaveLength(0);
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("keeps every closed section labeled", async () => {
    const { container } = render(<Page />);
    await fillGolden();
    const sums = Array.from(container.querySelectorAll("summary"));
    // More options (Start over), year by year, and how this works.
    expect(sums.length).toBeLessThanOrEqual(3);
    expect(sums.map((el) => (el.textContent ?? "").trim())).toEqual(["More options", COPY.more.summary, COPY.how.summary]);
  });

  it("has labels above the optional boxes, a keypad that fits each box, no autofill", async () => {
    render(<Page />);
    await walk("5000", "4");
    await showMore();
    expect(screen.getByLabelText(/Months with no payments/)).toHaveAttribute("inputmode", "numeric");
    expect(screen.getByLabelText(/Months with no payments/)).toHaveAttribute("autocomplete", "off");
    expect(screen.getByLabelText(/First payment month/)).toHaveAttribute("inputmode", "text");
    expect(screen.getByLabelText(/First payment month/)).toHaveAttribute("autocomplete", "off");
    expect(screen.getByLabelText(/Years you want/)).toHaveAttribute("inputmode", "numeric");
  });

  it("keeps the school months and other details inside the closed More options until it is opened", async () => {
    render(<Page />);
    await walk("5000", "4");
    expect(screen.queryByRole("button", { name: /Add school months and other details/ })).toBeNull();
    expect(moreDetails().open).toBe(false);
    for (const label of [/Months with no payments/, /First payment month/, /Add the unpaid interest/, /Years you want/]) {
      expect(moreDetails()).toContainElement(screen.getByLabelText(label));
    }
    expect(moreDetails()).toContainElement(screen.getByRole("button", { name: "Start over" }));
    await showMore();
    expect(moreDetails().open).toBe(true);
    expect(screen.getByLabelText(/Months with no payments/)).toBeInTheDocument();
    expect(screen.getByLabelText(/First payment month/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Add the unpaid interest/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Years you want/)).toBeInTheDocument();
  });

  it("leaves More options open with the red note when an optional box has a bad value", async () => {
    render(<Page />);
    await walk("5000", "4");
    expect(moreDetails().open).toBe(false);
    await showMore();
    await fill("Months with no payments", "abc");
    expect(moreDetails().open).toBe(true);
    expect(screen.getByLabelText(/Months with no payments/)).toHaveAttribute("aria-invalid", "true");
    expect(within(moreDetails()).getByText(/Check this\./)).toBeInTheDocument();
    expect(balanceCard()).toHaveTextContent(COPY.waiting);
  });

  it("opens More options by itself when a saved optional box already has a bad value", async () => {
    await resumeAt(3, { balance: "5000", rate: "4", years: "abc" });
    expect(moreDetails().open).toBe(true);
    expect(screen.getByLabelText(/Years you want/)).toHaveAttribute("aria-invalid", "true");
    expect(within(moreDetails()).getByText(/Check this\./)).toBeInTheDocument();
  });

  it("shows the exact answers as the person types, toggle off", async () => {
    render(<Page />);
    await fillGolden();
    const card = paidOff();
    expect(card).toHaveTextContent("6 years, 9 months");
    expect(card).toHaveTextContent("Paying $300.00 a month. You pay it off in May 2033.");
    expect(card).toHaveTextContent("Total interest$4,171.44");
    // The wait grew the balance, so the card shows that line and leaves the smallest payment to the details.
    expect(card).toHaveTextContent("Balance when payments start$20,499.98");
    expect(card).not.toHaveTextContent("Smallest payment to finish");
    expect(more()).toHaveTextContent("Balance when payments start$20,499.98");
    expect(more()).toHaveTextContent("Interest that grew before your first payment$499.98");
    expect(more()).toHaveTextContent("Months to pay off81");
    expect(more()).toHaveTextContent("Total interest$4,171.44");
    expect(more()).toHaveTextContent("Payoff monthMay 2033");
    expect(more()).toHaveTextContent("Smallest payment to finish in 10 years$217.39");
  });

  it("changes the answer when unpaid interest is added to the balance", async () => {
    render(<Page />);
    await fillGolden();
    await userEvent.click(screen.getByLabelText(/Add the unpaid interest/));
    const card = paidOff();
    expect(card).toHaveTextContent("Total interest$4,176.47");
    expect(card).toHaveTextContent("Paying $300.00 a month.");
    expect(more()).toHaveTextContent("Smallest payment to finish in 10 years$217.44");
  });

  it("keeps the details on the answer screen after Change my numbers and back", async () => {
    render(<Page />);
    await fillGolden();
    await change();
    await cont();
    await cont();
    await cont();
    expect(paidOff()).toHaveTextContent("6 years, 9 months");
    expect(screen.getByLabelText(/Months with no payments/)).toHaveValue("6");
    expect(screen.getByLabelText(/Years you want/)).toHaveValue("10");
  });

  it("with a payment and no wait months, the card says what is paid, then total interest, and hides Balance when payments start", async () => {
    render(<Page />);
    await walk("12000", "0", "250");
    const card = paidOff();
    expect(card).toHaveTextContent("4 years");
    expect(card).toHaveTextContent("Paying $250.00 a month.");
    expect(card).not.toHaveTextContent("You pay it off in");
    expect(card).toHaveTextContent("Total interest$0.00");
    expect(card).not.toHaveTextContent("Balance when payments start");
    expect(card).not.toHaveTextContent("Smallest payment to finish");
    // The card reads in this order: Paying line, then Total interest.
    const text = card.textContent ?? "";
    expect(text.indexOf("Paying $250.00")).toBeLessThan(text.indexOf("Total interest"));
  });

  it("adds the payoff month to the Paying line once a start month is typed", async () => {
    render(<Page />);
    await walk("12000", "0", "250");
    await showMore();
    await fill("First payment month", "2026-09");
    expect(paidOff()).toHaveTextContent("Paying $250.00 a month. You pay it off in August 2030.");
  });

  it("with a target in years and no wait months, the card shows the smallest payment instead of the balance line", async () => {
    render(<Page />);
    await walk("12000", "0", "250");
    await showMore();
    await fill("Years you want", "2");
    const card = paidOff();
    expect(card).toHaveTextContent("Paying $250.00 a month.");
    expect(card).toHaveTextContent("Smallest payment to finish in 2 years$500.00");
    expect(card).not.toHaveTextContent("Balance when payments start");
  });

  it("shows only the balance when no payment is typed", async () => {
    render(<Page />);
    await walk("5000", "4.5");
    await showMore();
    await fill("Months with no payments", "12");
    const card = balanceCard();
    expect(card).toHaveTextContent("$5,225.00");
    expect(screen.queryByLabelText(COPY.result.paidOffLabel)).toBeNull();
    expect(more()).not.toHaveTextContent("Months to pay off");
  });

  it("opens the year-by-year sections", async () => {
    render(<Page />);
    await fillGolden();
    await userEvent.click(screen.getByText(COPY.more.summary));
    const years = document.querySelectorAll(".nt-slg-year");
    expect(years).toHaveLength(7);
    expect(within(years[6] as HTMLElement).getByText(/Year 7/)).toBeInTheDocument();
    expect(years[6]).toHaveTextContent("Still owe$0.00");
  });

  it("says why no interest grew when no months passed", async () => {
    render(<Page />);
    await walk("5000", "5.5");
    const card = balanceCard();
    expect(card).toHaveTextContent("$5,000.00");
    expect(card).toHaveTextContent(COPY.result.noGrowth);
    await showMore();
    await fill("Months with no payments", "6");
    expect(balanceCard()).not.toHaveTextContent(COPY.result.noGrowth);
    expect(balanceCard()).toHaveTextContent(COPY.result.balanceLine);
  });

  it("explains a bad start month on the answer screen", async () => {
    render(<Page />);
    await walk("10000", "6");
    await showMore();
    await fill("First payment month", "9/2026");
    expect(screen.getByText(/Payments start: type the year/)).toBeInTheDocument();
    expect(screen.getByLabelText(/First payment month/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(COPY.fixFirst)).toBeInTheDocument();
    expect(balanceCard()).toHaveTextContent(COPY.waiting);
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("says the loan statement is the final word", async () => {
    render(<Page />);
    await walk("5000", "4");
    expect(screen.getByText(COPY.notes.estimate)).toBeInTheDocument();
  });

  it("offers Print or save once there is an answer, and opens Print and Save a copy", async () => {
    render(<Page />);
    await walk("12000", "0", "250");
    expect(paidOff()).toHaveTextContent("4 years");
    expect(more()).toHaveTextContent("Months to pay off48");
    expect(document.querySelectorAll(".primary")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "I'm done" })).toHaveClass("primary");
    expect(screen.getByRole("link", { name: "I'm done" })).toHaveAttribute("href", "#/");
    expect(screen.getByRole("button", { name: "Print or save" })).not.toHaveClass("primary");
    expect(screen.queryByRole("button", { name: "Print" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Print or save" }));
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save a copy" })).toBeInTheDocument();
    expect(screen.getByText(COPY.save.preview)).toBeInTheDocument();
  });
});

describe("Student Loan Growth and Payoff Start over", () => {
  it("shows Start over only once something is typed, with its undo note, inside More options", async () => {
    render(<Page />);
    await fill("Loan balance", "9000");
    // Start over lives on the answer screen, so no question screen has it.
    expect(document.querySelector("details.nt-more")).toBeNull();
    expect(screen.queryByText("You can put your numbers back.")).toBeNull();
    await cont();
    await fill("Yearly interest rate", "4");
    await cont();
    await cont();
    const details = document.querySelector("details.nt-more") as HTMLDetailsElement;
    expect(details.querySelector("summary")).toHaveTextContent("More options");
    await userEvent.click(screen.getByText("More options"));
    expect(details).toContainElement(screen.getByRole("button", { name: "Start over" }));
    expect(details).toContainElement(screen.getByText("You can put your numbers back."));
  });

  it("asks first, and Clear the boxes stays on the answer screen with the waiting words and the saved copy gone", async () => {
    render(<Page />);
    await walk("9000", "4", "100");
    expect(saved()).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.getByText(/This clears every box/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(screen.getByText("Step 4 of 4: your answer")).toBeInTheDocument();
    expect(balanceCard()).toHaveTextContent(COPY.waiting);
    expect(balanceCard()).not.toHaveTextContent("$");
    expect(screen.getByText(/Your numbers are cleared\./)).toBeInTheDocument();
    expect(window.localStorage.getItem(SAVED_KEY)).toBeNull();
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("Change my numbers after Clear the boxes goes to step 1 with every box empty", async () => {
    render(<Page />);
    await walk("9000", "4", "100");
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    await change();
    expect(stepText(1)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.balance })).toBeInTheDocument();
    expect(screen.getByLabelText("Loan balance", { exact: false })).toHaveValue("");
    await cont();
    expect(screen.getByText(COPY.steps.balanceMissing)).toBeInTheDocument();
    await fill("Loan balance", "5");
    await cont();
    expect(screen.getByLabelText("Yearly interest rate")).toHaveValue("");
    await fill("Yearly interest rate", "4");
    await cont();
    expect(screen.getByLabelText("Monthly payment", { exact: false })).toHaveValue("");
  });

  it("keeps the numbers when asked to", async () => {
    render(<Page />);
    await walk("9000", "4");
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Keep my numbers" }));
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(balanceCard()).toHaveTextContent("$9,000.00");
    await change();
    expect(screen.getByLabelText("Loan balance")).toHaveValue("9000");
  });

  it("clears the boxes and the saved copy, then puts the numbers and the answer back", async () => {
    render(<Page />);
    await walk("1234", "4");
    const before = balanceCard().textContent;
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    expect(window.localStorage.getItem(SAVED_KEY)).toBeNull();
    expect(screen.getByText(/Your numbers are cleared\./)).toBeInTheDocument();
    expect(balanceCard()).toHaveTextContent(COPY.waiting);
    await userEvent.click(screen.getByRole("button", { name: "Put it back" }));
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(balanceCard().textContent).toBe(before);
    expect(balanceCard()).not.toHaveTextContent(COPY.waiting);
    expect(screen.queryByText(/Your numbers are cleared\./)).toBeNull();
    expect(saved().value.balance).toBe("1234");
    await change();
    expect(screen.getByLabelText("Loan balance")).toHaveValue("1234");
  });
});

describe("Student Loan Growth and Payoff autosave and resume", () => {
  it("saves the numbers and the step as the person moves", async () => {
    render(<Page />);
    await fill("Loan balance", "1200");
    expect(saved().step).toBe(0);
    expect(saved().value.balance).toBe("1200");
    await cont();
    expect(saved().step).toBe(1);
    await fill("Yearly interest rate", "4");
    await cont();
    expect(saved().step).toBe(2);
    await fill("Monthly payment", "100");
    await cont();
    expect(saved().step).toBe(3);
    expect(saved().value).toMatchObject({ balance: "1200", rate: "4", payment: "100" });
  });

  it("saves the value and the step together when the person taps Change my numbers", async () => {
    render(<Page />);
    await walk("12000", "0", "250");
    expect(saved().step).toBe(3);
    await change();
    expect(saved().step).toBe(0);
    expect(saved().value).toMatchObject({ balance: "12000", rate: "0", payment: "250" });
  });

  it("shows a separate resume screen instead of step 1 when a saved copy exists and the boxes are blank", async () => {
    const first = render(<Page />);
    await fill("Loan balance", "1200");
    first.unmount();
    const { container } = render(<Page />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: COPY.resume.title })).toBeInTheDocument();
    expect(screen.getByText(COPY.resume.body)).toBeInTheDocument();
    expect(screen.getByText(COPY.title)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: COPY.resume.yes })).toHaveClass("primary");
    expect(screen.getByRole("button", { name: COPY.resume.no })).not.toHaveClass("primary");
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
    expect(screen.queryByText(/Step \d of \d/)).toBeNull();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByText(/Your numbers stay on this phone or computer\./)).toBeNull();
    expect(screen.queryByRole("link", { name: "How we know" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Back to tools" })).toBeNull();
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.queryByRole("heading", { name: COPY.steps.balance })).toBeNull();
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("shows no resume screen when nothing is saved", () => {
    render(<Page />);
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
    expect(screen.queryByRole("button", { name: COPY.resume.yes })).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.balance })).toBeInTheDocument();
  });

  it("Use them brings the numbers back and leaves the resume screen", async () => {
    const first = render(<Page />);
    await fill("Loan balance", "1200");
    first.unmount();
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
    expect(screen.getByLabelText("Loan balance", { exact: false })).toHaveValue("1200");
  });

  it("brings back the step too, so the person lands where they left off", async () => {
    const first = render(<Page />);
    await fill("Loan balance", "1200");
    await cont();
    await fill("Yearly interest rate", "4");
    first.unmount();
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: COPY.resume.title })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.rate })).toBeInTheDocument();
    expect(screen.getByLabelText("Yearly interest rate")).toHaveValue("4");
    // A restore changes the step, so the cursor lands in that step's first box.
    expect(screen.getByLabelText("Yearly interest rate")).toHaveFocus();
    await back();
    expect(screen.getByLabelText("Loan balance", { exact: false })).toHaveValue("1200");
  });

  it("brings back the answer screen when the person left on it", async () => {
    const first = render(<Page />);
    await walk("12000", "0", "250");
    first.unmount();
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: COPY.resume.title })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(paidOff()).toHaveTextContent("4 years");
  });

  it("No thanks clears the saved copy and shows step 1 with blank boxes", async () => {
    const first = render(<Page />);
    await fill("Loan balance", "1200");
    first.unmount();
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.no }));
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
    expect(window.localStorage.getItem(SAVED_KEY)).toBeNull();
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.balance })).toBeInTheDocument();
    expect(screen.getByLabelText("Loan balance", { exact: false })).toHaveValue("");
    await cont();
    expect(screen.getByText(COPY.steps.balanceMissing)).toBeInTheDocument();
  });

  it("does not bring the resume screen back while the person types after No thanks", async () => {
    const first = render(<Page />);
    await fill("Loan balance", "1200");
    first.unmount();
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.no }));
    await fill("Loan balance", "7");
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
    expect(screen.getByLabelText("Loan balance", { exact: false })).toHaveValue("7");
    await cont();
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
  });
});

describe("Student Loan Growth and Payoff answer basis and finish line", () => {
  it("starts the payoff card with a basis line that repeats the balance and rate", async () => {
    render(<Page />);
    await walk("$20,000", "5", "300");
    const basis = paidOff().querySelector(".nt-result-basis") as HTMLElement;
    expect(basis).toHaveTextContent("For $20,000 at 5%.");
    expect((paidOff().querySelector(".nt-result-body") as HTMLElement).firstElementChild).toBe(basis);
  });

  it("keeps real cents in the basis line", async () => {
    render(<Page />);
    await walk("$5,000.25", "4", "100");
    expect(paidOff().querySelector(".nt-result-basis")).toHaveTextContent("For $5,000.25 at 4%.");
  });

  it("has no basis line while the card is waiting", async () => {
    await resumeAt(3, {});
    expect(balanceCard().querySelector(".nt-result-basis")).toBeNull();
  });

  it("ends the answer with the short finish line", async () => {
    render(<Page />);
    await walk("5000", "4");
    expect(screen.getByText("That is your estimate. You can stop here.")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/or change a number to try again/);
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

  it("shows the basis line on the balance card too, when no payment is typed", async () => {
    render(<Page />);
    await fill("Loan balance", "20000");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    await fill("Yearly interest rate", "5");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    await userEvent.click(screen.getByRole("button", { name: COPY.see }));
    const basis = document.querySelector(".nt-result-basis");
    expect(basis).toHaveTextContent("For $20,000 at 5%.");
  });
});

