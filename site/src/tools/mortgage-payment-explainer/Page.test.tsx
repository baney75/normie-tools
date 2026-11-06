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

const SAVED_KEY = "nt:flow:mortgage-payment-explainer";
const EMPTY = { price: "", down: "", rate: "", term: "", tax: "", insurance: "", hoa: "", pmi: "" };

async function fill(label: string, text: string) {
  const box = screen.getByLabelText(label, { exact: false });
  await userEvent.clear(box);
  if (text) await userEvent.type(box, text);
}

/** The one filled button: Continue, or the tool's own words on the last step. */
const cont = () => userEvent.click(screen.getByRole("button", { name: new RegExp(`^(Continue|${COPY.see})$`) }));
const back = () => userEvent.click(screen.getByRole("button", { name: "Back" }));
const change = () => userEvent.click(screen.getByRole("button", { name: "Change my numbers" }));
const stepText = (n: number) => screen.getByText(`Step ${n} of 5`);
const saved = () => JSON.parse(window.localStorage.getItem(SAVED_KEY) ?? "null");

/** The tax, insurance and fee boxes wait inside the closed "More options" next to Start over. */
const moreDetails = () => screen.getByText("More options", { selector: "summary" }).closest("details") as HTMLDetailsElement;
async function showMore() {
  await userEvent.click(screen.getByText("More options", { selector: "summary" }));
}

/** Picks the loan length the way a person does: a chip when there is one, else Other and a number. */
async function setYears(n: string) {
  if (COPY.term.quick.includes(n as never)) {
    await userEvent.click(screen.getByRole("radio", { name: `${n} ${COPY.term.quickSuffix}` }));
    return;
  }
  await userEvent.click(screen.getByRole("radio", { name: COPY.term.other }));
  await fill(COPY.term.otherLabel, n);
}

/** Types steps 1 to 3 and stops on step 4, the loan length. */
async function toLength(price = "$300,000", down = "$60,000", rate = "6") {
  await fill("Home price", price);
  await cont();
  await fill("Down payment", down);
  await cont();
  await fill("Yearly interest rate", rate);
  await cont();
}

/** Walks all four steps the way a person does and lands on the answer screen. */
async function walk(price = "$300,000", down = "$60,000", rate = "6", years = "30") {
  await toLength(price, down, rate);
  await setYears(years);
  await cont();
}

async function fillCore() {
  await walk();
}

async function fillBasic() {
  await walk();
  await showMore();
  await fill("Property tax for the year", "$3,600");
  await fill("Home insurance for the year", "$1,200");
  await fill("Neighborhood fee each month", "$50");
}

/** Brings back a saved copy at a given step, to see screens a person cannot reach by typing. */
async function resumeAt(step: number, value: Partial<typeof EMPTY>) {
  writeSaved("mortgage-payment-explainer", step, { ...EMPTY, ...value });
  render(<Page />);
  await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
}

const card = () => screen.getByLabelText("Total monthly payment");
const more = () => screen.getByText(COPY.more.summary).closest("details") as HTMLElement;

function expectWaiting() {
  expect(card()).toHaveTextContent(COPY.waiting);
  expect(card()).not.toHaveTextContent("$");
}

