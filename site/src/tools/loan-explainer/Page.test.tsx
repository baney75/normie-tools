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

const lines = () => screen.getByLabelText(COPY.more.summary, { selector: "dl" });

async function showMore() {
  await userEvent.click(screen.getByRole("button", { name: COPY.moreButton }));
}

async function pickOther(text: string, unit?: "Months" | "Years") {
  await userEvent.click(screen.getByLabelText(COPY.term.other));
  await fill(COPY.term.otherLabel, text);
  if (unit) await userEvent.click(screen.getByLabelText(unit));
}

const card = () => screen.getByLabelText("Monthly payment");
const seeBtn = () => screen.getByRole("button", { name: COPY.see });

async function typeLoan() {
  await fill("Amount borrowed", "$10,000");
  await fill("Yearly interest rate", "6");
  await pickOther("36", "Months");
}

describe("Loan Explainer page", () => {
  it("opens with empty boxes and only the waiting words in the answer card", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(screen.getByText(COPY.title)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Step \d of \d|You are here/);
    expect(screen.queryByText(/These are example numbers/)).toBeNull();
    expect(screen.getByLabelText("Amount borrowed")).toHaveValue("");
    expect(screen.getByLabelText("Yearly interest rate")).toHaveValue("");
    for (const r of screen.getAllByRole("radio")) expect(r).not.toBeChecked();
    expect(card()).toHaveTextContent(COPY.waiting);
    expect(card()).not.toHaveTextContent("$");
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
    expect(screen.getByText(/There is no Send button on this page\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "How we know" })).toHaveAttribute("href", "#/private");
    expect(document.body.textContent?.match(/There is no Send button on this page/g)).toHaveLength(1);
  });

  it("puts the answer first, with no autofocus and no old buttons", () => {
    render(<Page />);
    const box = screen.getByLabelText("Amount borrowed");
    expect(card().compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(box).not.toHaveFocus();
    expect(document.body.textContent).not.toMatch(/Show my answer|That is your answer|Done\. Back to home|Change a number|Type my own numbers/);
  });

  it("the See my payment button is the one main button while there is no answer, and it focuses the first empty box", async () => {
    render(<Page />);
    expect(document.querySelectorAll(".primary")).toHaveLength(1);
    expect(seeBtn()).toHaveClass("primary");
    expect(seeBtn().closest("details")).toBeNull();
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    await userEvent.click(seeBtn());
    expect(screen.getByLabelText("Amount borrowed")).toHaveFocus();
    await fill("Amount borrowed", "5000");
    await userEvent.click(seeBtn());
    expect(screen.getByLabelText("Yearly interest rate")).toHaveFocus();
  });

  it("once there is an answer, Done is the one main link, Print or save is an outline, and See my payment is gone", async () => {
    render(<Page />);
    await typeLoan();
    expect(document.querySelectorAll(".primary")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Done. Back to home." })).toHaveClass("primary");
    expect(screen.getByRole("link", { name: "Done. Back to home." })).toHaveAttribute("href", "#/");
    expect(screen.getByRole("button", { name: "Print or save" })).not.toHaveClass("primary");
    expect(screen.queryByRole("button", { name: COPY.see })).toBeNull();
    expect(screen.queryByRole("button", { name: "Go up to my answer" })).toBeNull();
  });

  it("shows Start over once something is typed, with its undo note, and clearing shows the waiting words", async () => {
    render(<Page />);
    expect(screen.queryByText("You can put your numbers back.")).toBeNull();
    await fill("Amount borrowed", "9000");
    expect(screen.getByText("You can put your numbers back.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    expect(card()).toHaveTextContent(COPY.waiting);
    expect(screen.getByLabelText("Amount borrowed")).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("has labels above inputs, decimal keypads, no autofill", async () => {
    render(<Page />);
    await showMore();
    for (const name of ["Amount borrowed", "Yearly interest rate", "Upfront fees", "Extra each month"]) {
      const box = screen.getByLabelText(name, { exact: false });
      expect(box).toHaveAttribute("inputmode", "decimal");
      expect(box).toHaveAttribute("autocomplete", "off");
    }
    await userEvent.click(screen.getByLabelText(COPY.term.other));
    expect(screen.getByLabelText(COPY.term.otherLabel)).toHaveAttribute("inputmode", "numeric");
  });

  it("keeps fees and extra payments behind one quiet button until it is clicked", async () => {
    render(<Page />);
    expect(screen.queryByLabelText("Upfront fees", { exact: false })).toBeNull();
    expect(screen.queryByLabelText("Extra each month", { exact: false })).toBeNull();
    await showMore();
    expect(screen.getByLabelText("Upfront fees", { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText("Extra each month", { exact: false })).toBeInTheDocument();
  });

  it("shows the exact answer as the person types", async () => {
    render(<Page />);
    await fill("Amount borrowed", "$10,000");
    await fill("Yearly interest rate", "6");
    await pickOther("36", "Months");
    const card = screen.getByLabelText("Monthly payment");
    expect(card).toHaveTextContent("$304.22");
    expect(card).toHaveTextContent("You pay back $10,951.88 in all.");
    expect(card).not.toHaveTextContent("of that is interest");
    expect(card).toHaveTextContent("Total interest$951.88");
    expect(card).toHaveTextContent("Paid off in3 years");
    expect(lines()).toHaveTextContent("Loan length36 months");
    expect(lines()).toHaveTextContent("Total paid$10,951.88");
    expect(lines()).toHaveTextContent("Total interest$951.88");
    expect(lines()).toHaveTextContent("Cost of borrowing$951.88");
    expect(screen.queryByText("With your extra payment")).toBeNull();
  });

  it("counts a year chip, and shows fees, extra payment savings and the by-year table", async () => {
    render(<Page />);
    await fill("Amount borrowed", "$20,000");
    await fill("Yearly interest rate", "7.25%");
    await userEvent.click(screen.getByLabelText("5 years"));
    await showMore();
    await fill("Upfront fees", "$500");
    await fill("Extra each month", "$100");
    const card = screen.getByLabelText("Monthly payment");
    expect(card).toHaveTextContent("$398.39");
    expect(card).toHaveTextContent("Paid off in5 years");
    expect(lines()).toHaveTextContent("Loan length60 months");
    expect(lines()).toHaveTextContent("Upfront fees$500.00");
    expect(lines()).toHaveTextContent("Cost of borrowing$4,403.20");
    const extra = screen.getByRole("region", { name: "With your extra payment" });
    expect(extra).toHaveTextContent("Paid off after47 months");
    expect(extra).toHaveTextContent("Months saved13");
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(1 + 4);
    expect(within(table).getAllByRole("row")[4]).toHaveTextContent("$0.00");
  });

  it("counts years typed in the Other box the same as the chip", async () => {
    render(<Page />);
    await fill("Amount borrowed", "$20,000");
    await fill("Yearly interest rate", "7.25%");
    await pickOther("5", "Years");
    const card = screen.getByLabelText("Monthly payment");
    expect(card).toHaveTextContent("$398.39");
    expect(lines()).toHaveTextContent("Loan length60 months");
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
    await pickOther("36", "Months");
    expect(screen.getByText(/Amount borrowed: use a number above zero/)).toBeInTheDocument();
    expect(screen.getByLabelText("Amount borrowed")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(COPY.fixFirst)).toBeInTheDocument();
    expect(screen.getByLabelText("Monthly payment")).toHaveTextContent(COPY.waiting);
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("says it is an estimate, keeps the yearly cost line in the closed words list only, and explains the words", () => {
    render(<Page />);
    expect(screen.getByText(COPY.notes.estimate)).toBeInTheDocument();
    expect(screen.getAllByText(/The yearly cost of the loan, with some fees/)).toHaveLength(1);
    expect(screen.getByText(/The yearly cost of the loan, with some fees/).closest("details")).not.toBeNull();
    const words = within(screen.getByText(COPY.key.summary).closest("details") as HTMLElement);
    for (const k of COPY.key.items) expect(words.getByText(k.term, { selector: "dt" })).toBeInTheDocument();
  });

  it("offers to use saved numbers and brings them back", async () => {
    const first = render(<Page />);
    await fill("Amount borrowed", "1200");
    first.unmount();
    render(<Page />);
    expect(screen.getByText(COPY.resume.title, { exact: false })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.getByLabelText("Amount borrowed")).toHaveValue("1200");
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
  });

  it("drops the saved copy and the prompt when the person says no thanks", async () => {
    const first = render(<Page />);
    await fill("Amount borrowed", "1200");
    first.unmount();
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.no }));
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
    expect(window.localStorage.getItem("nt:flow:loan-explainer")).toBeNull();
    expect(screen.getByLabelText("Amount borrowed")).toHaveValue("");
    expect(screen.getByLabelText("Yearly interest rate")).toHaveValue("");
    expect(card()).toHaveTextContent(COPY.waiting);
  });

  it("shows the resume prompt only while the boxes are blank", async () => {
    const first = render(<Page />);
    await fill("Amount borrowed", "1200");
    first.unmount();
    render(<Page />);
    expect(screen.getByText(COPY.resume.title, { exact: false })).toBeInTheDocument();
    await fill("Amount borrowed", "7");
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
  });

  it("offers Print or save once there is an answer, and opens Print and Save a copy", async () => {
    render(<Page />);
    await fill("Amount borrowed", "10000");
    await fill("Yearly interest rate", "0");
    await pickOther("10", "Years");
    expect(screen.getByLabelText("Monthly payment")).toHaveTextContent("$83.33");
    expect(document.querySelectorAll(".primary")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Done. Back to home." })).toHaveClass("primary");
    expect(screen.getByRole("link", { name: "Done. Back to home." })).toHaveAttribute("href", "#/");
    expect(screen.getByRole("button", { name: "Print or save" })).not.toHaveClass("primary");
    expect(screen.queryByRole("button", { name: "Print" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Print or save" }));
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save a copy" })).toBeInTheDocument();
    expect(screen.getByText(COPY.save.preview)).toBeInTheDocument();
  });

  it("zero interest over a short loan gives a clean payment", async () => {
    render(<Page />);
    await fill("Amount borrowed", "10000");
    await fill("Yearly interest rate", "0");
    await pickOther("10", "Months");
    expect(screen.getByLabelText("Monthly payment")).toHaveTextContent("$1,000.00");
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
    await fill("Amount borrowed", "1234");
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
    await fill("Amount borrowed", "55");
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Keep my numbers" }));
    expect(screen.getAllByRole("textbox")[0]).toHaveValue("55");
  });
});

describe("loan-explainer filled screen", () => {
  it("shows the estimate sentence once, no APR, one short answer, and a short save preview", async () => {
    render(<Page />);
    await fill("Amount borrowed", "$10,000");
    await fill("Yearly interest rate", "6");
    await pickOther("36", "Months");
    const body = document.body.textContent ?? "";
    expect(body.split(COPY.notes.estimate).length - 1).toBe(1);
    await userEvent.click(screen.getByRole("button", { name: "Print or save" }));
    expect(screen.getByRole("group", { name: "Preview" })).toHaveTextContent(COPY.save.preview);
    expect(screen.getByRole("group", { name: "Preview" })).not.toHaveTextContent("$");
    const open = (document.body.textContent ?? "").replace(/What the words mean[\s\S]*$/, "");
    expect(open).not.toMatch(/APR|HOA/);
  });
});
