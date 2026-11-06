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

const SAVED_KEY = "nt:flow:loan-explainer";
const EMPTY = { amount: "", rate: "", term: "", termUnit: "months", fees: "", extra: "" };

async function fill(label: string, text: string) {
  const box = screen.getByLabelText(label, { exact: false });
  await userEvent.clear(box);
  if (text) await userEvent.type(box, text);
}

/** The one filled button: Continue, or the tool's own words on the last step. */
const cont = () => userEvent.click(screen.getByRole("button", { name: new RegExp(`^(Continue|${COPY.see})$`) }));
const back = () => userEvent.click(screen.getByRole("button", { name: "Back" }));
const change = () => userEvent.click(screen.getByRole("button", { name: "Change my numbers" }));

const lines = () => screen.getByLabelText(COPY.more.summary, { selector: "dl" });
const card = () => screen.getByLabelText("Monthly payment");
const saved = () => JSON.parse(window.localStorage.getItem(SAVED_KEY) ?? "null");

/** The fees and extra payment boxes wait inside the closed "More options" next to Start over. */
const moreDetails = () => screen.getByText("More options", { selector: "summary" }).closest("details") as HTMLDetailsElement;
async function showMore() {
  await userEvent.click(screen.getByText("More options", { selector: "summary" }));
}

type Term = { chip: string } | { other: string; unit?: "Months" | "Years" };

/** Step 3: a chip, or Other with a typed length. */
async function pickTerm(term: Term) {
  if ("chip" in term) {
    await userEvent.click(screen.getByLabelText(term.chip));
    return;
  }
  await userEvent.click(screen.getByLabelText(COPY.term.other));
  await fill(COPY.term.otherLabel, term.other);
  if (term.unit) await userEvent.click(screen.getByLabelText(term.unit));
}

/** Types steps 1 and 2 and stops on step 3. */
async function toLength(amount = "$10,000", rate = "6") {
  await fill("Amount borrowed", amount);
  await cont();
  await fill("Yearly interest rate", rate);
  await cont();
}

/** Walks all three steps the way a person does and lands on the answer screen. */
async function walk(amount = "$10,000", rate = "6", term: Term = { other: "36", unit: "Months" }) {
  await toLength(amount, rate);
  await pickTerm(term);
  await cont();
}

/** Brings back a saved copy at a given step, to see screens a person cannot reach by typing. */
async function resumeAt(step: number, value: Partial<typeof EMPTY>) {
  writeSaved("loan-explainer", step, { ...EMPTY, ...value });
  render(<Page />);
  await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
}

const stepText = (n: number) => screen.getByText(`Step ${n} of 4`);

