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

// Golden: tools/debt-payoff-planner/tests/golden.json, case "plans-differ-a-lot".
async function typeTwoDebts() {
  await fill("Debt 1 balance", "800");
  await fill("Debt 1 yearly interest rate", "3");
  await fill("Debt 1 minimum payment", "30");
  await fill("Debt 2 balance", "12,000");
  await fill("Debt 2 yearly interest rate", "27.99");
  await fill("Debt 2 minimum payment", "300");
  await fill("Extra each month", "200");
}

describe("Debt Payoff Planner page", () => {
  it("shows the empty state and no answer", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: "Debt Payoff Planner" })).toBeInTheDocument();
    expect(screen.getByText(/^Type the amount you owe on each debt\. Your answer shows below\./)).toBeInTheDocument();
    expect(screen.getByLabelText(COPY.result.label)).toHaveTextContent(COPY.waiting);
    expect(document.body.textContent).not.toMatch(/Step \d of \d|You are here/);
    const intro = screen.getByText(COPY.intro);
    expect(intro.compareDocumentPosition(screen.getByLabelText("Debt 1 name", { exact: false })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByLabelText("Debt 1 name", { exact: false })).toHaveFocus();
    expect(screen.queryByText(/no Send button/)).toBeNull();
    expect(screen.queryByText(/NaN|undefined|Infinity/)).toBeNull();
  });

  it("has labels above inputs, decimal keypads, no autofill", () => {
    render(<Page />);
    for (const name of ["Debt 1 balance", "Debt 1 yearly interest rate", "Debt 1 minimum payment", "Extra each month"]) {
      const box = screen.getByLabelText(name, { exact: false });
      expect(box).toHaveAttribute("inputmode", "decimal");
      expect(box).toHaveAttribute("autocomplete", "off");
    }
  });

  it("shows the exact answer for both plans as the person types", async () => {
    render(<Page />);
    await typeTwoDebts();
    expect(screen.getByLabelText(COPY.result.label)).toHaveTextContent("$361.25");
    expect(screen.getByLabelText(COPY.result.label)).toHaveTextContent("Highest interest first pays this much less interest than Smallest debt first.");
    expect(screen.getByLabelText(COPY.result.label)).toHaveTextContent("Both plans take the same number of months.");
    const snow = screen.getByRole("region", { name: "Smallest debt first plan" });
    expect(snow).toHaveTextContent("Months until all paid36 months");
    expect(snow).toHaveTextContent("Interest you pay$6,162.19");
    expect(snow).toHaveTextContent("All you pay$18,962.19");
    const aval = screen.getByRole("region", { name: "Highest interest first plan" });
    expect(aval).toHaveTextContent("Interest you pay$5,800.94");
    const items = within(aval).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Debt 1: paid off in month 28");
    expect(items[1]).toHaveTextContent("Debt 2: paid off in month 36");
    expect(within(snow).getAllByRole("listitem")[0]).toHaveTextContent("Debt 1: paid off in month 4");
  });

  it("puts the last removed debt back with what was typed", async () => {
    render(<Page />);
    await userEvent.type(screen.getByLabelText("Debt 2 balance", { exact: false }), "900");
    expect(screen.getByText(COPY.removeHint)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.removeDebt }));
    expect(screen.getByRole("group", { name: "Before you remove" })).toHaveTextContent("Debt 2, balance $900");
    expect(screen.getByLabelText("Debt 2 balance", { exact: false })).toHaveValue("900");
    await userEvent.click(screen.getByRole("button", { name: "Yes, remove it" }));
    expect(screen.queryByLabelText("Debt 2 balance", { exact: false })).toBeNull();
    expect(screen.getByText(COPY.undoHelp)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.undo }));
    expect(screen.getByLabelText("Debt 2 balance", { exact: false })).toHaveValue("900");
  });

  it("uses the names the person typed and adds and takes out debts", async () => {
    render(<Page />);
    expect(screen.queryByLabelText("Debt 3 balance", { exact: false })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: COPY.addDebt }));
    expect(screen.getByLabelText("Debt 3 balance", { exact: false })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.removeDebt }));
    await userEvent.click(screen.getByRole("button", { name: "Keep it" }));
    expect(screen.getByLabelText("Debt 3 balance", { exact: false })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.removeDebt }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, remove it" }));
    expect(screen.queryByLabelText("Debt 3 balance", { exact: false })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: COPY.undo }));
    expect(screen.getByLabelText("Debt 3 balance", { exact: false })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.removeDebt }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, remove it" }));
    for (let i = 0; i < 6; i++) {
      const add = screen.getByRole("button", { name: COPY.addDebt });
      if (!(add as HTMLButtonElement).disabled) await userEvent.click(add);
    }
    expect(screen.getByLabelText("Debt 6 balance", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: COPY.addDebt })).toBeDisabled();
  });

  it("works out one named debt that rounds half a cent up", async () => {
    render(<Page />);
    await fill("Debt 1 name", "Tiny");
    await fill("Debt 1 balance", "12");
    await fill("Debt 1 yearly interest rate", "0.5");
    await fill("Debt 1 minimum payment", "5");
    expect(screen.getByRole("region", { name: "Both plans" })).toHaveTextContent("Months until all paid3 months");
    expect(screen.getByRole("region", { name: "Both plans" })).toHaveTextContent("Interest you pay$0.01");
    expect(screen.getByRole("region", { name: "Both plans" })).toHaveTextContent("Tiny: paid off in month 3");
    expect(screen.getByLabelText(COPY.result.label)).toHaveTextContent(COPY.result.same);
  });

  it("asks only for what is still needed", async () => {
    render(<Page />);
    await fill("Debt 1 balance", "5000");
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Debt 1: type the yearly interest rate.");
    expect(status).toHaveTextContent("Debt 1: type the smallest payment due each month.");
    expect(screen.getByLabelText(COPY.result.label)).toHaveTextContent(COPY.waiting);
  });

  it("shows a calm error that names the debt and field on junk, never NaN", async () => {
    render(<Page />);
    await fill("Debt 1 balance", "lots");
    await fill("Debt 1 yearly interest rate", "6");
    await fill("Debt 1 minimum payment", "50");
    expect(screen.getByText(/Debt 1 balance: use a number above zero/)).toBeInTheDocument();
    expect(screen.getByLabelText("Debt 1 balance", { exact: false })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(COPY.fixFirst)).toBeInTheDocument();
    expect(screen.getByLabelText(COPY.result.label)).toHaveTextContent(COPY.waiting);
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("says plainly when the smallest payment does not cover the interest", async () => {
    render(<Page />);
    await fill("Debt 1 balance", "10,000");
    await fill("Debt 1 yearly interest rate", "24");
    await fill("Debt 1 minimum payment", "200");
    expect(screen.getByText(/does not cover the first month's interest/)).toBeInTheDocument();
    expect(screen.getByLabelText(COPY.result.label)).toHaveTextContent(COPY.waiting);
  });

  it("says it is an estimate and explains the words", () => {
    render(<Page />);
    expect(screen.getByText(COPY.notes.estimate)).toBeInTheDocument();
    expect(screen.getByText(COPY.notes.facts, { selector: "dd" })).toBeInTheDocument();
    for (const k of COPY.key.items) expect(screen.getByText(k.term, { selector: "dt" })).toBeInTheDocument();
  });

  it("offers to use saved numbers and brings them back", async () => {
    const first = render(<Page />);
    await fill("Debt 1 balance", "1200");
    first.unmount();
    render(<Page />);
    expect(screen.getByText(COPY.resume.title, { exact: false })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.getByLabelText("Debt 1 balance", { exact: false })).toHaveValue("1200");
  });

  it("starts fresh when asked", async () => {
    const first = render(<Page />);
    await fill("Debt 1 balance", "1200");
    first.unmount();
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.no }));
    expect(screen.getByLabelText("Debt 1 balance", { exact: false })).toHaveValue("");
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
  });

  it("offers Save or print once there is an answer", async () => {
    render(<Page />);
    expect(screen.queryByText(COPY.save.title)).toBeNull();
    await typeTwoDebts();
    expect(screen.getByText(COPY.save.title)).toBeInTheDocument();
    expect(screen.getByText(COPY.save.title).closest("details")).toBeNull();
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
    // The only filled button was the old "Done. Back to home." link, which is gone on purpose.
    expect(screen.queryByText("Done. Back to home.")).toBeNull();
    expect(document.querySelectorAll(".primary")).toHaveLength(0);
  });
});