describe("Mortgage Payment Explainer step 1", () => {
  it("opens on step 1 with the question as the h1, the trust line and Back to tools", () => {
    const { container } = render(<Page />);
    expect(stepText(1)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "1");
    expect(screen.getByRole("progressbar")).toHaveAttribute("max", "5");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.price })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: COPY.question })).toBeNull();
    expect(screen.getByText(COPY.title)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "How this page handles your numbers" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "How this page handles your numbers" })).toHaveAttribute("href", "#/private");
    expect(screen.getByRole("link", { name: "Back to tools" })).toHaveAttribute("href", "#/");
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    expect(screen.getByLabelText("Home price")).toHaveValue("");
    expect(screen.getByLabelText("Home price")).not.toHaveFocus();
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Continue" })).toHaveClass("primary");
    expect(screen.getByRole("button", { name: "Continue" })).toHaveAttribute("type", "submit");
    expect(document.body.textContent).not.toMatch(/You are here|These are example numbers|There is no Send button/);
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("shows only the one question: no answer card, no other boxes, no extras, no Start over", () => {
    render(<Page />);
    expect(screen.queryByLabelText("Total monthly payment")).toBeNull();
    expect(document.getElementById("nt-answer")).toBeNull();
    expect(screen.queryByLabelText("Down payment")).toBeNull();
    expect(screen.queryByLabelText("Yearly interest rate")).toBeNull();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.queryByText("More options")).toBeNull();
    expect(screen.queryByLabelText("Property tax for the year", { exact: false })).toBeNull();
    expect(screen.queryByLabelText("Mortgage insurance each month", { exact: false })).toBeNull();
    expect(screen.queryByRole("button", { name: COPY.see })).toBeNull();
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Change my numbers" })).toBeNull();
    expect(screen.queryByText(COPY.notes.estimate)).toBeNull();
    expect(document.body.textContent).not.toMatch(/Show my answer|That is your answer|Done\. Back to home|Change a number|Type my own numbers/);
  });

  it("has a labeled box with a decimal keypad and no autofill", () => {
    render(<Page />);
    const box = screen.getByLabelText("Home price", { exact: false });
    expect(box).toHaveAttribute("inputmode", "decimal");
    expect(box).toHaveAttribute("autocomplete", "off");
  });

  it("Continue with an empty box stays on step 1, says what is missing and focuses the box", async () => {
    render(<Page />);
    await cont();
    expect(stepText(1)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.price })).toBeInTheDocument();
    expect(screen.getByText(COPY.steps.priceMissing)).toBeInTheDocument();
    expect(screen.getByLabelText("Home price")).toHaveFocus();
  });

  it("Continue with a bad price stays put, names the field and never shows NaN", async () => {
    render(<Page />);
    await fill("Home price", "lots");
    await cont();
    expect(stepText(1)).toBeInTheDocument();
    expect(screen.getByText(COPY.steps.priceMissing)).toBeInTheDocument();
    expect(screen.getByText(/Home price: use a number above zero/)).toBeInTheDocument();
    expect(screen.getByLabelText("Home price")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Home price")).toHaveFocus();
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("Continue when ready moves to step 2 and puts the cursor in its box", async () => {
    render(<Page />);
    await fill("Home price", "300000");
    await cont();
    expect(stepText(2)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "2");
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.down })).toBeInTheDocument();
    expect(screen.getByLabelText("Down payment")).toHaveFocus();
  });

  it("Enter in the box moves on, the same as Continue", async () => {
    render(<Page />);
    await userEvent.type(screen.getByLabelText("Home price"), "300000{Enter}");
    expect(stepText(2)).toBeInTheDocument();
  });
});