describe("Loan Explainer step 1", () => {
  it("opens on step 1 with the question as the h1, the trust line and Back to tools", () => {
    const { container } = render(<Page />);
    expect(stepText(1)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "1");
    expect(screen.getByRole("progressbar")).toHaveAttribute("max", "4");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.amount })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: COPY.question })).toBeNull();
    expect(screen.getByText(COPY.title)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "How this page handles your numbers" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "How this page handles your numbers" })).toHaveAttribute("href", "#/private");
    expect(screen.getByRole("link", { name: "Back to tools" })).toHaveAttribute("href", "#/");
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    expect(screen.getByLabelText("Amount borrowed")).toHaveValue("");
    expect(screen.getByLabelText("Amount borrowed")).not.toHaveFocus();
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Continue" })).toHaveClass("primary");
    expect(screen.getByRole("button", { name: "Continue" })).toHaveAttribute("type", "submit");
    expect(document.body.textContent).not.toMatch(/You are here|These are example numbers|There is no Send button/);
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("shows only the one question: no answer card, no other boxes, no extras, no Start over", () => {
    render(<Page />);
    expect(screen.queryByLabelText("Monthly payment")).toBeNull();
    expect(document.getElementById("nt-answer")).toBeNull();
    expect(screen.queryByLabelText("Yearly interest rate")).toBeNull();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.queryByText("More options")).toBeNull();
    expect(screen.queryByLabelText("Upfront fees", { exact: false })).toBeNull();
    expect(screen.queryByLabelText("Extra each month", { exact: false })).toBeNull();
    expect(screen.queryByRole("button", { name: COPY.see })).toBeNull();
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Change my numbers" })).toBeNull();
    expect(screen.queryByText(COPY.notes.estimate)).toBeNull();
    expect(document.body.textContent).not.toMatch(/Show my answer|That is your answer|Done\. Back to home|Change a number|Type my own numbers/);
  });

  it("has a labeled box with a decimal keypad and no autofill", () => {
    render(<Page />);
    const box = screen.getByLabelText("Amount borrowed", { exact: false });
    expect(box).toHaveAttribute("inputmode", "decimal");
    expect(box).toHaveAttribute("autocomplete", "off");
  });

  it("Continue with an empty box stays on step 1, says what is missing and focuses the box", async () => {
    render(<Page />);
    await cont();
    expect(stepText(1)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.amount })).toBeInTheDocument();
    expect(screen.getByText(COPY.steps.amountMissing)).toBeInTheDocument();
    expect(screen.getByLabelText("Amount borrowed")).toHaveFocus();
  });

  it("Continue with a bad amount stays put, names the field and never shows NaN", async () => {
    render(<Page />);
    await fill("Amount borrowed", "lots");
    await cont();
    expect(stepText(1)).toBeInTheDocument();
    expect(screen.getByText(COPY.steps.amountMissing)).toBeInTheDocument();
    expect(screen.getByText(/Amount borrowed: use a number above zero/)).toBeInTheDocument();
    expect(screen.getByLabelText("Amount borrowed")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Amount borrowed")).toHaveFocus();
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("Continue when ready moves to step 2 and puts the cursor in its box", async () => {
    render(<Page />);
    await fill("Amount borrowed", "5000");
    await cont();
    expect(stepText(2)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "2");
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.rate })).toBeInTheDocument();
    expect(screen.getByLabelText("Yearly interest rate")).toHaveFocus();
  });

  it("Enter in the box moves on, the same as Continue", async () => {
    render(<Page />);
    await userEvent.type(screen.getByLabelText("Amount borrowed"), "5000{Enter}");
    expect(stepText(2)).toBeInTheDocument();
  });
});