describe("Debt Payoff Planner copy", () => {
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
    expect(strings.join(" ")).not.toMatch(/\byou should\b|\bwe recommend\b|\bbest plan\b|\bbetter plan\b|\buse the\b/i);
  });
});

describe("debt-payoff-planner Start over", () => {
  it("clears the first box and the saved copy, then puts it back", async () => {
    render(<Page />);
    const box = () => screen.getAllByRole("textbox")[0];
    await userEvent.type(box(), "1234");
    expect(window.localStorage.getItem("nt:flow:debt-payoff-planner")).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    expect(box()).toHaveValue("");
    expect(window.localStorage.getItem("nt:flow:debt-payoff-planner")).toBeNull();
    expect(screen.getByText(/Your numbers are cleared\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Put it back" }));
    expect(box()).toHaveValue("1234");
  });
});

describe("debt-payoff-planner Start over can be called off", () => {
  it("keeps the numbers when asked to", async () => {
    render(<Page />);
    await userEvent.type(screen.getAllByRole("textbox")[0], "abc");
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Keep my numbers" }));
    expect(screen.getAllByRole("textbox")[0]).toHaveValue("abc");
  });
});

describe("debt-payoff-planner filled screen", () => {
  it("shows the estimate sentence once, no APR, one answer line, no empty heading, and a short save preview", async () => {
    render(<Page />);
    await typeTwoDebts();
    const body = document.body.textContent ?? "";
    expect(body.split("Your lender statement is the final word").length - 1).toBe(1);
    expect(body).not.toContain("That is your answer");
    for (const h of screen.getAllByRole("heading")) expect(h.textContent?.trim()).not.toBe("");
    expect(screen.getByRole("group", { name: "Preview" })).toHaveTextContent(COPY.save.preview);
    expect(screen.getByRole("group", { name: "Preview" })).not.toHaveTextContent("$");
    const open = body.replace(/What the words mean[\s\S]*$/, "");
    expect(open).not.toMatch(/APR|HOA/);
  });
});
