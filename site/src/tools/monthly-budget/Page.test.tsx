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
  const box = screen.getByLabelText(label);
  await userEvent.clear(box);
  if (text) await userEvent.type(box, text);
}

const cont = () => userEvent.click(screen.getByRole("button", { name: "Continue" }));
const see = () => userEvent.click(screen.getByRole("button", { name: COPY.see }));
const back = () => userEvent.click(screen.getByRole("button", { name: "Back" }));
const changeMine = () => userEvent.click(screen.getByRole("button", { name: "Change my numbers" }));
const card = () => screen.getByLabelText("Left over each month");
const where = () => screen.getByRole("region", { name: "Where it goes" });

const SPENDING = ["Rent or mortgage", "Food", "Bills", "Transport", "Other"];

/** Step 1 (money in): types each amount named, then Continue. Lands on step 2. */
async function income(amounts: Record<string, string> = {}) {
  for (const [name, text] of Object.entries(amounts)) await fill(`${name}, per month`, text);
  await cont();
}

/** Step 2 (money out): types each amount named, then the last button. Lands on the answer screen. */
async function spending(amounts: Record<string, string> = {}) {
  for (const [name, text] of Object.entries(amounts)) await fill(`${name}, per month`, text);
  await see();
}

/** Walks both steps the way a person does, from step 1 to the answer screen. */
async function walk(inc: Record<string, string>, out: Record<string, string> = {}) {
  await income(inc);
  await spending(out);
}

const PLAIN_IN = { Pay: "3000" };
const PLAIN_OUT = { "Rent or mortgage": "1200", Food: "450", Bills: "300", Transport: "250", Other: "100" };
const fillPlain = () => walk(PLAIN_IN, PLAIN_OUT);