describe("Loan Explainer steps 2 and 3", () => {
  it("step 2 asks for the rate, has Back, and drops the trust line", async () => {
    render(<Page />);
    await fill("Amount borrowed", "5000");
    await cont();
    expect(screen.queryByRole("link", { name: "How this page handles your numbers" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Back to tools" })).toBeNull();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    const box = screen.getByLabelText("Yearly interest rate");
    expect(box).toHaveValue("");
    expect(box).toHaveAttribute("inputmode", "decimal");
    expect(box).toHaveAttribute("autocomplete", "off");
    expect(screen.queryByLabelText("Amount borrowed")).toBeNull();
  });

  it("step 2 Continue with an empty rate stays and says what is missing", async () => {
    render(<Page />);
    await fill("Amount borrowed", "5000");
    await cont();
    await cont();
    expect(stepText(2)).toBeInTheDocument();
    expect(screen.getByText(COPY.steps.rateMissing)).toBeInTheDocument();
    expect(screen.getByLabelText("Yearly interest rate")).toHaveFocus();
  });

  it("Back returns to step 1 with the amount still there", async () => {
    render(<Page />);
    await fill("Amount borrowed", "5000");
    await cont();
    await back();
    expect(stepText(1)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.amount })).toBeInTheDocument();
    expect(screen.getByLabelText("Amount borrowed")).toHaveValue("5000");
    expect(screen.getByLabelText("Amount borrowed")).toHaveFocus();
  });

  it("step 3 asks how long, with chips and nothing picked, and the last button is See my answer", async () => {
    const { container } = render(<Page />);
    await toLength("5000", "6.5");
    expect(stepText(3)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "3");
    expect(screen.getByRole("heading", { level: 1, name: COPY.term.label })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    for (const r of screen.getAllByRole("radio")) expect(r).not.toBeChecked();
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    expect(screen.getByRole("button", { name: COPY.see })).toHaveClass("primary");
    expect(screen.getByRole("button", { name: COPY.see }).closest("details")).toBeNull();
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
  });

  it("See my answer with no length picked stays on step 3 and sends the cursor to the length chips", async () => {
    render(<Page />);
    await toLength("12000", "6.5");
    await cont();
    expect(stepText(3)).toBeInTheDocument();
    expect(screen.getByText(COPY.steps.termMissing)).toBeInTheDocument();
    expect(screen.getByLabelText("2 years")).toHaveFocus();
  });

  it("keeps a typed length when Other is tapped again", async () => {
    render(<Page />);
    await toLength("5000", "6.5");
    await userEvent.click(screen.getByLabelText("Other"));
    await fill("Length of the loan", "3");
    await userEvent.click(screen.getByLabelText("Years"));
    await userEvent.click(screen.getByLabelText("Other"));
    expect(screen.getByLabelText("Length of the loan")).toHaveValue("3");
  });

  it("the Other box has a numeric keypad and shows only after Other is tapped", async () => {
    render(<Page />);
    await toLength("5000", "6.5");
    expect(screen.queryByLabelText(COPY.term.otherLabel)).toBeNull();
    await userEvent.click(screen.getByLabelText(COPY.term.other));
    expect(screen.getByLabelText(COPY.term.otherLabel)).toHaveAttribute("inputmode", "numeric");
  });

  it("goes back to step 2 from step 3 with the rate still there", async () => {
    render(<Page />);
    await toLength("5000", "6.5");
    await back();
    expect(stepText(2)).toBeInTheDocument();
    expect(screen.getByLabelText("Yearly interest rate")).toHaveValue("6.5");
  });

  it("the length chip you picked is still picked after Back and Continue", async () => {
    render(<Page />);
    await toLength("5000", "6.5");
    await pickTerm({ chip: "4 years" });
    await back();
    await cont();
    expect(screen.getByLabelText("4 years")).toBeChecked();
  });

  it("tells the person what is missing on each step, in order", async () => {
    render(<Page />);
    await cont();
    expect(screen.getByText(COPY.steps.amountMissing)).toBeInTheDocument();
    await fill("Amount borrowed", "5000");
    await cont();
    await cont();
    expect(screen.getByText(COPY.steps.rateMissing)).toBeInTheDocument();
    await fill("Yearly interest rate", "6");
    await cont();
    await cont();
    expect(screen.getByText(COPY.steps.termMissing)).toBeInTheDocument();
    expect(stepText(3)).toBeInTheDocument();
  });
});

describe("Loan Explainer answer screen", () => {
  it("shows the tool question as the h1 and the answer as the last step, with a full progress bar", async () => {
    render(<Page />);
    await walk();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(screen.getByText(COPY.title)).toBeInTheDocument();
    expect(screen.getByText("Step 4 of 4: your answer")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "4");
    expect(screen.getByRole("progressbar")).toHaveAttribute("max", "4");
    expect(screen.queryByLabelText("Amount borrowed")).toBeNull();
    expect(card()).toHaveAttribute("id", "nt-answer");
    expect(card()).toHaveAttribute("tabindex", "-1");
    expect(card().querySelector(".nt-result-tag")).toBeNull();
  });

  it("has Done as the one main link, Print or save as an outline, a quiet Change my numbers and no Continue", async () => {
    render(<Page />);
    await walk();
    expect(document.querySelectorAll(".primary")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "I'm done" })).toHaveClass("primary");
    expect(screen.getByRole("link", { name: "I'm done" })).toHaveAttribute("href", "#/");
    expect(screen.getByRole("button", { name: "Print or save" })).not.toHaveClass("primary");
    expect(screen.getByRole("button", { name: "Change my numbers" })).not.toHaveClass("primary");
    expect(screen.queryByRole("button", { name: COPY.see })).toBeNull();
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Go up to my answer" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Back to tools" })).toBeNull();
  });

  it("Change my numbers goes back to step 1 with every number kept", async () => {
    render(<Page />);
    await walk();
    await change();
    expect(stepText(1)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.amount })).toBeInTheDocument();
    expect(screen.getByLabelText("Amount borrowed")).toHaveValue("$10,000");
    expect(screen.getByLabelText("Amount borrowed")).toHaveFocus();
    await cont();
    expect(screen.getByLabelText("Yearly interest rate")).toHaveValue("6");
    await cont();
    expect(screen.getByLabelText("Months")).toBeChecked();
    expect(screen.getByLabelText(COPY.term.otherLabel)).toHaveValue("36");
  });

  it("changing a number and walking again updates the answer", async () => {
    render(<Page />);
    await walk();
    expect(card()).toHaveTextContent("$304.22");
    await change();
    await fill("Amount borrowed", "$20,000");
    await cont();
    await cont();
    await cont();
    expect(card()).toHaveTextContent("$608.44");
  });

  it("an answer screen with numbers missing shows only the waiting words, no money and no buttons for a result", async () => {
    await resumeAt(3, { amount: "5000" });
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(card()).toHaveTextContent(COPY.waiting);
    expect(card()).not.toHaveTextContent("$");
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
    await walk();
    await showMore();
    for (const name of ["Upfront fees", "Extra each month"]) {
      const box = screen.getByLabelText(name, { exact: false });
      expect(box).toHaveAttribute("inputmode", "decimal");
      expect(box).toHaveAttribute("autocomplete", "off");
    }
  });

  it("keeps fees and extra payments inside the closed More options until it is opened", async () => {
    render(<Page />);
    await walk();
    expect(screen.queryByRole("button", { name: /Add fees or extra payments/ })).toBeNull();
    expect(moreDetails().open).toBe(false);
    expect(moreDetails()).toContainElement(screen.getByLabelText("Upfront fees", { exact: false }));
    expect(moreDetails()).toContainElement(screen.getByLabelText("Extra each month", { exact: false }));
    expect(moreDetails()).toContainElement(screen.getByRole("button", { name: "Start over" }));
    await showMore();
    expect(moreDetails().open).toBe(true);
    expect(screen.getByLabelText("Upfront fees", { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText("Extra each month", { exact: false })).toBeInTheDocument();
  });

  it("leaves More options open with the red note when an optional box has a bad value", async () => {
    render(<Page />);
    await walk();
    expect(moreDetails().open).toBe(false);
    await showMore();
    await fill("Upfront fees", "abc");
    expect(moreDetails().open).toBe(true);
    expect(screen.getByLabelText("Upfront fees", { exact: false })).toHaveAttribute("aria-invalid", "true");
    expect(within(moreDetails()).getByText(/Check this\./)).toBeInTheDocument();
    expect(card()).toHaveTextContent(COPY.waiting);
  });

  it("opens More options by itself when a saved optional box already has a bad value", async () => {
    await resumeAt(3, { amount: "10000", rate: "6", term: "36", fees: "abc" });
    expect(moreDetails().open).toBe(true);
    expect(screen.getByLabelText("Upfront fees", { exact: false })).toHaveAttribute("aria-invalid", "true");
    expect(within(moreDetails()).getByText(/Check this\./)).toBeInTheDocument();
  });

  it("shows the exact answer", async () => {
    render(<Page />);
    await walk("$10,000", "6", { other: "36", unit: "Months" });
    expect(card()).toHaveTextContent("$304.22");
    expect(card()).toHaveTextContent("You pay back $10,951.88 in all.");
    expect(card()).not.toHaveTextContent("of that is interest");
    expect(card()).toHaveTextContent("Total interest$951.88");
    expect(card()).toHaveTextContent("Paid off in3 years");
    expect(lines()).toHaveTextContent("Loan length36 months");
    expect(lines()).toHaveTextContent("Total paid$10,951.88");
    expect(lines()).toHaveTextContent("Total interest$951.88");
    expect(lines()).toHaveTextContent("Cost of borrowing$951.88");
    expect(screen.queryByText("With your extra payment")).toBeNull();
  });

  it("counts a year chip, and shows fees, extra payment savings and the by-year table", async () => {
    render(<Page />);
    await walk("$20,000", "7.25%", { chip: "5 years" });
    await showMore();
    await fill("Upfront fees", "$500");
    await fill("Extra each month", "$100");
    // One schedule everywhere: the card shows the payment with the extra, and the details agree with it.
    expect(card()).toHaveTextContent("$498.39");
    // The card follows the extra payment, so it agrees with the section below, and it names the fees.
    expect(card()).toHaveTextContent("Paid off in47 months");
    expect(card()).toHaveTextContent("You pay back $22,974.16 in all, plus $500.00 in upfront fees. That counts your extra payment.");
    expect(card()).toHaveTextContent("Total interest$2,974.16");
    expect(lines()).toHaveTextContent("Payment without the extra$398.39");
    expect(lines()).toHaveTextContent("Loan length47 months");
    expect(lines()).toHaveTextContent("Total interest$2,974.16");
    expect(lines()).toHaveTextContent("Upfront fees$500.00");
    expect(lines()).toHaveTextContent("Cost of borrowing$3,474.16");
    const extra = screen.getByRole("region", { name: "With your extra payment" });
    expect(extra).toHaveTextContent("Paid off after47 months");
    expect(extra).toHaveTextContent("Months saved13");
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(1 + 4);
    expect(within(table).getAllByRole("row")[4]).toHaveTextContent("$0.00");
  });

  it("keeps fees and extra on the answer screen after Change my numbers and back", async () => {
    render(<Page />);
    await walk("$20,000", "7.25%", { chip: "5 years" });
    await showMore();
    await fill("Upfront fees", "$500");
    await fill("Extra each month", "$100");
    await change();
    await cont();
    await cont();
    await cont();
    expect(card()).toHaveTextContent("$498.39");
    expect(screen.getByLabelText("Upfront fees", { exact: false })).toHaveValue("$500");
    expect(screen.getByLabelText("Extra each month", { exact: false })).toHaveValue("$100");
  });

  it("counts years typed in the Other box the same as the chip", async () => {
    render(<Page />);
    await walk("$20,000", "7.25%", { other: "5", unit: "Years" });
    expect(card()).toHaveTextContent("$398.39");
    expect(lines()).toHaveTextContent("Loan length60 months");
  });

  it("zero interest over a short loan gives a clean payment", async () => {
    render(<Page />);
    await walk("10000", "0", { other: "10", unit: "Months" });
    expect(card()).toHaveTextContent("$1,000.00");
  });

  it("shows a calm error and the waiting words when an optional box has junk, never NaN", async () => {
    render(<Page />);
    await walk();
    await showMore();
    await fill("Upfront fees", "lots");
    expect(screen.getByLabelText("Upfront fees", { exact: false })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(COPY.fixFirst)).toBeInTheDocument();
    expect(card()).toHaveTextContent(COPY.waiting);
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("says it is an estimate, keeps the yearly cost line in the closed words list only, and explains the words", async () => {
    render(<Page />);
    await walk();
    expect(screen.getByText(COPY.notes.estimate)).toBeInTheDocument();
    expect(screen.getAllByText(/The yearly cost of the loan, with some fees/)).toHaveLength(1);
    expect(screen.getByText(/The yearly cost of the loan, with some fees/).closest("details")).not.toBeNull();
    const words = within(screen.getByText(COPY.key.summary).closest("details") as HTMLElement);
    for (const k of COPY.key.items) expect(words.getByText(k.term, { selector: "dt" })).toBeInTheDocument();
  });

  it("offers Print or save once there is an answer, and opens Print and Save a copy", async () => {
    render(<Page />);
    await walk("10000", "0", { other: "10", unit: "Years" });
    expect(card()).toHaveTextContent("$83.33");
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

  it("shows the estimate sentence once, no APR, and a short save preview", async () => {
    render(<Page />);
    await walk();
    const body = document.body.textContent ?? "";
    expect(body.split(COPY.notes.estimate).length - 1).toBe(1);
    await userEvent.click(screen.getByRole("button", { name: "Print or save" }));
    expect(screen.getByRole("group", { name: "Preview" })).toHaveTextContent(COPY.save.preview);
    expect(screen.getByRole("group", { name: "Preview" })).not.toHaveTextContent("$");
    const open = (document.body.textContent ?? "").replace(/What the words mean[\s\S]*$/, "");
    expect(open).not.toMatch(/APR|HOA/);
  });
});

describe("Loan Explainer Start over", () => {
  it("shows Start over only once something is typed, with its undo note, behind More options", async () => {
    render(<Page />);
    await fill("Amount borrowed", "9000");
    // Start over lives on the answer screen, so no question screen has it.
    expect(document.querySelector("details.nt-more")).toBeNull();
    expect(screen.queryByText("You can put your numbers back.")).toBeNull();
    await cont();
    await fill("Yearly interest rate", "6");
    await cont();
    await pickTerm({ chip: "3 years" });
    await cont();
    const details = document.querySelector("details.nt-more") as HTMLDetailsElement;
    expect(details.querySelector("summary")).toHaveTextContent("More options");
    expect(details).toContainElement(screen.getByRole("button", { name: "Start over" }));
    expect(details).toContainElement(screen.getByText("You can put your numbers back."));
  });

  it("asks first, and Clear the boxes stays on the answer screen with the waiting words and the saved copy gone", async () => {
    render(<Page />);
    await walk("$10,000", "6", { chip: "3 years" });
    expect(saved()).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.getByText(/This clears every box/)).toBeInTheDocument();
    expect(card()).toHaveTextContent("$");
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(screen.getByText("Step 4 of 4: your answer")).toBeInTheDocument();
    expect(card()).toHaveTextContent(COPY.waiting);
    expect(card()).not.toHaveTextContent("$");
    expect(screen.getByText(/Your numbers are cleared\./)).toBeInTheDocument();
    expect(window.localStorage.getItem(SAVED_KEY)).toBeNull();
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("Change my numbers after Clear the boxes goes to step 1 with every box empty", async () => {
    render(<Page />);
    await walk("$10,000", "6", { chip: "3 years" });
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    await change();
    expect(stepText(1)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.amount })).toBeInTheDocument();
    expect(screen.getByLabelText("Amount borrowed")).toHaveValue("");
    await cont();
    expect(screen.getByText(COPY.steps.amountMissing)).toBeInTheDocument();
    await fill("Amount borrowed", "5");
    await cont();
    expect(screen.getByLabelText("Yearly interest rate")).toHaveValue("");
    await fill("Yearly interest rate", "5");
    await cont();
    for (const r of screen.getAllByRole("radio")) expect(r).not.toBeChecked();
  });

  it("Clear the boxes also closes Other and the fees section", async () => {
    render(<Page />);
    await walk("$10,000", "6", { other: "36", unit: "Months" });
    await showMore();
    await fill("Upfront fees", "$100");
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    expect(screen.queryByLabelText("Upfront fees", { exact: false })).toBeNull();
    expect(screen.queryByLabelText("Extra each month", { exact: false })).toBeNull();
    expect(screen.queryByText("More options")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Put it back" }));
    expect(moreDetails().open).toBe(false);
    expect(screen.getByLabelText("Upfront fees", { exact: false })).toHaveValue("$100");
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    await change();
    await fill("Amount borrowed", "5");
    await cont();
    await fill("Yearly interest rate", "5");
    await cont();
    expect(screen.queryByLabelText(COPY.term.otherLabel)).toBeNull();
    for (const r of screen.getAllByRole("radio")) expect(r).not.toBeChecked();
  });

  it("keeps the numbers when asked to", async () => {
    render(<Page />);
    await walk("55", "6", { chip: "2 years" });
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Keep my numbers" }));
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(card()).not.toHaveTextContent(COPY.waiting);
    await change();
    expect(screen.getByLabelText("Amount borrowed")).toHaveValue("55");
  });

  it("clears the boxes and the saved copy, then puts the numbers and the answer back", async () => {
    render(<Page />);
    await walk("1234", "6", { chip: "2 years" });
    const before = card().textContent;
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    expect(window.localStorage.getItem(SAVED_KEY)).toBeNull();
    expect(screen.getByText(/Your numbers are cleared\./)).toBeInTheDocument();
    expect(card()).toHaveTextContent(COPY.waiting);
    await userEvent.click(screen.getByRole("button", { name: "Put it back" }));
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(card().textContent).toBe(before);
    expect(card()).not.toHaveTextContent(COPY.waiting);
    expect(screen.queryByText(/Your numbers are cleared\./)).toBeNull();
    expect(saved().value.amount).toBe("1234");
    await change();
    expect(screen.getByLabelText("Amount borrowed")).toHaveValue("1234");
  });
});

describe("Loan Explainer autosave and resume", () => {
  it("saves the numbers and the step as the person moves", async () => {
    render(<Page />);
    await fill("Amount borrowed", "1200");
    expect(saved().step).toBe(0);
    expect(saved().value.amount).toBe("1200");
    await cont();
    expect(saved().step).toBe(1);
    await fill("Yearly interest rate", "6");
    await cont();
    expect(saved().step).toBe(2);
    await pickTerm({ chip: "3 years" });
    await cont();
    expect(saved().step).toBe(3);
    expect(saved().value).toMatchObject({ amount: "1200", rate: "6", term: "3", termUnit: "years" });
  });

  it("saves the value and the step together when the person taps Change my numbers", async () => {
    render(<Page />);
    await walk();
    expect(saved().step).toBe(3);
    await change();
    expect(saved().step).toBe(0);
    expect(saved().value).toMatchObject({ amount: "$10,000", rate: "6", term: "36" });
  });

  it("shows a separate resume screen instead of step 1 when a saved copy exists and the boxes are blank", async () => {
    const first = render(<Page />);
    await fill("Amount borrowed", "1200");
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
    expect(screen.queryByRole("heading", { name: COPY.steps.amount })).toBeNull();
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("shows no resume screen when nothing is saved", () => {
    render(<Page />);
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
    expect(screen.queryByRole("button", { name: COPY.resume.yes })).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.amount })).toBeInTheDocument();
  });

  it("Use them brings the numbers back and leaves the resume screen", async () => {
    const first = render(<Page />);
    await fill("Amount borrowed", "1200");
    first.unmount();
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
    expect(screen.getByLabelText("Amount borrowed", { exact: false })).toHaveValue("1200");
  });

  it("brings back the step too, so the person lands where they left off", async () => {
    const first = render(<Page />);
    await fill("Amount borrowed", "1200");
    await cont();
    await fill("Yearly interest rate", "6");
    first.unmount();
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: COPY.resume.title })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.rate })).toBeInTheDocument();
    expect(screen.getByLabelText("Yearly interest rate")).toHaveValue("6");
    // A restore changes the step, so the cursor lands in that step's first box.
    expect(screen.getByLabelText("Yearly interest rate")).toHaveFocus();
    await back();
    expect(screen.getByLabelText("Amount borrowed", { exact: false })).toHaveValue("1200");
  });

  it("brings back the answer screen when the person left on it", async () => {
    const first = render(<Page />);
    await walk();
    first.unmount();
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: COPY.resume.title })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(card()).toHaveTextContent("$304.22");
  });

  it("No thanks clears the saved copy and shows step 1 with blank boxes", async () => {
    const first = render(<Page />);
    await fill("Amount borrowed", "1200");
    first.unmount();
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.no }));
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
    expect(window.localStorage.getItem(SAVED_KEY)).toBeNull();
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.amount })).toBeInTheDocument();
    expect(screen.getByLabelText("Amount borrowed", { exact: false })).toHaveValue("");
    await cont();
    expect(screen.getByText(COPY.steps.amountMissing)).toBeInTheDocument();
  });

  it("does not bring the resume screen back while the person types after No thanks", async () => {
    const first = render(<Page />);
    await fill("Amount borrowed", "1200");
    first.unmount();
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.no }));
    await fill("Amount borrowed", "7");
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
    expect(screen.getByLabelText("Amount borrowed", { exact: false })).toHaveValue("7");
    await cont();
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
  });
});

