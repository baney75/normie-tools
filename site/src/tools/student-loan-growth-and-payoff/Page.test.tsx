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

async function fillGolden() {
  await fill("Loan balance", "$20,000");
  await fill("Yearly interest rate", "5");
  await showMore();
  await fill("Months with no payments", "6");
  await fill("Monthly payment", "300");
  await fill("First payment month", "2026-09");
  await fill("Years you want", "10");
}

const paidOff = () => screen.getByLabelText(COPY.result.paidOffLabel);
const balanceCard = () => screen.getByLabelText(COPY.result.balanceLabel);
const more = () => screen.getByText(COPY.more.summary).closest("details") as HTMLElement;

const seeBtn = () => screen.getByRole("button", { name: COPY.see });

describe("Student Loan Growth and Payoff page", () => {
  it("opens with empty boxes and only the waiting words in the answer card", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(screen.getByText(COPY.title)).toBeInTheDocument();
    expect(screen.queryByText(/These are example numbers/)).toBeNull();
    expect(screen.getByLabelText("Loan balance", { exact: false })).toHaveValue("");
    expect(screen.getByLabelText("Yearly interest rate")).toHaveValue("");
    expect(screen.getByLabelText("Monthly payment", { exact: false })).toHaveValue("");
    expect(balanceCard()).toHaveTextContent(COPY.waiting);
    expect(balanceCard()).not.toHaveTextContent("$");
    expect(balanceCard().querySelector(".nt-result-label")).toBeNull();
    expect(balanceCard().querySelector(".nt-result-tag")).toBeNull();
    expect(balanceCard()).toHaveAttribute("id", "nt-answer");
    expect(balanceCard()).toHaveAttribute("tabindex", "-1");
    expect(screen.queryByText(/Step \d of \d/)).toBeNull();
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
    const box = screen.getByLabelText("Loan balance", { exact: false });
    expect(balanceCard().compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(box).not.toHaveFocus();
    expect(document.body.textContent).not.toMatch(/Show my answer|That is your answer|Done\. Back to home|Change a number|Type my own numbers/);
  });

  it("the See my answer button is the one main button while there is no answer, and it focuses the first empty box", async () => {
    render(<Page />);
    expect(document.querySelectorAll(".primary")).toHaveLength(1);
    expect(seeBtn()).toHaveClass("primary");
    expect(seeBtn().closest("details")).toBeNull();
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    await userEvent.click(seeBtn());
    expect(screen.getByLabelText("Loan balance", { exact: false })).toHaveFocus();
    await fill("Loan balance", "5000");
    await userEvent.click(seeBtn());
    expect(screen.getByLabelText("Yearly interest rate")).toHaveFocus();
  });

  it("once there is an answer, Done is the one main link, Print or save is an outline, and See my answer is gone", async () => {
    render(<Page />);
    await fill("Loan balance", "5000");
    await fill("Yearly interest rate", "4");
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
    await fill("Loan balance", "9000");
    expect(screen.getByText("You can put your numbers back.")).toBeInTheDocument();
    await fill("Yearly interest rate", "4");
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    expect(balanceCard()).toHaveTextContent(COPY.waiting);
    expect(screen.getByLabelText("Loan balance", { exact: false })).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
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

  it("has labels above inputs, a keypad that fits each box, no autofill", async () => {
    render(<Page />);
    await showMore();
    for (const name of ["Loan balance", "Yearly interest rate", "Monthly payment"]) {
      const box = screen.getByLabelText(name, { exact: false });
      expect(box).toHaveAttribute("inputmode", "decimal");
      expect(box).toHaveAttribute("autocomplete", "off");
    }
    expect(screen.getByLabelText(/Months with no payments/)).toHaveAttribute("inputmode", "numeric");
    expect(screen.getByLabelText(/First payment month/)).toHaveAttribute("inputmode", "text");
    expect(screen.getByLabelText(/First payment month/)).toHaveAttribute("autocomplete", "off");
  });

  it("keeps the school months and other details behind one quiet button until it is clicked", async () => {
    render(<Page />);
    expect(screen.queryByLabelText(/Months with no payments/)).toBeNull();
    expect(screen.queryByLabelText(/First payment month/)).toBeNull();
    expect(screen.queryByLabelText(/Add the unpaid interest/)).toBeNull();
    expect(screen.queryByLabelText(/Years you want/)).toBeNull();
    await showMore();
    expect(screen.getByLabelText(/Months with no payments/)).toBeInTheDocument();
    expect(screen.getByLabelText(/First payment month/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Add the unpaid interest/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Years you want/)).toBeInTheDocument();
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

  it("with a payment and no wait months, the card says what is paid, then total interest, and hides Balance when payments start", async () => {
    render(<Page />);
    await fill("Loan balance", "12000");
    await fill("Yearly interest rate", "0");
    await fill("Monthly payment", "250");
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
    await fill("Loan balance", "12000");
    await fill("Yearly interest rate", "0");
    await fill("Monthly payment", "250");
    await showMore();
    await fill("First payment month", "2026-09");
    expect(paidOff()).toHaveTextContent("Paying $250.00 a month. You pay it off in August 2030.");
  });

  it("with a target in years and no wait months, the card shows the smallest payment instead of the balance line", async () => {
    render(<Page />);
    await fill("Loan balance", "12000");
    await fill("Yearly interest rate", "0");
    await fill("Monthly payment", "250");
    await showMore();
    await fill("Years you want", "2");
    const card = paidOff();
    expect(card).toHaveTextContent("Paying $250.00 a month.");
    expect(card).toHaveTextContent("Smallest payment to finish in 2 years$500.00");
    expect(card).not.toHaveTextContent("Balance when payments start");
  });

  it("keeps Start over inside More options", async () => {
    render(<Page />);
    expect(document.querySelector("details.nt-more")).toBeNull();
    await fill("Loan balance", "9000");
    const details = document.querySelector("details.nt-more") as HTMLDetailsElement;
    expect(details.querySelector("summary")).toHaveTextContent("More options");
    await userEvent.click(screen.getByText("More options"));
    expect(details).toContainElement(screen.getByRole("button", { name: "Start over" }));
    expect(details).toContainElement(screen.getByText("You can put your numbers back."));
  });

  it("shows only the balance when no payment is typed", async () => {
    render(<Page />);
    await fill("Loan balance", "5000");
    await fill("Yearly interest rate", "4.5");
    await fill("Monthly payment", "");
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
    await fill("Loan balance", "5000");
    await fill("Yearly interest rate", "5.5");
    await fill("Monthly payment", "");
    const card = balanceCard();
    expect(card).toHaveTextContent("$5,000.00");
    expect(card).toHaveTextContent(COPY.result.noGrowth);
    await showMore();
    await fill("Months with no payments", "6");
    expect(balanceCard()).not.toHaveTextContent(COPY.result.noGrowth);
    expect(balanceCard()).toHaveTextContent(COPY.result.balanceLine);
  });

  it("asks only for what is still needed", async () => {
    render(<Page />);
    await fill("Loan balance", "5000");
    expect(screen.getByText("Still needed: Yearly interest rate.")).toBeInTheDocument();
    expect(balanceCard()).toHaveTextContent(COPY.waiting);
  });

  it("shows a calm error that names the field on junk, never NaN", async () => {
    render(<Page />);
    await fill("Loan balance", "lots");
    await fill("Yearly interest rate", "5");
    expect(screen.getByText(/Loan balance: use a number above zero/)).toBeInTheDocument();
    expect(screen.getByLabelText("Loan balance")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(COPY.fixFirst)).toBeInTheDocument();
    expect(balanceCard()).toHaveTextContent(COPY.waiting);
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("explains a bad start month and a payment that is too small", async () => {
    render(<Page />);
    await fill("Loan balance", "10000");
    await fill("Yearly interest rate", "6");
    await showMore();
    await fill("First payment month", "9/2026");
    expect(screen.getByText(/Payments start: type the year/)).toBeInTheDocument();
    await fill("First payment month", "");
    await fill("Monthly payment", "50");
    expect(screen.getByText(/too small to pay off the loan in 100 years/)).toBeInTheDocument();
  });

  it("says the loan statement is the final word", () => {
    render(<Page />);
    expect(screen.getByText(COPY.notes.estimate)).toBeInTheDocument();
  });

  it("offers to use saved numbers and brings them back", async () => {
    const first = render(<Page />);
    await fill("Loan balance", "1200");
    first.unmount();
    render(<Page />);
    expect(screen.getByText(COPY.resume.title, { exact: false })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.getByLabelText("Loan balance")).toHaveValue("1200");
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
  });

  it("drops the saved copy and the prompt when the person says no thanks", async () => {
    const first = render(<Page />);
    await fill("Loan balance", "1200");
    first.unmount();
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.no }));
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
    expect(window.localStorage.getItem("nt:flow:student-loan-growth-and-payoff")).toBeNull();
    expect(screen.getByLabelText("Loan balance")).toHaveValue("");
    expect(balanceCard()).toHaveTextContent(COPY.waiting);
  });

  it("shows the resume prompt only while the boxes are blank", async () => {
    const first = render(<Page />);
    await fill("Loan balance", "1200");
    first.unmount();
    render(<Page />);
    expect(screen.getByText(COPY.resume.title, { exact: false })).toBeInTheDocument();
    await fill("Loan balance", "7");
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
  });

  it("offers Print or save once there is an answer, and opens Print and Save a copy", async () => {
    render(<Page />);
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    await fill("Loan balance", "12000");
    await fill("Yearly interest rate", "0");
    await fill("Monthly payment", "250");
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
});

describe("student-loan-growth-and-payoff Start over", () => {
  it("clears the first box and the saved copy, then puts it back", async () => {
    render(<Page />);
    const box = () => screen.getAllByRole("textbox")[0];
    await fill("Loan balance", "1234");
    expect(window.localStorage.getItem("nt:flow:student-loan-growth-and-payoff")).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    expect(box()).toHaveValue("");
    expect(window.localStorage.getItem("nt:flow:student-loan-growth-and-payoff")).toBeNull();
    expect(screen.getByText(/Your numbers are cleared\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Put it back" }));
    expect(box()).toHaveValue("1234");
  });
});