/** Writes a saved copy the way the page does, so "Use them" has something to bring back. */
function seed(step: number, value: unknown) {
  window.localStorage.setItem("nt:flow:monthly-budget", JSON.stringify({ v: 1, step, at: new Date().toISOString(), value }));
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

describe("Monthly Budget steps", () => {
  it("opens on step 1 with its question as the h1, the trust line and Back to tools", () => {
    const { container } = render(<Page />);
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.income })).toBeInTheDocument();
    expect(screen.getByText(COPY.title)).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Step 1 of 3 progress" })).toHaveAttribute("value", "1");
    expect(screen.getByRole("progressbar", { name: "Step 1 of 3 progress" })).toHaveAttribute("max", "3");
    expect(screen.getByRole("link", { name: "How this page handles your numbers" }).closest(".nt-tool-trust")).not.toBeNull();
    expect(screen.getByRole("link", { name: "How this page handles your numbers" })).toHaveAttribute("href", "#/private");
    expect(screen.getByRole("link", { name: "Back to tools" })).toHaveAttribute("href", "#/");
    expect(screen.queryByText(/There is no Send button/)).toBeNull();
    expect(screen.getByLabelText("Pay, per month")).toHaveValue("");
    // One income line shows one money box and one quiet button, not the whole list.
    expect(screen.getByRole("button", { name: COPY.oneIncome.add })).toBeInTheDocument();
    expect(screen.getByText(COPY.oneIncome.hint)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add an income item" })).toBeNull();
    // Money out and the answer wait on later screens.
    for (const n of SPENDING) expect(screen.queryByLabelText(`${n}, per month`)).toBeNull();
    expect(screen.queryByLabelText("Left over each month")).toBeNull();
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Change my numbers" })).toBeNull();
    expect(screen.queryByText(COPY.removeNote)).toBeNull();
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Continue" })).toHaveClass("primary");
    expect(screen.queryByRole("button", { name: "Type my own numbers" })).toBeNull();
    expect(screen.queryByText(/example/i)).toBeNull();
    expect(screen.queryByText(/NaN|undefined|Infinity/)).toBeNull();
  });

  it("puts the cursor nowhere on load", () => {
    render(<Page />);
    expect(document.body).toHaveFocus();
  });

  it("gives the same accessible names to name boxes, amount boxes and remove buttons on each step", async () => {
    render(<Page />);
    // With one income line, step 1 has just the amount box, named the same way.
    expect(screen.getByLabelText("Pay, per month")).toBeInTheDocument();
    expect(screen.queryByLabelText("Name of income item 1")).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove Pay" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: COPY.oneIncome.add }));
    expect(screen.getByLabelText("Name of income item 1")).toHaveValue("Pay");
    expect(screen.getByLabelText("Pay, per month")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Pay" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name of income item 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Income item 2" })).toBeInTheDocument();
    await cont();
    expect(screen.getByLabelText("Name of spending item 5")).toBeInTheDocument();
    for (const n of SPENDING) expect(screen.getByRole("button", { name: `Remove ${n}` })).toBeInTheDocument();
    expect(screen.queryByText("Remove")).toBeNull();
  });

  it("has decimal keypads and no autofill on amounts on each step", async () => {
    render(<Page />);
    const pay = screen.getByLabelText("Pay, per month");
    expect(pay).toHaveAttribute("inputmode", "decimal");
    expect(pay).toHaveAttribute("autocomplete", "off");
    await cont();
    const food = screen.getByLabelText("Food, per month");
    expect(food).toHaveAttribute("inputmode", "decimal");
    expect(food).toHaveAttribute("autocomplete", "off");
  });

  it("Continue with a clean step 1 moves to step 2 with the cursor in its first box", async () => {
    const { container } = render(<Page />);
    await cont();
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.spending })).toBeInTheDocument();
    expect(screen.getByLabelText("Name of spending item 1")).toHaveFocus();
    expect(screen.queryByRole("link", { name: "How this page handles your numbers" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Back to tools" })).toBeNull();
    expect(screen.queryByLabelText("Pay, per month")).toBeNull();
    for (const n of SPENDING) expect(screen.getByLabelText(`${n}, per month`)).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
    expect(screen.getByRole("button", { name: COPY.see })).toHaveClass("primary");
  });

  it("Continue with a bad amount stays on step 1, says what to fix and puts the cursor in that box", async () => {
    render(<Page />);
    await fill("Pay, per month", "lots");
    expect(screen.getByLabelText("Pay, per month")).toHaveAttribute("aria-invalid", "true");
    await cont();
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(COPY.steps.fixMissing);
    expect(screen.getByLabelText("Pay, per month")).toHaveFocus();
    expect(screen.queryByLabelText("Left over each month")).toBeNull();
    expect(screen.queryByRole("link", { name: "I'm done" })).toBeNull();
    await fill("Pay, per month", "3000");
    await cont();
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
  });

  it("Continue with a bad amount on step 2 stays there, shows a calm error that names the line, never NaN", async () => {
    render(<Page />);
    await income({ Pay: "3000" });
    await fill("Food, per month", "lots");
    expect(screen.getByText(/Food: use a dollar amount/)).toBeInTheDocument();
    expect(screen.getByLabelText("Food, per month")).toHaveAttribute("aria-invalid", "true");
    await see();
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(COPY.steps.fixMissing);
    expect(screen.queryByLabelText("Left over each month")).toBeNull();
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("Continue with a bad amount lower on the step puts the cursor in that box, not the first one", async () => {
    render(<Page />);
    await income({ Pay: "3000" });
    await fill("Food, per month", "lots");
    await see();
    expect(screen.getByLabelText("Food, per month")).toHaveFocus();
  });

  it("Back on step 2 returns to step 1 with the typed amount kept", async () => {
    render(<Page />);
    await income({ Pay: "3000" });
    await back();
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.income })).toBeInTheDocument();
    expect(screen.getByLabelText("Pay, per month")).toHaveValue("3000");
  });

  it("shows the remove note at the end of each step with Remove buttons, even with nothing typed, and not on the answer screen", async () => {
    render(<Page />);
    // The one-box income screen has no Remove buttons, so it has no note about them.
    expect(screen.queryByText(COPY.removeNote)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: COPY.oneIncome.add }));
    for (const step of [1, 2]) {
      const note = screen.getByText(COPY.removeNote);
      expect(note).toBeVisible();
      expect(note.closest("details")).toBeNull();
      const body = note.parentElement as HTMLElement;
      expect(body).toHaveClass("nt-flow-body");
      expect(body.lastElementChild).toBe(note);
      expect(note.textContent).toBe("Remove asks first. You can put it back.");
      expect(note.textContent).not.toMatch(/\u2013|\u2014/);
      expect(screen.getAllByText(COPY.removeNote)).toHaveLength(1);
      if (step === 1) await cont();
    }
    await see();
    expect(screen.queryByText(COPY.removeNote)).toBeNull();
  });

  it("the last button shows the answer screen with the question as the h1, and its own step count", async () => {
    render(<Page />);
    await fillPlain();
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(screen.getByText(COPY.title)).toBeInTheDocument();
    expect(screen.getByText("Step 3 of 3: your answer")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Step 3 of 3 progress" })).toHaveAttribute("value", "3");
    expect(screen.getByRole("progressbar", { name: "Step 3 of 3 progress" })).toHaveAttribute("max", "3");
    expect(screen.getByText("That is your answer. You can stop here.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Food, per month")).toBeNull();
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    expect(screen.queryByRole("button", { name: COPY.see })).toBeNull();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    expect(card()).toHaveAttribute("id", "nt-answer");
    expect(card()).toHaveAttribute("tabindex", "-1");
    expect(card()).toHaveTextContent("$700.00");
  });

  it("Change my numbers goes back to step 1 with every amount kept", async () => {
    render(<Page />);
    await fillPlain();
    await changeMine();
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.income })).toBeInTheDocument();
    expect(screen.getByLabelText("Pay, per month")).toHaveValue("3000");
    await cont();
    expect(screen.getByLabelText("Food, per month")).toHaveValue("450");
  });
});

