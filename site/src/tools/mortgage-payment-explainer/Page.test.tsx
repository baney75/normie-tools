import { render, screen } from "@testing-library/react";
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

async function fillBasic() {
  await fill("Home price", "$300,000");
  await fill("Down payment", "$60,000");
  await fill("Yearly interest rate", "6");
  await fill("Years to pay it back", "30");
  await fill("Property tax for the year", "$3,600");
  await fill("Home insurance for the year", "$1,200");
  await fill("HOA each month", "$50");
}

describe("Mortgage Payment Explainer page", () => {
  it("shows the empty state and no answer", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: "Mortgage Payment Explainer" })).toBeInTheDocument();
    expect(screen.getByText(COPY.empty)).toBeInTheDocument();
    expect(screen.queryByLabelText("Total monthly payment")).toBeNull();
    expect(screen.queryByText(/NaN|undefined|Infinity/)).toBeNull();
  });

  it("has labels above inputs, decimal keypads, no autofill", () => {
    render(<Page />);
    for (const name of ["Home price", "Down payment", "Yearly interest rate", "Property tax for the year", "Home insurance for the year", "HOA each month", "Mortgage insurance each month"]) {
      const box = screen.getByLabelText(name, { exact: false });
      expect(box).toHaveAttribute("inputmode", "decimal");
      expect(box).toHaveAttribute("autocomplete", "off");
    }
    expect(screen.getByLabelText("Years to pay it back")).toHaveAttribute("inputmode", "numeric");
  });

  it("shows the exact answer as the person types", async () => {
    render(<Page />);
    await fillBasic();
    const card = screen.getByLabelText("Total monthly payment");
    expect(card).toHaveTextContent("$1,888.92");
    expect(card).toHaveTextContent("Principal and interest$1,438.92");
    expect(card).toHaveTextContent("Property tax each month$300.00");
    expect(card).toHaveTextContent("Home insurance each month$100.00");
    expect(card).toHaveTextContent("HOA each month$50.00");
    expect(card).toHaveTextContent("Mortgage insurance each month$0.00");
    expect(card).toHaveTextContent("Loan amount$240,000.00");
    expect(card).toHaveTextContent("Loan length30 years");
    expect(card).toHaveTextContent("Total interest over the loan$278,012.58");
    const first = screen.getByRole("region", { name: "Your first payment" });
    expect(first).toHaveTextContent("Goes to interest$1,200.00");
    expect(first).toHaveTextContent("Lowers what you owe$238.92");
  });

  it("adds mortgage insurance and rounds yearly amounts half up", async () => {
    render(<Page />);
    await fill("Home price", "250,000");
    await fill("Down payment", "12,500");
    await fill("Yearly interest rate", "7.25%");
    await userEvent.click(screen.getByRole("button", { name: "15 years" }));
    await fill("Property tax for the year", "2750.50");
    await fill("Home insurance for the year", "1500.25");
    await fill("HOA each month", "120");
    await fill("Mortgage insurance each month", "95.10");
    const card = screen.getByLabelText("Total monthly payment");
    expect(card).toHaveTextContent("$2,737.38");
    expect(card).toHaveTextContent("Principal and interest$2,168.05");
    expect(card).toHaveTextContent("Property tax each month$229.21");
    expect(card).toHaveTextContent("Home insurance each month$125.02");
    expect(card).toHaveTextContent("Mortgage insurance each month$95.10");
  });

  it("quick picks set the years and show which one is chosen", async () => {
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: "20 years" }));
    expect(screen.getByLabelText("Years to pay it back")).toHaveValue("20");
    expect(screen.getByRole("button", { name: "20 years" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "15 years" })).toHaveAttribute("aria-pressed", "false");
    await fill("Years to pay it back", "17");
    expect(screen.getByRole("button", { name: "20 years" })).toHaveAttribute("aria-pressed", "false");
  });

  it("asks only for what is still needed", async () => {
    render(<Page />);
    await fill("Home price", "300000");
    expect(screen.getByRole("status")).toHaveTextContent("Still needed: Down payment, Yearly interest rate, Years to pay it back.");
    expect(screen.queryByLabelText("Total monthly payment")).toBeNull();
  });

  it("shows a calm error that names the field on junk, never NaN", async () => {
    render(<Page />);
    await fill("Home price", "lots");
    await fill("Down payment", "0");
    await fill("Yearly interest rate", "6");
    await fill("Years to pay it back", "30");
    expect(screen.getByText(/Home price: use a number above zero/)).toBeInTheDocument();
    expect(screen.getByLabelText("Home price")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(COPY.fixFirst)).toBeInTheDocument();
    expect(screen.queryByLabelText("Total monthly payment")).toBeNull();
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("names the down payment when it is not less than the price", async () => {
    render(<Page />);
    await fill("Home price", "100000");
    await fill("Down payment", "100000");
    await fill("Yearly interest rate", "6");
    await fill("Years to pay it back", "30");
    expect(screen.getByText("Down payment: it must be less than the home price.")).toBeInTheDocument();
  });

  it("says it is an estimate and explains every word", () => {
    render(<Page />);
    expect(screen.getByText("This is an estimate from the numbers you typed. Your lender statement is the final word. This page helps you understand the numbers.")).toBeInTheDocument();
    for (const k of COPY.key.items) expect(screen.getByText(k.term, { selector: "dt" })).toBeInTheDocument();
  });

  it("offers to use saved numbers and brings them back", async () => {
    const first = render(<Page />);
    await fill("Home price", "1200");
    first.unmount();
    render(<Page />);
    expect(screen.getByText(COPY.resume.title, { exact: false })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.getByLabelText("Home price")).toHaveValue("1200");
  });

  it("starts fresh when asked", async () => {
    const first = render(<Page />);
    await fill("Home price", "1200");
    first.unmount();
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.no }));
    expect(screen.getByLabelText("Home price")).toHaveValue("");
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
  });

  it("offers Save or print once there is an answer", async () => {
    render(<Page />);
    expect(screen.queryByText("Save or print")).toBeNull();
    await fill("Home price", "130000");
    await fill("Down payment", "10000");
    await fill("Yearly interest rate", "0");
    await fill("Years to pay it back", "10");
    expect(screen.getByText("Save or print")).toBeInTheDocument();
    expect(screen.getByLabelText("Total monthly payment")).toHaveTextContent("$1,000.00");
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
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
    await userEvent.type(box(), "1234");
    expect(window.localStorage.getItem("nt:flow:mortgage-payment-explainer")).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(box()).toHaveValue("");
    expect(window.localStorage.getItem("nt:flow:mortgage-payment-explainer")).toBeNull();
    expect(screen.getByText(/Your numbers are cleared\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Put it back" }));
    expect(box()).toHaveValue("1234");
  });
});