describe("Mortgage Payment Explainer steps 2 to 4", () => {
  it("step 2 asks for the down payment, has Back, and drops the trust line", async () => {
    render(<Page />);
    await fill("Home price", "300000");
    await cont();
    expect(screen.queryByRole("link", { name: "How this page handles your numbers" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Back to tools" })).toBeNull();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    const box = screen.getByLabelText("Down payment");
    expect(box).toHaveValue("");
    expect(box).toHaveAttribute("inputmode", "decimal");
    expect(box).toHaveAttribute("autocomplete", "off");
    expect(screen.queryByLabelText("Home price")).toBeNull();
  });

  it("step 2 Continue with an empty box stays and says what is missing", async () => {
    render(<Page />);
    await fill("Home price", "300000");
    await cont();
    await cont();
    expect(stepText(2)).toBeInTheDocument();
    expect(screen.getByText(COPY.steps.downMissing)).toBeInTheDocument();
    expect(screen.getByLabelText("Down payment")).toHaveFocus();
  });

  it("names the down payment when it is not less than the price, and holds the person on step 2", async () => {
    render(<Page />);
    await fill("Home price", "100000");
    await cont();
    await fill("Down payment", "100000");
    await cont();
    expect(stepText(2)).toBeInTheDocument();
    expect(screen.getByText("Down payment: it must be less than the home price.")).toBeInTheDocument();
    expect(screen.getByLabelText("Down payment")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Down payment")).toHaveFocus();
  });

  it("Back returns to step 1 with the price still there", async () => {
    render(<Page />);
    await fill("Home price", "300000");
    await cont();
    await back();
    expect(stepText(1)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.price })).toBeInTheDocument();
    expect(screen.getByLabelText("Home price")).toHaveValue("300000");
    expect(screen.getByLabelText("Home price")).toHaveFocus();
  });

  it("step 3 asks for the rate", async () => {
    render(<Page />);
    await fill("Home price", "300000");
    await cont();
    await fill("Down payment", "60000");
    await cont();
    expect(stepText(3)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.rate })).toBeInTheDocument();
    expect(screen.getByLabelText("Yearly interest rate")).toHaveFocus();
    expect(screen.getByLabelText("Yearly interest rate")).toHaveAttribute("inputmode", "decimal");
    await cont();
    expect(screen.getByText(COPY.steps.rateMissing)).toBeInTheDocument();
    expect(stepText(3)).toBeInTheDocument();
  });

  it("step 4 asks how long, with chips and nothing picked, and the last button is See my answer", async () => {
    const { container } = render(<Page />);
    await toLength();
    expect(stepText(4)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "4");
    expect(screen.getByRole("heading", { level: 1, name: COPY.term.label })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    for (const r of screen.getAllByRole("radio")) expect(r).not.toBeChecked();
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    expect(screen.getByRole("button", { name: COPY.see })).toHaveClass("primary");
    expect(screen.getByRole("button", { name: COPY.see }).closest("details")).toBeNull();
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
  });

  it("See my answer with no length picked stays on step 4 and sends the cursor to the length chips", async () => {
    render(<Page />);
    await toLength();
    await cont();
    expect(stepText(4)).toBeInTheDocument();
    expect(screen.getByText(COPY.steps.termMissing)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "15 years" })).toHaveFocus();
  });

  it("the Other box has a numeric keypad and shows only after Other is tapped", async () => {
    render(<Page />);
    await toLength();
    expect(screen.queryByLabelText("Years to pay it back")).toBeNull();
    await userEvent.click(screen.getByRole("radio", { name: COPY.term.other }));
    expect(screen.getByLabelText("Years to pay it back")).toHaveAttribute("inputmode", "numeric");
  });

  it("goes back from step 4 to step 3 with the rate still there", async () => {
    render(<Page />);
    await toLength();
    await back();
    expect(stepText(3)).toBeInTheDocument();
    expect(screen.getByLabelText("Yearly interest rate")).toHaveValue("6");
  });

  it("tells the person what is missing on each step, in order", async () => {
    render(<Page />);
    await cont();
    expect(screen.getByText(COPY.steps.priceMissing)).toBeInTheDocument();
    await fill("Home price", "300000");
    await cont();
    await cont();
    expect(screen.getByText(COPY.steps.downMissing)).toBeInTheDocument();
    await fill("Down payment", "60000");
    await cont();
    await cont();
    expect(screen.getByText(COPY.steps.rateMissing)).toBeInTheDocument();
    await fill("Yearly interest rate", "6");
    await cont();
    await cont();
    expect(screen.getByText(COPY.steps.termMissing)).toBeInTheDocument();
    expect(stepText(4)).toBeInTheDocument();
  });

  it("quick picks set the years and show which one is chosen", async () => {
    render(<Page />);
    await toLength();
    expect(screen.queryByLabelText("Years to pay it back")).toBeNull();
    await userEvent.click(screen.getByRole("radio", { name: "20 years" }));
    expect(screen.getByRole("radio", { name: "20 years" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "15 years" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "30 years" })).not.toBeChecked();
    await cont();
    expect(more()).toHaveTextContent("Loan length20 years");
    // Back on the length step, the chip is still the picked one.
    await change();
    await cont();
    await cont();
    await cont();
    expect(stepText(4)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "20 years" })).toBeChecked();
    await userEvent.click(screen.getByRole("radio", { name: COPY.term.other }));
    expect(screen.getByRole("radio", { name: COPY.term.other })).toBeChecked();
    await fill("Years to pay it back", "17");
    expect(screen.getByRole("radio", { name: "20 years" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: COPY.term.other })).toBeChecked();
    await cont();
    expect(more()).toHaveTextContent("Loan length17 years");
  });
});