describe("Monthly Budget answers", () => {
  it("shows only the waiting words when nothing is typed, with no Print or Start over", async () => {
    const { container } = render(<Page />);
    await walk({});
    expect(card()).toHaveTextContent(/^Type your pay to start\.$/);
    expect(COPY.waiting).toBe("Type your pay to start.");
    expect(card().querySelector(".nt-result-label")).toBeNull();
    expect(container.querySelector(".nt-result-tag")).toBeNull();
    expect(card()).toHaveAttribute("id", "nt-answer");
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
    expect(container.querySelector("details.nt-more")).toBeNull();
    expect(screen.queryByText(COPY.fixFirst)).toBeNull();
    expect(screen.queryByText(/NaN|undefined|Infinity/)).toBeNull();
  });

  it("shows the waiting line again after every amount is cleared and the steps are walked again", async () => {
    const { container } = render(<Page />);
    await fillPlain();
    expect(card()).toHaveTextContent("$700.00");
    await changeMine();
    await income({ Pay: "" });
    await spending(Object.fromEntries(SPENDING.map((n) => [n, ""])));
    expect(card()).toHaveTextContent(/^Type your pay to start\.$/);
    expect(card().querySelector(".nt-result-label")).toBeNull();
    expect(container.querySelector(".nt-result-tag")).toBeNull();
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    expect(screen.queryByText(/NaN|undefined|Infinity/)).toBeNull();
  });

  it("shows each bar percent once", async () => {
    render(<Page />);
    await walk({ Pay: "1000" }, { Food: "250" });
    expect(screen.getAllByText(/25.0% of income/)).toHaveLength(1);
    expect(screen.queryByText(/Each bar is as wide/)).toBeNull();
  });

  it("shows exact totals, left over and percents", async () => {
    render(<Page />);
    await fillPlain();
    expect(card()).toHaveTextContent("$700.00");
    expect(card()).toHaveTextContent("Total income$3,000.00");
    expect(card()).toHaveTextContent("Total spending$2,300.00");
    expect(where()).toHaveTextContent("Rent or mortgage$1,200.00, 40.0% of income");
    expect(where()).toHaveTextContent("Food$450.00, 15.0% of income");
    expect(where()).toHaveTextContent("Bills$300.00, 10.0% of income");
    expect(where()).toHaveTextContent("Transport$250.00, 8.3% of income");
    expect(where()).toHaveTextContent("Other$100.00, 3.3% of income");
  });

  it("shows one decimal worked from the amounts, so $250 of $3,000 is 8.3%", async () => {
    render(<Page />);
    await walk({ Pay: "3000" }, { Transport: "250" });
    expect(where()).toHaveTextContent("Transport$250.00, 8.3% of income");
  });

  it("draws a bar as wide as the percent", async () => {
    const { container } = render(<Page />);
    await fillPlain();
    const fills = Array.from(container.querySelectorAll<HTMLElement>(".nt-budget-bar-fill")).map((e) => e.style.width);
    const widths = fills.map((w) => Math.round(parseFloat(w) * 10) / 10);
    expect(widths).toEqual([40, 15, 10, 8.3, 3.3]);
  });

  it("shows a negative left over plainly", async () => {
    render(<Page />);
    await walk({ Pay: "1000" }, { "Rent or mortgage": "1100" });
    expect(card()).toHaveTextContent("-$100.00");
    expect(card()).toHaveTextContent("More goes out than comes in. The gap is $100.00.");
  });

  it("with no income, shows the totals and shares of spending", async () => {
    render(<Page />);
    await walk({}, { "Rent or mortgage": "700", Food: "300" });
    expect(card()).toHaveTextContent("-$1,000.00");
    expect(where()).toHaveTextContent("70.0% of spending");
    expect(where()).toHaveTextContent("30.0% of spending");
    expect(where()).toHaveTextContent(COPY.where.noIncome);
  });

  it("lists every line with both percents under See all the numbers", async () => {
    render(<Page />);
    await fillPlain();
    await userEvent.click(screen.getByText(COPY.more.summary));
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(1 + 5);
    expect(within(table).getAllByRole("row")[1]).toHaveTextContent("Rent or mortgage$1,200.0040.0%52.2%");
    expect(screen.getByText(/Percent of income spent: 76.7%/)).toBeInTheDocument();
  });

  it("shows the calm error and the waiting words, not an answer, when saved numbers have a bad amount", async () => {
    seed(2, {
      next: 20,
      income: [{ id: "i1", name: "Pay", amount: "3000" }],
      expenses: [{ id: "e1", name: "Food", amount: "lots" }],
    });
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.getByText(COPY.fixFirst)).toBeInTheDocument();
    expect(card()).toHaveTextContent(COPY.waiting);
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("with an answer, Done is the one filled link, Print or save is an outline that opens the sheet, and the step buttons are gone", async () => {
    const { container } = render(<Page />);
    await walk({ Pay: "3000" }, { Food: "450" });
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
    const done = screen.getByRole("link", { name: "I'm done" });
    expect(done).toHaveClass("primary");
    expect(done).toHaveAttribute("href", "#/");
    const main = screen.getByRole("button", { name: "Print or save" });
    expect(main).toHaveClass("nt-finish-save");
    expect(main).not.toHaveClass("primary");
    expect(screen.queryByRole("button", { name: "See what is left over" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Go up to my answer" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Print" })).toBeNull();
    await userEvent.click(main);
    expect(main).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Print" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Save a copy" })).toBeEnabled();
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
  });

  it("hands the one filled button back from Done to Continue when the person changes their numbers", async () => {
    const { container } = render(<Page />);
    await walk({ Pay: "3000" }, { Food: "450" });
    expect(screen.getByRole("link", { name: "I'm done" })).toHaveClass("primary");
    await changeMine();
    expect(screen.queryByRole("link", { name: "I'm done" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Continue" })).toHaveClass("primary");
  });

  it("shows Print or save only once there is an answer", async () => {
    render(<Page />);
    await fill("Pay, per month", "lots");
    await cont();
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    await fill("Pay, per month", "");
    await income();
    await spending();
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    await changeMine();
    await walk({ Pay: "3000" });
    expect(screen.getByRole("button", { name: "Print or save" })).toBeInTheDocument();
    await changeMine();
    await walk({ Pay: "" });
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    await changeMine();
    await fillPlain();
    expect(screen.getByRole("button", { name: "Print or save" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Print or save" }));
    expect(screen.getByRole("button", { name: "Save a copy" })).toBeEnabled();
  });
});

describe("Monthly Budget lines", () => {
  it("adds a line, names it, and removes it, asking first", async () => {
    render(<Page />);
    await income({ Pay: "1000" });
    await userEvent.click(screen.getByRole("button", { name: "Add a spending item" }));
    await fill("Name of spending item 6", "Phone");
    await fill("Phone, per month", "$40.50");
    await see();
    expect(where()).toHaveTextContent("Phone$40.50, 4.1% of income");
    await changeMine();
    await cont();
    await userEvent.click(screen.getByRole("button", { name: "Remove Phone" }));
    expect(screen.getByRole("group", { name: "Before you remove" })).toHaveTextContent("Phone, $40.50");
    await userEvent.click(screen.getByRole("button", { name: "Keep it" }));
    expect(screen.getByLabelText("Phone, per month")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove Phone" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, remove it" }));
    expect(screen.queryByLabelText("Phone, per month")).toBeNull();
    await see();
    expect(screen.queryByRole("region", { name: "Where it goes" })).toBeNull();
  });

  it("shows one money box with no name box, no Remove button and no list headings while there is one income line", () => {
    render(<Page />);
    const pay = screen.getByLabelText("Pay, per month");
    expect(pay).toHaveAttribute("inputmode", "decimal");
    expect(screen.getByText(COPY.oneIncome.hint)).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(screen.queryByLabelText(/Name of income item/)).toBeNull();
    expect(screen.queryByRole("button", { name: /^Remove/ })).toBeNull();
    expect(screen.queryByText(COPY.columns.name)).toBeNull();
    expect(screen.queryByText(COPY.columns.amount)).toBeNull();
    expect(screen.queryByText(COPY.removeNote)).toBeNull();
    expect(screen.queryByRole("button", { name: "Add an income item" })).toBeNull();
  });

  it("Add other money that comes in shows two income lines with Remove buttons and the full list", async () => {
    render(<Page />);
    await fill("Pay, per month", "3000");
    await userEvent.click(screen.getByRole("button", { name: COPY.oneIncome.add }));
    expect(screen.queryByRole("button", { name: COPY.oneIncome.add })).toBeNull();
    expect(screen.getAllByRole("textbox")).toHaveLength(4);
    expect(screen.getByLabelText("Name of income item 1")).toHaveValue("Pay");
    expect(screen.getByLabelText("Name of income item 2")).toHaveValue("");
    expect(screen.getByLabelText("Pay, per month")).toHaveValue("3000");
    expect(screen.getByRole("button", { name: "Remove Pay" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Income item 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add an income item" })).toBeInTheDocument();
    expect(screen.getByText(COPY.columns.name)).toBeInTheDocument();
    expect(screen.getByText(COPY.columns.amount)).toBeInTheDocument();
    expect(screen.getByText(COPY.removeNote)).toBeInTheDocument();
  });

  it("adds and removes an income line on step 1", async () => {
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.oneIncome.add }));
    await fill("Name of income item 2", "Gift");
    await fill("Gift, per month", "50");
    await userEvent.click(screen.getByRole("button", { name: "Remove Gift" }));
    expect(screen.getByRole("group", { name: "Before you remove" })).toHaveTextContent("Gift, $50");
    await userEvent.click(screen.getByRole("button", { name: "Yes, remove it" }));
    expect(screen.queryByLabelText("Gift, per month")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: COPY.undo }));
    expect(screen.getByLabelText("Gift, per month")).toHaveValue("50");
  });

  it("puts a removed line back with its words and amount", async () => {
    render(<Page />);
    await income();
    await fill("Food, per month", "450");
    await userEvent.click(screen.getByRole("button", { name: "Remove Food" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, remove it" }));
    expect(screen.queryByLabelText("Food, per month")).toBeNull();
    expect(screen.getByText(COPY.undoHelp)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.undo }));
    expect(screen.getByLabelText("Food, per month")).toHaveValue("450");
    expect(screen.queryByRole("button", { name: COPY.undo })).toBeNull();
  });
});

describe("Monthly Budget saved numbers", () => {
  it("shows the resume screen instead of step 1 and brings the numbers back", async () => {
    const first = render(<Page />);
    await fill("Pay, per month", "1200");
    first.unmount();
    const { container } = render(<Page />);
    expectResumeScreen(container);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(screen.getByLabelText("Pay, per month")).toHaveValue("1200");
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
  });

  it("shows step 1, not the resume screen, when nothing is saved", () => {
    render(<Page />);
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
  });

  it("Use them brings back the step the person was on", async () => {
    const first = render(<Page />);
    await income({ Pay: "3000" });
    await fill("Food, per month", "450");
    first.unmount();
    const { container } = render(<Page />);
    expectResumeScreen(container);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
    expect(screen.getByLabelText("Food, per month")).toHaveValue("450");
  });

  it("Use them brings back the answer screen when that is where the person was", async () => {
    const first = render(<Page />);
    await fillPlain();
    first.unmount();
    const { container } = render(<Page />);
    expectResumeScreen(container);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.queryByRole("heading", { level: 1, name: COPY.resume.title })).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(card()).toHaveTextContent("$700.00");
  });

  it("keeps the boxes blank and shows step 1 when the person says No thanks to saved ones", async () => {
    const first = render(<Page />);
    await fill("Pay, per month", "1200");
    first.unmount();
    const { container } = render(<Page />);
    expectResumeScreen(container);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.no }));
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
    expect(window.localStorage.getItem("nt:flow:monthly-budget")).toBeNull();
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.income })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "How this page handles your numbers" })).toBeInTheDocument();
    expect(screen.getByLabelText("Pay, per month")).toHaveValue("");
  });

  it("does not bring the resume screen back after Use them, Back or Change my numbers", async () => {
    const first = render(<Page />);
    await fillPlain();
    first.unmount();
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    await changeMine();
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    await cont();
    await back();
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
  });

  it("survives damaged saved data", async () => {
    seed(0, { income: 5, expenses: "x" });
    const { container } = render(<Page />);
    expectResumeScreen(container);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.queryByText(/NaN|undefined/)).toBeNull();
    expect(screen.getByRole("button", { name: "Add an income item" })).toBeInTheDocument();
    await cont();
    expect(screen.getByRole("button", { name: "Add a spending item" })).toBeInTheDocument();
    expect(screen.queryByText(/NaN|undefined/)).toBeNull();
  });
});