describe("Loan Explainer answer basis and finish line", () => {
  const basis = () => card().querySelector(".nt-result-basis") as HTMLElement;

  it("starts the answer card with a basis line that repeats the typed numbers", async () => {
    render(<Page />);
    await walk("$12,000", "6.5", { chip: "3 years" });
    expect(basis()).toHaveTextContent("For $12,000 at 6.5% for 3 years.");
    const body = card().querySelector(".nt-result-body") as HTMLElement;
    expect(body.firstElementChild).toBe(basis());
  });

  it("drops .00 from whole dollars but keeps real cents, and says months when the length is not whole years", async () => {
    render(<Page />);
    await walk("$12,000.50", "6", { other: "30", unit: "Months" });
    expect(basis()).toHaveTextContent("For $12,000.50 at 6% for 30 months.");
  });

  it("follows the numbers when they change", async () => {
    render(<Page />);
    await walk("$12,000", "6.5", { chip: "3 years" });
    await change();
    await fill("Amount borrowed", "$8,000");
    await cont();
    await cont();
    await cont();
    expect(basis()).toHaveTextContent("For $8,000 at 6.5% for 3 years.");
  });

  it("has no basis line while the card is waiting", async () => {
    await resumeAt(3, { amount: "5000" });
    expect(card().querySelector(".nt-result-basis")).toBeNull();
  });

  it("ends the answer with the short finish line", async () => {
    render(<Page />);
    await walk();
    expect(screen.getByText("That is your estimate. You can stop here.")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/or change a number to try again/);
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
