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
  const box = screen.getByLabelText(label);
  await userEvent.clear(box);
  if (text) await userEvent.type(box, text);
}

const LINES = ["Pay", "Rent or mortgage", "Food", "Bills", "Transport", "Other"];

/** The page opens with example numbers. This empties every amount box. */
async function blank() {
  for (const n of LINES) await fill(`${n}, per month`, "");
}

async function fillPlain() {
  await fill("Pay, per month", "3000");
  await fill("Rent or mortgage, per month", "1200");
  await fill("Food, per month", "450");
  await fill("Bills, per month", "300");
  await fill("Transport, per month", "250");
  await fill("Other, per month", "100");
}

describe("Monthly Budget page", () => {
  it("opens with the names kept, the amounts blank and only the waiting words for an answer", () => {
    const { container } = render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(screen.getByText(COPY.title)).toBeInTheDocument();
    for (const n of LINES) expect(screen.getByLabelText(`${n}, per month`)).toHaveValue("");
    const card = screen.getByLabelText("Left over each month");
    expect(COPY.waiting).toBe("Type your pay to start.");
    expect(card).toHaveTextContent(/^Type your pay to start\.$/);
    expect(card.querySelector(".nt-result-label")).toBeNull();
    expect(card).toHaveAttribute("id", "nt-answer");
    expect(card).toHaveAttribute("tabindex", "-1");
    expect(container.querySelector(".nt-result-tag")).toBeNull();
    expect(screen.queryByText(/example/i)).toBeNull();
    expect(screen.queryByRole("button", { name: "Type my own numbers" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    expect(screen.queryByText(/Step \d of \d/)).toBeNull();
    expect(screen.queryByText(/NaN|undefined|Infinity/)).toBeNull();
  });

  it("says it is free and sends nothing, and links the code", () => {
    render(<Page />);
    expect(screen.getByText(/Your numbers stay on this phone or computer\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "How we know" })).toHaveAttribute("href", "#/private");
  });

  it("shows a calm waiting line again once every amount is cleared", async () => {
    const { container } = render(<Page />);
    await fillPlain();
    expect(screen.getByLabelText("Left over each month")).toHaveTextContent("$700.00");
    await blank();
    const card = screen.getByLabelText("Left over each month");
    expect(card).toHaveTextContent(/^Type your pay to start\.$/);
    expect(card.querySelector(".nt-result-label")).toBeNull();
    expect(container.querySelector(".nt-result-tag")).toBeNull();
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
    expect(screen.queryByText(/NaN|undefined|Infinity/)).toBeNull();
  });

  it("gives the same accessible names to name boxes, amount boxes and remove buttons", () => {
    render(<Page />);
    expect(screen.getByLabelText("Name of income item 1")).toHaveValue("Pay");
    expect(screen.getByLabelText("Name of spending item 5")).toBeInTheDocument();
    for (const n of LINES) expect(screen.getByRole("button", { name: `Remove ${n}` })).toBeInTheDocument();
    expect(screen.queryByText("Remove")).toBeNull();
  });

  it("puts the cursor nowhere on load", () => {
    render(<Page />);
    expect(document.body).toHaveFocus();
  });

  it("shows each bar percent once", async () => {
    render(<Page />);
    await blank();
    await fill("Pay, per month", "1000");
    await fill("Food, per month", "250");
    expect(screen.getAllByText(/25.0% of income/)).toHaveLength(1);
    expect(screen.queryByText(/Each bar is as wide/)).toBeNull();
  });

  it("has one filled button while there is no answer: See what is left over, which puts the cursor in the first empty amount", async () => {
    const { container } = render(<Page />);
    expect(screen.queryByRole("button", { name: "Show my answer" })).toBeNull();
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
    const see = screen.getByRole("button", { name: COPY.see });
    expect(see).toHaveClass("primary");
    await userEvent.click(see);
    expect(screen.getByLabelText("Pay, per month")).toHaveFocus();
    await fill("Pay, per month", "lots");
    await userEvent.click(see);
    expect(screen.getByLabelText("Rent or mortgage, per month")).toHaveFocus();
    expect(screen.queryByRole("link", { name: "I'm done" })).toBeNull();
  });

  it("with an answer, Done is the one filled link, Print or save is an outline that opens the sheet, and the See button is gone", async () => {
    const { container } = render(<Page />);
    await fill("Pay, per month", "3000");
    await fill("Food, per month", "450");
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

  it("keeps a quiet Start over inside More options, with its default undo note, as soon as anything is typed", async () => {
    const { container } = render(<Page />);
    await blank();
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
    expect(container.querySelector("details.nt-more")).toBeNull();
    await fill("Pay, per month", "lots");
    expect(screen.getByLabelText("Left over each month")).toHaveTextContent(COPY.waiting);
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

  it("shows the remove note at the end of the form even with nothing typed", async () => {
    const { container } = render(<Page />);
    await blank();
    const note = screen.getByText(COPY.removeNote);
    expect(note).toBeVisible();
    expect(note.closest("details")).toBeNull();
    const form = container.querySelector("form") as HTMLFormElement;
    expect(form.lastElementChild).toBe(note);
    expect(note.textContent).toBe("Remove asks first, and you can put the line back.");
    expect(note.textContent).not.toMatch(/\u2013|\u2014/);
  });

  it("has decimal keypads and no autofill on amounts", () => {
    render(<Page />);
    const box = screen.getByLabelText("Food, per month");
    expect(box).toHaveAttribute("inputmode", "decimal");
    expect(box).toHaveAttribute("autocomplete", "off");
  });

  it("shows exact totals, left over and percents as the person types", async () => {
    render(<Page />);
    await fillPlain();
    const card = screen.getByLabelText("Left over each month");
    expect(card).toHaveTextContent("$700.00");
    expect(card).toHaveTextContent("Total income$3,000.00");
    expect(card).toHaveTextContent("Total spending$2,300.00");
    const where = screen.getByRole("region", { name: "Where it goes" });
    expect(where).toHaveTextContent("Rent or mortgage$1,200.00, 40.0% of income");
    expect(where).toHaveTextContent("Food$450.00, 15.0% of income");
    expect(where).toHaveTextContent("Bills$300.00, 10.0% of income");
    expect(where).toHaveTextContent("Transport$250.00, 8.3% of income");
    expect(where).toHaveTextContent("Other$100.00, 3.3% of income");
  });

  it("shows one decimal worked from the amounts, so $250 of $3,000 is 8.3%", async () => {
    render(<Page />);
    await blank();
    await fill("Pay, per month", "3000");
    await fill("Transport, per month", "250");
    expect(screen.getByRole("region", { name: "Where it goes" })).toHaveTextContent("Transport$250.00, 8.3% of income");
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
    await blank();
    await fill("Pay, per month", "1000");
    await fill("Rent or mortgage, per month", "1100");
    const card = screen.getByLabelText("Left over each month");
    expect(card).toHaveTextContent("-$100.00");
    expect(card).toHaveTextContent("More goes out than comes in. The gap is $100.00.");
  });

  it("adds a line, names it, and removes it", async () => {
    render(<Page />);
    await blank();
    await userEvent.click(screen.getByRole("button", { name: "Add a spending item" }));
    await fill("Name of spending item 6", "Phone");
    await fill("Phone, per month", "$40.50");
    await fill("Pay, per month", "1000");
    expect(screen.getByRole("region", { name: "Where it goes" })).toHaveTextContent("Phone$40.50, 4.1% of income");
    await userEvent.click(screen.getByRole("button", { name: "Remove Phone" }));
    expect(screen.getByRole("group", { name: "Before you remove" })).toHaveTextContent("Phone, $40.50");
    await userEvent.click(screen.getByRole("button", { name: "Keep it" }));
    expect(screen.getByLabelText("Phone, per month")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove Phone" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, remove it" }));
    expect(screen.queryByLabelText("Phone, per month")).toBeNull();
    expect(screen.queryByRole("region", { name: "Where it goes" })).toBeNull();
  });

  it("puts a removed line back with its words and amount", async () => {
    render(<Page />);
    await fill("Food, per month", "450");
    await userEvent.click(screen.getByRole("button", { name: "Remove Food" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, remove it" }));
    expect(screen.queryByLabelText("Food, per month")).toBeNull();
    expect(screen.getByText(COPY.undoHelp)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.undo }));
    expect(screen.getByLabelText("Food, per month")).toHaveValue("450");
    expect(screen.queryByRole("button", { name: COPY.undo })).toBeNull();
  });

  it("no longer shows the privacy note", () => {
    render(<Page />);
    expect(screen.getByText(/Your numbers stay on this phone or computer\./).closest(".nt-tool-trust")).not.toBeNull();
    expect(screen.queryByText(/There is no Send button/)).toBeNull();
  });

  it("with no income, shows the totals and shares of spending", async () => {
    render(<Page />);
    await blank();
    await fill("Rent or mortgage, per month", "700");
    await fill("Food, per month", "300");
    expect(screen.getByLabelText("Left over each month")).toHaveTextContent("-$1,000.00");
    const where = screen.getByRole("region", { name: "Where it goes" });
    expect(where).toHaveTextContent("70.0% of spending");
    expect(where).toHaveTextContent("30.0% of spending");
    expect(where).toHaveTextContent(COPY.where.noIncome);
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

  it("shows a calm error that names the line on junk, never NaN", async () => {
    render(<Page />);
    await fill("Pay, per month", "3000");
    await fill("Food, per month", "lots");
    expect(screen.getByText(/Food: use a dollar amount/)).toBeInTheDocument();
    expect(screen.getByLabelText("Food, per month")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(COPY.fixFirst)).toBeInTheDocument();
    expect(screen.getByLabelText("Left over each month")).toHaveTextContent(COPY.waiting);
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("offers to use saved numbers and brings them back", async () => {
    const first = render(<Page />);
    await fill("Pay, per month", "1200");
    first.unmount();
    render(<Page />);
    expect(screen.getByText(COPY.resume.title, { exact: false })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.getByLabelText("Pay, per month")).toHaveValue("1200");
  });

  it("keeps the boxes blank when the person says No thanks to saved ones", async () => {
    const first = render(<Page />);
    await fill("Pay, per month", "1200");
    first.unmount();
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.no }));
    expect(screen.getByLabelText("Pay, per month")).toHaveValue("");
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
    expect(window.localStorage.getItem("nt:flow:monthly-budget")).toBeNull();
  });

  it("survives damaged saved data", async () => {
    window.localStorage.setItem("nt:flow:monthly-budget", JSON.stringify({ v: 1, step: 0, at: "x", value: { income: 5, expenses: "x" } }));
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.queryByText(/NaN|undefined/)).toBeNull();
    expect(screen.getByRole("button", { name: "Add a spending item" })).toBeInTheDocument();
  });

  it("shows Print or save only once there is an answer", async () => {
    render(<Page />);
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    await fill("Pay, per month", "lots");
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    await fill("Pay, per month", "3000");
    expect(screen.getByRole("button", { name: "Print or save" })).toBeInTheDocument();
    await blank();
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    await fillPlain();
    expect(screen.getByRole("button", { name: "Print or save" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Print or save" }));
    expect(screen.getByRole("button", { name: "Save a copy" })).toBeEnabled();
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
  it("clears the first box and the saved copy, then puts it back", async () => {
    render(<Page />);
    const box = () => screen.getAllByRole("textbox")[1];
    await userEvent.clear(box());
    await userEvent.type(box(), "1234");
    expect(window.localStorage.getItem("nt:flow:monthly-budget")).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(box()).toHaveValue("1234");
    await userEvent.click(screen.getByRole("button", { name: "Keep my numbers" }));
    expect(box()).toHaveValue("1234");
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    expect(box()).toHaveValue("");
    expect(window.localStorage.getItem("nt:flow:monthly-budget")).toBeNull();
    expect(screen.getByText(/Your numbers are cleared\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Put it back" }));
    expect(box()).toHaveValue("1234");
  });
});