describe("Monthly Budget copy", () => {
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
    expect(strings.join(" ")).not.toMatch(/\byou should\b|\bwe recommend\b|\btry to\b|\bcut back\b|\bsave more\b/i);
  });
});

describe("monthly-budget Start over", () => {
  it("is not on the step screens, and is hidden until something is typed", async () => {
    const { container } = render(<Page />);
    await fill("Pay, per month", "1");
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
    expect(container.querySelector("details.nt-more")).toBeNull();
  });

  it("keeps a quiet Start over inside More options, with its default undo note, on the answer screen once anything is typed", async () => {
    const { container } = render(<Page />);
    await walk({ Pay: "3000" });
    const more = container.querySelector("details.nt-more") as HTMLDetailsElement;
    expect(more).not.toBeNull();
    expect(more.querySelector("summary")).toHaveTextContent("More options");
    await userEvent.click(screen.getByText("More options"));
    const start = screen.getByRole("button", { name: "Start over" });
    expect(more).toContainElement(start);
    const note = screen.getByText("You can put your numbers back.");
    expect(more).toContainElement(note);
    expect("startOverNote" in COPY).toBe(false);
  });

  it("asks first, and Keep my numbers leaves everything as it was", async () => {
    render(<Page />);
    await walk({ Pay: "1234" });
    expect(window.localStorage.getItem("nt:flow:monthly-budget")).not.toBeNull();
    await userEvent.click(screen.getByText("More options"));
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.getByRole("status")).toHaveTextContent("This clears every box. You can put your numbers back right after.");
    await userEvent.click(screen.getByRole("button", { name: "Keep my numbers" }));
    expect(card()).toHaveTextContent("$1,234.00");
    expect(window.localStorage.getItem("nt:flow:monthly-budget")).not.toBeNull();
  });

  it("Clear the boxes stays on the answer screen with the waiting words, and Put it back restores the numbers and the answer", async () => {
    render(<Page />);
    await walk({ Pay: "1234" }, { Food: "34" });
    expect(card()).toHaveTextContent("$1,200.00");
    await userEvent.click(screen.getByText("More options"));
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    expect(window.localStorage.getItem("nt:flow:monthly-budget")).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(screen.getByText("Step 3 of 3: your answer")).toBeInTheDocument();
    expect(card()).toHaveTextContent(/^Type your pay to start\.$/);
    expect(card().querySelector(".nt-result-label")).toBeNull();
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    expect(screen.queryByRole("link", { name: "I'm done" })).toBeNull();
    expect(screen.getByText(/Your numbers are cleared\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Put it back" }));
    expect(card()).toHaveTextContent("$1,200.00");
    expect(where()).toHaveTextContent("Food$34.00");
    expect(screen.getByRole("button", { name: "Print or save" })).toBeInTheDocument();
    expect(window.localStorage.getItem("nt:flow:monthly-budget")).not.toBeNull();
    expect(screen.queryByText(/Your numbers are cleared\./)).toBeNull();
  });

  it("Change my numbers after Clear the boxes goes to step 1 with every amount empty", async () => {
    render(<Page />);
    await walk({ Pay: "1234" }, { Food: "34" });
    await userEvent.click(screen.getByText("More options"));
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    await changeMine();
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.income })).toBeInTheDocument();
    expect(screen.getByLabelText("Pay, per month")).toHaveValue("");
    await cont();
    expect(screen.getByLabelText("Food, per month")).toHaveValue("");
  });
});
