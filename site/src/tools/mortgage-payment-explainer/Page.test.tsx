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

async function showMore() {
  await userEvent.click(screen.getByRole("button", { name: COPY.moreButton }));
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

async function fillCore() {
  await fill("Home price", "$300,000");
  await fill("Down payment", "$60,000");
  await fill("Yearly interest rate", "6");
  await setYears("30");
}

async function fillBasic() {
  await fill("Home price", "$300,000");
  await fill("Down payment", "$60,000");
  await fill("Yearly interest rate", "6");
  await setYears("30");
  await showMore();
  await fill("Property tax for the year", "$3,600");
  await fill("Home insurance for the year", "$1,200");
  await fill("Neighborhood fee each month", "$50");
}

const card = () => screen.getByLabelText("Total monthly payment");
const more = () => screen.getByText(COPY.more.summary).closest("details") as HTMLElement;

function expectWaiting() {
  expect(card()).toHaveTextContent(COPY.waiting);
  expect(card()).not.toHaveTextContent("$");
}

const seeBtn = () => screen.getByRole("button", { name: COPY.see });

describe("Mortgage Payment Explainer page", () => {
  it("opens with empty boxes and only the waiting words in the answer card", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(screen.getByText(COPY.title)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Step \d of \d|You are here/);
    expect(screen.queryByText(/These are example numbers/)).toBeNull();
    expect(screen.getByLabelText("Home price")).toHaveValue("");
    expect(screen.getByLabelText("Down payment")).toHaveValue("");
    expect(screen.getByLabelText("Yearly interest rate")).toHaveValue("");
    for (const r of screen.getAllByRole("radio")) expect(r).not.toBeChecked();
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

  it("puts the answer first, with no autofocus and no old buttons", () => {
    render(<Page />);
    const box = screen.getByLabelText("Home price");
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
    expect(screen.getByLabelText("Home price")).toHaveFocus();
    await fill("Home price", "250000");
    await userEvent.click(seeBtn());
    expect(screen.getByLabelText("Down payment")).toHaveFocus();
  });

  it("once there is an answer, Done is the one main link, Print or save is an outline, and See my payment is gone", async () => {
    render(<Page />);
    await fillCore();
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
    await fillCore();
    expect(screen.getByText("You can put your numbers back.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    expectWaiting();
    expect(screen.getByLabelText("Home price")).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("has labels above inputs, decimal keypads, no autofill", async () => {
    render(<Page />);
    await showMore();
    for (const name of ["Home price", "Down payment", "Yearly interest rate", "Property tax for the year", "Home insurance for the year", "Neighborhood fee each month", "Mortgage insurance each month"]) {
      const box = screen.getByLabelText(name, { exact: false });
      expect(box).toHaveAttribute("inputmode", "decimal");
      expect(box).toHaveAttribute("autocomplete", "off");
    }
    await userEvent.click(screen.getByRole("radio", { name: COPY.term.other }));
    expect(screen.getByLabelText("Years to pay it back")).toHaveAttribute("inputmode", "numeric");
  });

  it("keeps tax, insurance and fees behind one quiet button until it is clicked", async () => {
    render(<Page />);
    expect(screen.queryByLabelText("Property tax for the year", { exact: false })).toBeNull();
    expect(screen.queryByLabelText("Mortgage insurance each month", { exact: false })).toBeNull();
    await showMore();
    expect(screen.getByLabelText("Property tax for the year", { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText("Mortgage insurance each month", { exact: false })).toBeInTheDocument();
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

  it("adds mortgage insurance and rounds yearly amounts half up", async () => {
    render(<Page />);
    await fill("Home price", "250,000");
    await fill("Down payment", "12,500");
    await fill("Yearly interest rate", "7.25%");
    await setYears("15");
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

  it("quick picks set the years and show which one is chosen", async () => {
    render(<Page />);
    await fill("Home price", "$300,000");
    await fill("Down payment", "$60,000");
    await fill("Yearly interest rate", "6");
    expect(screen.queryByLabelText("Years to pay it back")).toBeNull();
    await userEvent.click(screen.getByRole("radio", { name: "20 years" }));
    expect(screen.getByRole("radio", { name: "20 years" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "15 years" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "30 years" })).not.toBeChecked();
    expect(more()).toHaveTextContent("Loan length20 years");
    await userEvent.click(screen.getByRole("radio", { name: COPY.term.other }));
    expect(screen.getByRole("radio", { name: COPY.term.other })).toBeChecked();
    await fill("Years to pay it back", "17");
    expect(screen.getByRole("radio", { name: "20 years" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: COPY.term.other })).toBeChecked();
    expect(more()).toHaveTextContent("Loan length17 years");
  });

  it("asks only for what is still needed", async () => {
    render(<Page />);
    await fill("Home price", "300000");
    expect(screen.getByText(/Still needed/)).toHaveTextContent("Still needed: Down payment, Yearly interest rate, How long is the loan?.");
    expectWaiting();
  });

  it("shows a calm error that names the field on junk, never NaN", async () => {
    render(<Page />);
    await fill("Home price", "lots");
    await fill("Down payment", "0");
    await fill("Yearly interest rate", "6");
    await setYears("30");
    expect(screen.getByText(/Home price: use a number above zero/)).toBeInTheDocument();
    expect(screen.getByLabelText("Home price")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(COPY.fixFirst)).toBeInTheDocument();
    expectWaiting();
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("names the down payment when it is not less than the price", async () => {
    render(<Page />);
    await fill("Home price", "100000");
    await fill("Down payment", "100000");
    await fill("Yearly interest rate", "6");
    await setYears("30");
    expect(screen.getByText("Down payment: it must be less than the home price.")).toBeInTheDocument();
  });

  it("says it is an estimate and explains every word", () => {
    render(<Page />);
    expect(screen.getByText(COPY.notes.estimate)).toBeInTheDocument();
    const words = within(screen.getByText(COPY.key.summary).closest("details") as HTMLElement);
    for (const k of COPY.key.items) expect(words.getByText(k.term, { selector: "dt" })).toBeInTheDocument();
  });

  it("offers to use saved numbers and brings them back", async () => {
    const first = render(<Page />);
    await fill("Home price", "1200");
    first.unmount();
    render(<Page />);
    expect(screen.getByText(COPY.resume.title, { exact: false })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.getByLabelText("Home price")).toHaveValue("1200");
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
  });

  it("drops the saved copy and the prompt when the person says no thanks", async () => {
    const first = render(<Page />);
    await fill("Home price", "1200");
    first.unmount();
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.no }));
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
    expect(window.localStorage.getItem("nt:flow:mortgage-payment-explainer")).toBeNull();
    expect(screen.getByLabelText("Home price")).toHaveValue("");
    expectWaiting();
  });

  it("shows the resume prompt only while the boxes are blank", async () => {
    const first = render(<Page />);
    await fill("Home price", "1200");
    first.unmount();
    render(<Page />);
    expect(screen.getByText(COPY.resume.title, { exact: false })).toBeInTheDocument();
    await fill("Home price", "7");
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
  });

  it("offers Print or save once there is an answer, and opens Print and Save a copy", async () => {
    render(<Page />);
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    await fill("Home price", "130000");
    await fill("Down payment", "10000");
    await fill("Yearly interest rate", "0");
    await setYears("10");
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
});

describe("Mortgage Payment Explainer answer-first page", () => {
  it("hands the one main button back from Done to See my payment when the answer goes away", async () => {
    render(<Page />);
    await fillCore();
    expect(screen.getByRole("link", { name: "I'm done" })).toHaveClass("primary");
    expect(screen.getByRole("link", { name: "I'm done" })).toHaveAttribute("href", "#/");
    expect(screen.getByRole("button", { name: "Print or save" })).not.toHaveClass("primary");
    await fill("Yearly interest rate", "");
    expect(document.querySelectorAll(".primary")).toHaveLength(1);
    expect(seeBtn()).toHaveClass("primary");
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
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

describe("mortgage-payment-explainer Start over", () => {
  it("clears the first box and the saved copy, then puts it back", async () => {
    render(<Page />);
    const box = () => screen.getAllByRole("textbox")[0];
    await fill("Home price", "1234");
    expect(window.localStorage.getItem("nt:flow:mortgage-payment-explainer")).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(box()).toHaveValue("1234");
    await userEvent.click(screen.getByRole("button", { name: "Keep my numbers" }));
    expect(box()).toHaveValue("1234");
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    expect(box()).toHaveValue("");
    expect(window.localStorage.getItem("nt:flow:mortgage-payment-explainer")).toBeNull();
    expect(screen.getByText(/Your numbers are cleared\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Put it back" }));
    expect(box()).toHaveValue("1234");
  });
});

describe("mortgage-payment-explainer filled screen", () => {
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
