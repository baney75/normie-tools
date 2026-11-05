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

const pick = (name: string) => userEvent.click(screen.getByRole("radio", { name }));

describe("Unit Converter page", () => {
  it("opens empty: length, inch to millimeter, no number, and only the waiting words for an answer", () => {
    const { container } = render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(screen.getByText(COPY.title)).toBeInTheDocument();
    expect(screen.getByLabelText("Number", { exact: false })).toHaveValue("");
    expect(screen.getByRole("radio", { name: "Length" })).toBeChecked();
    expect(screen.getByLabelText("Change from")).toHaveValue("inch");
    expect(screen.getByLabelText("Change to")).toHaveValue("millimeter");
    const card = screen.getByLabelText("Your answer");
    expect(card).toHaveTextContent(new RegExp(`^${COPY.waiting.replace(/\./g, "\\.")}$`));
    expect(card.querySelector(".nt-result-label")).toBeNull();
    expect(card).toHaveAttribute("id", "nt-answer");
    expect(card).toHaveAttribute("tabindex", "-1");
    expect(container.querySelector(".nt-result-tag")).toBeNull();
    expect(screen.queryByText(/example/i)).toBeNull();
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    expect(screen.queryByText(/Step \d of \d/)).toBeNull();
    expect(screen.getByText(COPY.more.sources)).toBeInTheDocument();
    expect(screen.queryByText(/NaN|undefined|Infinity/)).toBeNull();
  });

  it("says it is free and sends nothing, and links the code", () => {
    render(<Page />);
    expect(screen.getByText(/There is no Send button on this page\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "How we know" })).toHaveAttribute("href", "#/private");
  });

  it("puts the cursor nowhere on load and has a Swap button with no hint", () => {
    render(<Page />);
    expect(document.body).toHaveFocus();
    expect(screen.getByRole("button", { name: COPY.swap })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Swap 'from' and 'to'" })).toBeNull();
    expect(screen.queryByText(/swap back/i)).toBeNull();
    expect(screen.getByText(/There is no Send button on this page/).closest(".nt-tool-trust")).not.toBeNull();
  });

  it("shows the waiting words again when the number is cleared", async () => {
    render(<Page />);
    await fill("Number", "12");
    expect(screen.getByLabelText("Your answer")).toHaveTextContent("304.8 millimeters");
    await fill("Number", "");
    const card = screen.getByLabelText("Your answer");
    expect(card).toHaveTextContent(COPY.waiting);
    expect(card.querySelector(".nt-result-label")).toBeNull();
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    expect(screen.queryByText(/NaN|undefined|Infinity/)).toBeNull();
  });

  it("has labels above the boxes, a decimal keypad and no autofill", () => {
    render(<Page />);
    const box = screen.getByLabelText("Number", { exact: false });
    expect(box).toHaveAttribute("inputmode", "decimal");
    expect(box).toHaveAttribute("autocomplete", "off");
    expect(screen.getByRole("group", { name: "What are you measuring?" })).toBeInTheDocument();
    for (const name of ["Change from", "Change to"]) {
      expect(screen.getByLabelText(name)).toBeInTheDocument();
    }
  });

  it("uses chips, not a select, for the kind", () => {
    render(<Page />);
    expect(screen.getAllByRole("radio").map((r) => (r as HTMLInputElement).value)).toEqual(["length", "weight", "volume", "temperature", "speed"]);
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    expect(screen.getAllByRole("radio").filter((r) => (r as HTMLInputElement).checked)).toHaveLength(1);
  });

  it("shows the exact answer as the person types", async () => {
    render(<Page />);
    await pick("Length");
    await fill("Number", "12");
    const card = screen.getByLabelText("Your answer");
    expect(card).toHaveTextContent("304.8 millimeters");
    expect(card).toHaveTextContent(COPY.result.shown);
  });

  it("changes kind, swaps the two units and counts commas", async () => {
    render(<Page />);
    await pick("Temperature");
    expect(screen.getByRole("radio", { name: "Temperature" })).toBeChecked();
    await fill("Number", "98.6");
    expect(screen.getByLabelText("Your answer")).toHaveTextContent("37 degrees Celsius");
    await userEvent.click(screen.getByRole("button", { name: COPY.swap }));
    expect(screen.getByLabelText("Change from")).toHaveValue("celsius");
    expect(screen.getByLabelText("Change to")).toHaveValue("fahrenheit");
    expect(screen.getByLabelText("Your answer")).toHaveTextContent("209.48 degrees Fahrenheit");
    await pick("Volume");
    await fill("Number", "1,000");
    expect(screen.getByLabelText("Your answer")).toHaveTextContent("236,588 milliliters");
  });

  it("allows a minus sign for temperature only", async () => {
    render(<Page />);
    await pick("Temperature");
    await fill("Number", "-40");
    expect(screen.getByLabelText("Your answer")).toHaveTextContent("-40 degrees Celsius");
    await pick("Length");
    expect(screen.getByText(/Number: use zero or more/)).toBeInTheDocument();
  });

  it("shows a calm error that names the field on junk, never NaN", async () => {
    render(<Page />);
    await fill("Number", "lots");
    expect(screen.getByText(/Number: use digits like 12 or 3.5/)).toBeInTheDocument();
    expect(screen.getByLabelText("Number", { exact: false })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(COPY.fixFirst)).toBeInTheDocument();
    expect(screen.getByLabelText("Your answer")).toHaveTextContent(COPY.waiting);
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

  it("keeps the boxes blank when the person says No thanks to saved numbers", async () => {
    const first = render(<Page />);
    await fill("Number", "77");
    first.unmount();
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.no }));
    expect(screen.getByLabelText("Number", { exact: false })).toHaveValue("");
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
    expect(window.localStorage.getItem("nt:flow:unit-converter")).toBeNull();
  });

  it("has one filled button while there is no answer: See my answer, which puts the cursor in the empty number box", async () => {
    const { container } = render(<Page />);
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
    const see = screen.getByRole("button", { name: COPY.see });
    expect(COPY.see).toBe("See my answer");
    expect(see).toHaveClass("primary");
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    await userEvent.click(see);
    expect(screen.getByLabelText("Number", { exact: false })).toHaveFocus();
    expect(container.querySelector(".nt-tool-inputs input.nt-field-input")).toBe(screen.getByLabelText("Number", { exact: false }));
  });

  it("with an answer, Done is the one filled link, Print or save is an outline that opens the sheet, and the See button is gone", async () => {
    const { container } = render(<Page />);
    await fill("Number", "2");
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
    const done = screen.getByRole("link", { name: "Done. Back to home." });
    expect(done).toHaveClass("primary");
    expect(done).toHaveAttribute("href", "#/");
    const main = screen.getByRole("button", { name: "Print or save" });
    expect(main).toHaveClass("nt-finish-save");
    expect(main).not.toHaveClass("primary");
    expect(screen.queryByRole("button", { name: COPY.see })).toBeNull();
    expect(screen.queryByRole("button", { name: "Go up to my answer" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Print" })).toBeNull();
    await userEvent.click(main);
    expect(main).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Print" })).toBeEnabled();
    expect(screen.getByRole("group", { name: "Preview" })).toHaveTextContent(COPY.save.preview);
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
  });

  it("shows a quiet Start over with its undo note as soon as anything is typed", async () => {
    render(<Page />);
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
    await fill("Number", "lots");
    expect(screen.getByLabelText("Your answer")).toHaveTextContent(COPY.waiting);
    expect(screen.getByRole("button", { name: "Start over" })).toBeInTheDocument();
    expect(screen.getByText("You can put your numbers back.")).toBeInTheDocument();
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
    await userEvent.clear(box());
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
