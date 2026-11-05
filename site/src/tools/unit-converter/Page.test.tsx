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

describe("Unit Converter page", () => {
  it("shows the empty state and no answer", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: "Unit Converter" })).toBeInTheDocument();
    expect(screen.getByText(COPY.empty)).toBeInTheDocument();
    expect(screen.getByLabelText("Your answer")).toHaveTextContent("Your answer shows here");
    expect(screen.getByText("Step 2 of 2: Read your answer")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 2: Pick units and type a number")).toBeInTheDocument();
    expect(screen.getByLabelText("Number", { exact: false })).toHaveFocus();
    expect(screen.getByText(/Nothing is sent/)).toBeInTheDocument();
    expect(screen.getByText(COPY.more.sources)).toBeInTheDocument();
    expect(screen.queryByText(/NaN|undefined|Infinity/)).toBeNull();
  });

  it("has labels above the boxes, a decimal keypad and no autofill", () => {
    render(<Page />);
    const box = screen.getByLabelText("Number", { exact: false });
    expect(box).toHaveAttribute("inputmode", "decimal");
    expect(box).toHaveAttribute("autocomplete", "off");
    for (const name of ["What are you measuring?", "Change from", "Change to"]) {
      expect(screen.getByLabelText(name)).toBeInTheDocument();
    }
  });

  it("shows the exact answer as the person types", async () => {
    render(<Page />);
    await fill("Number", "12");
    const card = screen.getByLabelText("Your answer");
    expect(card).toHaveTextContent("304.8 millimeters");
    expect(card).toHaveTextContent("Shown to 6 digits.");
  });

  it("changes kind, swaps the two units and counts commas", async () => {
    render(<Page />);
    await userEvent.selectOptions(screen.getByLabelText("What are you measuring?"), "temperature");
    await fill("Number", "98.6");
    expect(screen.getByLabelText("Your answer")).toHaveTextContent("37 degrees Celsius");
    await userEvent.click(screen.getByRole("button", { name: COPY.swap }));
    expect(screen.getByText(COPY.swapped)).toBeInTheDocument();
    expect(screen.getByLabelText("Your answer")).toHaveTextContent("209.48 degrees Fahrenheit");
    await userEvent.selectOptions(screen.getByLabelText("What are you measuring?"), "volume");
    await fill("Number", "1,000");
    expect(screen.getByLabelText("Your answer")).toHaveTextContent("236,588 milliliters");
  });

  it("allows a minus sign for temperature only", async () => {
    render(<Page />);
    await userEvent.selectOptions(screen.getByLabelText("What are you measuring?"), "temperature");
    await fill("Number", "-40");
    expect(screen.getByLabelText("Your answer")).toHaveTextContent("-40 degrees Celsius");
    await userEvent.selectOptions(screen.getByLabelText("What are you measuring?"), "length");
    expect(screen.getByText(/Number: use zero or more/)).toBeInTheDocument();
  });

  it("shows a calm error that names the field on junk, never NaN", async () => {
    render(<Page />);
    await fill("Number", "lots");
    expect(screen.getByText(/Number: use digits like 12 or 3.5/)).toBeInTheDocument();
    expect(screen.getByLabelText("Number", { exact: false })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(COPY.fixFirst)).toBeInTheDocument();
    expect(screen.getByLabelText("Your answer")).toHaveTextContent("Your answer shows here");
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("lists the exact facts", () => {
    render(<Page />);
    for (const t of COPY.more.items) expect(screen.getByText(t)).toBeInTheDocument();
  });

  it("offers to use saved numbers and brings them back", async () => {
    const first = render(<Page />);
    await fill("Number", "77");
    first.unmount();
    render(<Page />);
    expect(screen.getByText(COPY.resume.title, { exact: false })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.getByLabelText("Number", { exact: false })).toHaveValue("77");
  });

  it("starts fresh when asked", async () => {
    const first = render(<Page />);
    await fill("Number", "77");
    first.unmount();
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.no }));
    expect(screen.getByLabelText("Number", { exact: false })).toHaveValue("");
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
  });

  it("offers Save or print once there is an answer", async () => {
    render(<Page />);
    expect(screen.getByText("Keep your answer if you want")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print" })).toBeDisabled();
    await fill("Number", "1");
    expect(screen.getByRole("button", { name: "Print" })).toBeEnabled();
    expect(screen.getByRole("group", { name: "Preview" })).toHaveTextContent(COPY.save.preview);
  });
});

describe("Unit Converter copy", () => {
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
    expect(strings.join(" ")).not.toMatch(/\byou should\b|\bwe recommend\b|\bbest\b|\bbuy\b/i);
  });
});

describe("unit-converter Start over", () => {
  it("clears the first box and the saved copy, then puts it back", async () => {
    render(<Page />);
    const box = () => screen.getAllByRole("textbox")[0];
    await userEvent.type(box(), "1234");
    expect(window.localStorage.getItem("nt:flow:unit-converter")).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    expect(box()).toHaveValue("");
    expect(window.localStorage.getItem("nt:flow:unit-converter")).toBeNull();
    expect(screen.getByText(/Your numbers are cleared\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Put it back" }));
    expect(box()).toHaveValue("1234");
  });
});