describe("Mortgage Payment Explainer answer screen", () => {
  it("shows the tool question as the h1 and the answer as the last step, with a full progress bar", async () => {
    render(<Page />);
    await fillCore();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(screen.getByText(COPY.title)).toBeInTheDocument();
    expect(screen.getByText("Step 5 of 5: your answer")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "5");
    expect(screen.getByRole("progressbar")).toHaveAttribute("max", "5");
    expect(screen.queryByLabelText("Home price")).toBeNull();
    expect(card()).toHaveAttribute("id", "nt-answer");
    expect(card()).toHaveAttribute("tabindex", "-1");
    expect(card().querySelector(".nt-result-tag")).toBeNull();
  });

  it("has Done as the one main link, Print or save as an outline, a quiet Change my numbers and no Continue", async () => {
    render(<Page />);
    await fillCore();
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
    await fillCore();
    await change();
    expect(stepText(1)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.price })).toBeInTheDocument();
    expect(screen.getByLabelText("Home price")).toHaveValue("$300,000");
    expect(screen.getByLabelText("Home price")).toHaveFocus();
    await cont();
    expect(screen.getByLabelText("Down payment")).toHaveValue("$60,000");
    await cont();
    expect(screen.getByLabelText("Yearly interest rate")).toHaveValue("6");
    await cont();
    expect(screen.getByRole("radio", { name: "30 years" })).toBeChecked();
  });

  it("changing a number and walking again updates the answer", async () => {
    render(<Page />);
    await fillCore();
    expect(card()).toHaveTextContent("$1,438.92");
    await change();
    await fill("Home price", "$400,000");
    await cont();
    await fill("Down payment", "$160,000");
    await cont();
    await cont();
    await cont();
    expect(card()).toHaveTextContent("$1,438.92");
    await change();
    await fill("Home price", "$360,000");
    await cont();
    await cont();
    await cont();
    await cont();
    expect(card()).toHaveTextContent("$1,199.10");
  });

  it("an answer screen with numbers missing shows only the waiting words, no money and no buttons for a result", async () => {
    await resumeAt(4, { price: "300000" });
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expectWaiting();
    expect(card().querySelector(".nt-result-label")).toBeNull();
    expect(card().querySelector(".nt-result-tag")).toBeNull();
    expect(card()).toHaveAttribute("id", "nt-answer");
    expect(card()).toHaveAttribute("tabindex", "-1");
    // A number is typed, so Start over is there, waiting inside the closed "More options".
    expect(screen.getByText("More options").closest("details")).not.toHaveAttribute("open");
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    expect(screen.queryByRole("link", { name: "I'm done" })).toBeNull();
    expect(document.querySelectorAll(".primary")).toHaveLength(0);
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("has labels above the optional boxes, decimal keypads, no autofill", async () => {
    render(<Page />);
    await fillCore();
    await showMore();
    for (const name of ["Property tax for the year", "Home insurance for the year", "Neighborhood fee each month", "Mortgage insurance each month"]) {
      const box = screen.getByLabelText(name, { exact: false });
      expect(box).toHaveAttribute("inputmode", "decimal");
      expect(box).toHaveAttribute("autocomplete", "off");
    }
  });

  it("keeps tax, insurance and fees inside the closed More options until it is opened", async () => {
    render(<Page />);
    await fillCore();
    expect(screen.queryByRole("button", { name: /Add tax, insurance and fees/ })).toBeNull();
    expect(moreDetails().open).toBe(false);
    for (const name of ["Property tax for the year", "Home insurance for the year", "Neighborhood fee each month", "Mortgage insurance each month"]) {
      expect(moreDetails()).toContainElement(screen.getByLabelText(name, { exact: false }));
    }
    expect(moreDetails()).toContainElement(screen.getByRole("button", { name: "Start over" }));
    await showMore();
    expect(moreDetails().open).toBe(true);
    expect(screen.getByLabelText("Property tax for the year", { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText("Mortgage insurance each month", { exact: false })).toBeInTheDocument();
  });

  it("leaves More options open with the red note when an optional box has a bad value", async () => {
    render(<Page />);
    await fillCore();
    expect(moreDetails().open).toBe(false);
    await showMore();
    await fill("Property tax for the year", "abc");
    expect(moreDetails().open).toBe(true);
    expect(screen.getByLabelText("Property tax for the year", { exact: false })).toHaveAttribute("aria-invalid", "true");
    expect(within(moreDetails()).getByText(/Check this\./)).toBeInTheDocument();
    expectWaiting();
  });

  it("opens More options by itself when a saved optional box already has a bad value", async () => {
    await resumeAt(4, { price: "300000", down: "60000", rate: "6", term: "30", pmi: "abc" });
    expect(moreDetails().open).toBe(true);
    expect(screen.getByLabelText("Mortgage insurance each month", { exact: false })).toHaveAttribute("aria-invalid", "true");
    expect(within(moreDetails()).getByText(/Check this\./)).toBeInTheDocument();
  });

  it("says the payment is the loan only when no tax, insurance or fees are typed", async () => {
    render(<Page />);
    await fillCore();
    expect(card()).toHaveTextContent(COPY.result.loanOnly);
    expect(card()).not.toHaveTextContent(COPY.result.totalLine);
  });

  it("shows the exact answer as the person types", async () => {
    render(<Page />);
    await fillBasic();
    expect(card()).toHaveTextContent("$1,888.92");
    expect(card()).toHaveTextContent(COPY.result.totalLine);
    expect(card()).toHaveTextContent("Loan amount$240,000.00");
    expect(card()).toHaveTextContent("Loan length30 years");
    expect(card()).not.toHaveTextContent("Total interest");
    expect(more()).toHaveTextContent("Total interest over the loan$278,012.58");
    expect(more()).toHaveTextContent("Loan payment$1,438.92");
    expect(more()).toHaveTextContent("Property tax each month$300.00");
    expect(more()).toHaveTextContent("Home insurance each month$100.00");
    expect(more()).toHaveTextContent("Neighborhood fee each month$50.00");
    expect(more()).toHaveTextContent("Mortgage insurance each month$0.00");
    expect(more()).toHaveTextContent("Loan amount$240,000.00");
    expect(more()).toHaveTextContent("Loan length30 years");
    expect(more()).toHaveTextContent("Total interest over the loan$278,012.58");
    const first = screen.getByRole("region", { name: "Your first payment" });
    expect(first).toHaveTextContent("Goes to interest$1,200.00");
    expect(first).toHaveTextContent("Lowers what you owe$238.92");
  });

  it("keeps the optional boxes on the answer screen after Change my numbers and back", async () => {
    render(<Page />);
    await fillBasic();
    await change();
    await cont();
    await cont();
    await cont();
    await cont();
    expect(card()).toHaveTextContent("$1,888.92");
    expect(screen.getByLabelText("Property tax for the year", { exact: false })).toHaveValue("$3,600");
  });

  it("adds mortgage insurance and rounds yearly amounts half up", async () => {
    render(<Page />);
    await walk("250,000", "12,500", "7.25%", "15");
    await showMore();
    await fill("Property tax for the year", "2750.50");
    await fill("Home insurance for the year", "1500.25");
    await fill("Neighborhood fee each month", "120");
    await fill("Mortgage insurance each month", "95.10");
    expect(card()).toHaveTextContent("$2,737.38");
    expect(more()).toHaveTextContent("Loan payment$2,168.05");
    expect(more()).toHaveTextContent("Property tax each month$229.21");
    expect(more()).toHaveTextContent("Home insurance each month$125.02");
    expect(more()).toHaveTextContent("Mortgage insurance each month$95.10");
  });

  it("shows a calm error and the waiting words when an optional box has junk, never NaN", async () => {
    render(<Page />);
    await fillCore();
    await showMore();
    await fill("Property tax for the year", "lots");
    expect(screen.getByLabelText("Property tax for the year", { exact: false })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(COPY.fixFirst)).toBeInTheDocument();
    expectWaiting();
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("says it is an estimate and explains every word", async () => {
    render(<Page />);
    await fillCore();
    expect(screen.getByText(COPY.notes.estimate)).toBeInTheDocument();
    const words = within(screen.getByText(COPY.key.summary).closest("details") as HTMLElement);
    for (const k of COPY.key.items) expect(words.getByText(k.term, { selector: "dt" })).toBeInTheDocument();
  });

  it("offers Print or save once there is an answer, and opens Print and Save a copy", async () => {
    render(<Page />);
    await walk("130000", "10000", "0", "10");
    expect(card()).toHaveTextContent("$1,000.00");
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
    await fillBasic();
    const body = document.body.textContent ?? "";
    expect(body.split(COPY.notes.estimate).length - 1).toBe(1);
    await userEvent.click(screen.getByRole("button", { name: "Print or save" }));
    expect(screen.getByRole("group", { name: "Preview" })).toHaveTextContent(COPY.save.preview);
    expect(screen.getByRole("group", { name: "Preview" })).not.toHaveTextContent("$");
    const open = (document.body.textContent ?? "").replace(/What the words mean[\s\S]*$/, "");
    expect(open).not.toMatch(/APR|HOA/);
  });
});

describe("Mortgage Payment Explainer one main button", () => {
  it("hands the one main button from Done back to Continue when a number is blanked, and holds the person on the step", async () => {
    render(<Page />);
    await fillCore();
    expect(screen.getByRole("link", { name: "I'm done" })).toHaveClass("primary");
    expect(screen.getByRole("link", { name: "I'm done" })).toHaveAttribute("href", "#/");
    expect(screen.getByRole("button", { name: "Print or save" })).not.toHaveClass("primary");
    await change();
    await cont();
    await cont();
    await fill("Yearly interest rate", "");
    await cont();
    expect(stepText(3)).toBeInTheDocument();
    expect(screen.getByText(COPY.steps.rateMissing)).toBeInTheDocument();
    expect(document.querySelectorAll(".primary")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Continue" })).toHaveClass("primary");
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    expect(screen.queryByRole("link", { name: "I'm done" })).toBeNull();
  });
});

describe("Mortgage Payment Explainer Start over", () => {
  it("shows Start over only once something is typed, with its undo note, behind More options", async () => {
    render(<Page />);
    await fill("Home price", "300000");
    // Start over lives on the answer screen, so no question screen has it.
    expect(document.querySelector("details.nt-more")).toBeNull();
    expect(screen.queryByText("You can put your numbers back.")).toBeNull();
    await cont();
    await fill("Down payment", "60000");
    await cont();
    await fill("Yearly interest rate", "6");
    await cont();
    await setYears("30");
    await cont();
    const details = document.querySelector("details.nt-more") as HTMLDetailsElement;
    expect(details.querySelector("summary")).toHaveTextContent("More options");
    expect(details).toContainElement(screen.getByRole("button", { name: "Start over" }));
    expect(details).toContainElement(screen.getByText("You can put your numbers back."));
  });

  it("asks first, and Clear the boxes stays on the answer screen with the waiting words and the saved copy gone", async () => {
    render(<Page />);
    await fillCore();
    expect(saved()).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.getByText(/This clears every box/)).toBeInTheDocument();
    expect(card()).toHaveTextContent("$");
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(screen.getByText("Step 5 of 5: your answer")).toBeInTheDocument();
    expectWaiting();
    expect(screen.getByText(/Your numbers are cleared\./)).toBeInTheDocument();
    expect(window.localStorage.getItem(SAVED_KEY)).toBeNull();
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("Change my numbers after Clear the boxes goes to step 1 with every box empty", async () => {
    render(<Page />);
    await fillCore();
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    await change();
    expect(stepText(1)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.price })).toBeInTheDocument();
    expect(screen.getByLabelText("Home price")).toHaveValue("");
    await cont();
    expect(screen.getByText(COPY.steps.priceMissing)).toBeInTheDocument();
    await fill("Home price", "5");
    await cont();
    expect(screen.getByLabelText("Down payment")).toHaveValue("");
    await fill("Down payment", "1");
    await cont();
    expect(screen.getByLabelText("Yearly interest rate")).toHaveValue("");
    await fill("Yearly interest rate", "5");
    await cont();
    for (const r of screen.getAllByRole("radio")) expect(r).not.toBeChecked();
  });

  it("Clear the boxes also closes Other and the tax and insurance section", async () => {
    render(<Page />);
    await walk("$300,000", "$60,000", "6", "17");
    await showMore();
    await fill("Property tax for the year", "$3,600");
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    expect(screen.queryByLabelText("Property tax for the year", { exact: false })).toBeNull();
    expect(screen.queryByText("More options")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Put it back" }));
    expect(moreDetails().open).toBe(false);
    expect(screen.getByLabelText("Property tax for the year", { exact: false })).toHaveValue("$3,600");
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    await change();
    await fill("Home price", "5");
    await cont();
    await fill("Down payment", "1");
    await cont();
    await fill("Yearly interest rate", "5");
    await cont();
    expect(screen.queryByLabelText("Years to pay it back")).toBeNull();
    for (const r of screen.getAllByRole("radio")) expect(r).not.toBeChecked();
  });

  it("keeps the numbers when asked to", async () => {
    render(<Page />);
    await fillCore();
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Keep my numbers" }));
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(card()).toHaveTextContent("$1,438.92");
    await change();
    expect(screen.getByLabelText("Home price")).toHaveValue("$300,000");
  });

  it("clears the boxes and the saved copy, then puts the numbers and the answer back", async () => {
    render(<Page />);
    await walk("1234", "100", "6", "30");
    const before = card().textContent;
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    expect(window.localStorage.getItem(SAVED_KEY)).toBeNull();
    expect(screen.getByText(/Your numbers are cleared\./)).toBeInTheDocument();
    expectWaiting();
    await userEvent.click(screen.getByRole("button", { name: "Put it back" }));
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(card().textContent).toBe(before);
    expect(card()).not.toHaveTextContent(COPY.waiting);
    expect(screen.queryByText(/Your numbers are cleared\./)).toBeNull();
    expect(saved().value.price).toBe("1234");
    await change();
    expect(screen.getByLabelText("Home price")).toHaveValue("1234");
  });
});

describe("Mortgage Payment Explainer autosave and resume", () => {
  it("saves the numbers and the step as the person moves", async () => {
    render(<Page />);
    await fill("Home price", "300000");
    expect(saved().step).toBe(0);
    expect(saved().value.price).toBe("300000");
    await cont();
    expect(saved().step).toBe(1);
    await fill("Down payment", "60000");
    await cont();
    expect(saved().step).toBe(2);
    await fill("Yearly interest rate", "6");
    await cont();
    expect(saved().step).toBe(3);
    await setYears("30");
    await cont();
    expect(saved().step).toBe(4);
    expect(saved().value).toMatchObject({ price: "300000", down: "60000", rate: "6", term: "30" });
  });

  it("saves the value and the step together when the person taps Change my numbers", async () => {
    render(<Page />);
    await fillCore();
    expect(saved().step).toBe(4);
    await change();
    expect(saved().step).toBe(0);
    expect(saved().value).toMatchObject({ price: "$300,000", down: "$60,000", rate: "6", term: "30" });
  });

  it("shows a separate resume screen instead of step 1 when a saved copy exists and the boxes are blank", async () => {
    const first = render(<Page />);
    await fill("Home price", "300000");
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
    expect(screen.queryByRole("link", { name: "How this page handles your numbers" })).toBeNull();
    expect(screen.queryByRole("link", { name: "How this page handles your numbers" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Back to tools" })).toBeNull();
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.queryByRole("heading", { name: COPY.steps.price })).toBeNull();
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("shows no resume screen when nothing is saved", () => {
    render(<Page />);
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
    expect(screen.queryByRole("button", { name: COPY.resume.yes })).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.price })).toBeInTheDocument();
  });

  it("Use them brings the numbers back and leaves the resume screen", async () => {
    const first = render(<Page />);
    await fill("Home price", "300000");
    first.unmount();
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
    expect(screen.getByLabelText("Home price", { exact: false })).toHaveValue("300000");
  });

  it("brings back the step too, so the person lands where they left off", async () => {
    const first = render(<Page />);
    await fill("Home price", "300000");
    await cont();
    await fill("Down payment", "60000");
    first.unmount();
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: COPY.resume.title })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.down })).toBeInTheDocument();
    expect(screen.getByLabelText("Down payment")).toHaveValue("60000");
    // A restore changes the step, so the cursor lands in that step's first box.
    expect(screen.getByLabelText("Down payment")).toHaveFocus();
    await back();
    expect(screen.getByLabelText("Home price", { exact: false })).toHaveValue("300000");
  });

  it("brings back the answer screen when the person left on it", async () => {
    const first = render(<Page />);
    await fillCore();
    first.unmount();
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: COPY.resume.title })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(card()).toHaveTextContent("$1,438.92");
  });

  it("No thanks clears the saved copy and shows step 1 with blank boxes", async () => {
    const first = render(<Page />);
    await fill("Home price", "300000");
    first.unmount();
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.no }));
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
    expect(window.localStorage.getItem(SAVED_KEY)).toBeNull();
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.price })).toBeInTheDocument();
    expect(screen.getByLabelText("Home price", { exact: false })).toHaveValue("");
    await cont();
    expect(screen.getByText(COPY.steps.priceMissing)).toBeInTheDocument();
  });

  it("does not bring the resume screen back while the person types after No thanks", async () => {
    const first = render(<Page />);
    await fill("Home price", "300000");
    first.unmount();
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.no }));
    await fill("Home price", "7");
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
    expect(screen.getByLabelText("Home price", { exact: false })).toHaveValue("7");
    await cont();
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
  });
});

describe("Mortgage Payment Explainer answer basis and finish line", () => {
  const basis = () => card().querySelector(".nt-result-basis") as HTMLElement;

  it("starts the answer card with a basis line that repeats the typed numbers", async () => {
    render(<Page />);
    await walk("$300,000", "$60,000", "6.5", "30");
    expect(basis()).toHaveTextContent("For a $300,000 home, $60,000 down, at 6.5% for 30 years.");
    const body = card().querySelector(".nt-result-body") as HTMLElement;
    expect(body.firstElementChild).toBe(basis());
  });

  it("follows the numbers when they change", async () => {
    render(<Page />);
    await fillCore();
    await change();
    await cont();
    await cont();
    await cont();
    await userEvent.click(screen.getByRole("radio", { name: "15 years" }));
    await cont();
    expect(basis()).toHaveTextContent("For a $300,000 home, $60,000 down, at 6% for 15 years.");
  });

  it("has no basis line while the card is waiting", async () => {
    await resumeAt(4, { price: "300000" });
    expect(card().querySelector(".nt-result-basis")).toBeNull();
  });

  it("ends the answer with the short finish line", async () => {
    render(<Page />);
    await fillCore();
    expect(screen.getByText("That is your estimate. You can stop here.")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/or change a number to try again/);
  });
});

describe("Mortgage Payment Explainer copy", () => {
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
  it("never gives advice or says what is typical", () => {
    expect(strings.join(" ")).not.toMatch(/\byou should\b|\bwe recommend\b|\bbest\b|\btypical\b|\busually\b|\baverage\b|\bnormal\b|\bmost people\b/i);
  });
  it("does not use the word device", () => {
    expect(strings.join(" ")).not.toMatch(/\bdevice/i);
  });
});
