import { render, screen } from "@testing-library/react";
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
  const box = screen.getByLabelText(label, { exact: false });
  await userEvent.clear(box);
  if (text) await userEvent.type(box, text);
}

const pick = (name: string) => userEvent.click(screen.getByRole("radio", { name }));
const cont = () => userEvent.click(screen.getByRole("button", { name: "Continue" }));
const see = () => userEvent.click(screen.getByRole("button", { name: COPY.see }));
const back = () => userEvent.click(screen.getByRole("button", { name: "Back" }));
const changeMine = () => userEvent.click(screen.getByRole("button", { name: "Change my numbers" }));
const card = () => screen.getByLabelText("Your answer");

/** Step 1: pick the kind (if one is named), then Continue. Lands on the number step. */
async function toNumberStep(kind?: string) {
  if (kind) await pick(kind);
  await cont();
}

/** Walks both steps the way a person does and lands on the answer screen. */
async function convert(v: { kind?: string; number: string; swap?: boolean }) {
  await toNumberStep(v.kind);
  await fill("Number", v.number);
  if (v.swap) await userEvent.click(screen.getByRole("button", { name: COPY.swap }));
  await see();
}

/** Writes a saved copy the way the page does, so "Use them" has something to bring back. */
function seed(step: number, value: unknown) {
  window.localStorage.setItem("nt:flow:unit-converter", JSON.stringify({ v: 1, step, at: new Date().toISOString(), value }));
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
  expect(screen.queryByText(/Your numbers stay on this phone or computer\./)).toBeNull();
  expect(screen.queryByRole("link", { name: "Back to tools" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
  expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  expect(screen.queryAllByRole("radio")).toHaveLength(0);
  expect(screen.queryAllByRole("combobox")).toHaveLength(0);
}

describe("Unit Converter steps", () => {
  it("opens on step 1 with its question as the h1, the trust line and Back to tools", () => {
    const { container } = render(<Page />);
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.kind.label })).toBeInTheDocument();
    expect(screen.getByText(COPY.title)).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Step 1 of 3 progress" })).toHaveAttribute("value", "1");
    expect(screen.getByRole("progressbar", { name: "Step 1 of 3 progress" })).toHaveAttribute("max", "3");
    expect(screen.getByText(/Your numbers stay on this phone or computer\./).closest(".nt-tool-trust")).not.toBeNull();
    expect(screen.getByRole("link", { name: "How we know" })).toHaveAttribute("href", "#/private");
    expect(screen.getByRole("link", { name: "Back to tools" })).toHaveAttribute("href", "#/");
    expect(screen.queryByText(/There is no Send button/)).toBeNull();
    // Only the kind chips are here: no number box, no answer, no extras.
    expect(screen.queryByLabelText("Number")).toBeNull();
    expect(screen.queryByLabelText("Your answer")).toBeNull();
    expect(screen.queryByRole("button", { name: COPY.swap })).toBeNull();
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Change my numbers" })).toBeNull();
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Continue" })).toHaveClass("primary");
    expect(screen.queryByText(/example/i)).toBeNull();
    expect(screen.queryByText(/NaN|undefined|Infinity/)).toBeNull();
  });

  it("puts the cursor nowhere on load", () => {
    render(<Page />);
    expect(document.body).toHaveFocus();
  });

  it("uses chips, not a select, for the kind, with Length picked", () => {
    render(<Page />);
    expect(screen.getByRole("group", { name: COPY.kind.label })).toBeInTheDocument();
    expect(screen.getAllByRole("radio").map((r) => (r as HTMLInputElement).value)).toEqual(["length", "weight", "volume", "temperature", "speed"]);
    expect(screen.queryAllByRole("combobox")).toHaveLength(0);
    expect(screen.getByRole("radio", { name: "Length" })).toBeChecked();
    expect(screen.getAllByRole("radio").filter((r) => (r as HTMLInputElement).checked)).toHaveLength(1);
  });

  it("Continue on step 1 moves to step 2 with the cursor in the number box", async () => {
    const { container } = render(<Page />);
    await cont();
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.number })).toBeInTheDocument();
    expect(screen.getByLabelText("Number")).toHaveFocus();
    expect(screen.getByLabelText("Number")).toHaveValue("");
    expect(screen.getByLabelText("From")).toHaveValue("inch");
    expect(screen.getByLabelText("To")).toHaveValue("millimeter");
    expect(screen.getByRole("button", { name: COPY.swap })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Swap 'from' and 'to'" })).toBeNull();
    expect(screen.queryByText(/swap back/i)).toBeNull();
    // The trust line belongs to step 1 only. Back is now a Back button, not a link home.
    expect(screen.queryByText(/Your numbers stay on this phone or computer\./)).toBeNull();
    expect(screen.queryByRole("link", { name: "Back to tools" })).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.queryByLabelText("Your answer")).toBeNull();
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
    expect(screen.getByRole("button", { name: COPY.see })).toHaveClass("primary");
    expect(COPY.see).toBe("See my answer");
  });

  it("has labels above the boxes, a decimal keypad and no autofill", async () => {
    render(<Page />);
    await cont();
    const box = screen.getByLabelText("Number");
    expect(box).toHaveAttribute("inputmode", "decimal");
    expect(box).toHaveAttribute("autocomplete", "off");
    for (const name of ["From", "To"]) expect(screen.getByLabelText(name)).toBeInTheDocument();
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
  });

  it("Back on step 2 returns to step 1 and keeps the picked kind", async () => {
    render(<Page />);
    await toNumberStep("Weight");
    expect(screen.getByLabelText("From")).toHaveValue("pound");
    await back();
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.kind.label })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Weight" })).toBeChecked();
  });

  it("Continue with the number empty stays on step 2, says what is missing and puts the cursor in the box", async () => {
    render(<Page />);
    await cont();
    expect(screen.queryByText(COPY.steps.numberMissing)).toBeNull();
    await see();
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(COPY.steps.numberMissing);
    expect(screen.getByLabelText("Number")).toHaveFocus();
    expect(screen.queryByLabelText("Your answer")).toBeNull();
    expect(screen.queryByRole("link", { name: "I'm done" })).toBeNull();
  });

  it("Continue with junk stays on step 2, shows a calm error that names the field, never NaN", async () => {
    render(<Page />);
    await cont();
    await fill("Number", "lots");
    expect(screen.getByText(/Number: use digits like 12 or 3.5/)).toBeInTheDocument();
    expect(screen.getByLabelText("Number")).toHaveAttribute("aria-invalid", "true");
    await see();
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(COPY.fixFirst);
    expect(screen.getByLabelText("Number")).toHaveFocus();
    expect(screen.queryByLabelText("Your answer")).toBeNull();
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
    // Fixing the box lets the same button move on.
    await fill("Number", "12");
    await see();
    expect(card()).toHaveTextContent("304.8 millimeters");
  });

  it("the last button shows the answer screen with the question as the h1, and its own step count", async () => {
    render(<Page />);
    await convert({ number: "12" });
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(screen.getByText(COPY.title)).toBeInTheDocument();
    expect(screen.getByText("Step 3 of 3: your answer")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Step 3 of 3 progress" })).toHaveAttribute("value", "3");
    expect(screen.getByRole("progressbar", { name: "Step 3 of 3 progress" })).toHaveAttribute("max", "3");
    expect(screen.getByText("That is your answer. You can stop here.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Number")).toBeNull();
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    expect(screen.queryByRole("button", { name: COPY.see })).toBeNull();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    expect(card()).toHaveAttribute("id", "nt-answer");
    expect(card()).toHaveAttribute("tabindex", "-1");
    expect(card().querySelector(".nt-result-label")).not.toBeNull();
    expect(card()).toHaveTextContent("304.8 millimeters");
    expect(card()).toHaveTextContent(COPY.result.shown);
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("Change my numbers goes back to step 1 with the choices kept", async () => {
    render(<Page />);
    await convert({ kind: "Weight", number: "5" });
    expect(card()).toHaveTextContent("2.26796 kilograms");
    await changeMine();
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.kind.label })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Weight" })).toBeChecked();
    await cont();
    expect(screen.getByLabelText("Number")).toHaveValue("5");
  });
});

describe("Unit Converter answers", () => {
  it("shows the exact answer for the number typed", async () => {
    render(<Page />);
    await convert({ kind: "Length", number: "12" });
    expect(card()).toHaveTextContent("304.8 millimeters");
    expect(card()).toHaveTextContent(COPY.result.shown);
  });

  it("changes kind, swaps the two units and counts commas", async () => {
    render(<Page />);
    await toNumberStep("Temperature");
    expect(screen.getByLabelText("From")).toHaveValue("fahrenheit");
    await fill("Number", "98.6");
    await see();
    expect(card()).toHaveTextContent("37 degrees Celsius");
    await changeMine();
    await cont();
    await userEvent.click(screen.getByRole("button", { name: COPY.swap }));
    expect(screen.getByLabelText("From")).toHaveValue("celsius");
    expect(screen.getByLabelText("To")).toHaveValue("fahrenheit");
    await see();
    expect(card()).toHaveTextContent("209.48 degrees Fahrenheit");
    await changeMine();
    await pick("Volume");
    await cont();
    await fill("Number", "1,000");
    await see();
    expect(card()).toHaveTextContent("236,588 milliliters");
  });

  it("allows a minus sign for temperature only", async () => {
    render(<Page />);
    await convert({ kind: "Temperature", number: "-40" });
    expect(card()).toHaveTextContent("-40 degrees Celsius");
    await changeMine();
    await pick("Length");
    await cont();
    expect(screen.getByText(/Number: use zero or more/)).toBeInTheDocument();
    await see();
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(COPY.fixFirst);
  });

  it("shows the waiting words, not an answer, when saved numbers have no number", async () => {
    seed(2, { category: "length", from: "inch", to: "millimeter", value: "" });
    const { container } = render(<Page />);
    expectResumeScreen(container);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(card()).toHaveTextContent(new RegExp(`^${COPY.waiting.replace(/\./g, "\\.")}$`));
    expect(card().querySelector(".nt-result-label")).toBeNull();
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    expect(screen.queryByRole("link", { name: "I'm done" })).toBeNull();
    expect(screen.queryByText(/NaN|undefined|Infinity/)).toBeNull();
  });

  it("lists the exact facts and where they come from under the answer", async () => {
    render(<Page />);
    expect(screen.queryByText(COPY.more.sources)).toBeNull();
    await convert({ number: "2" });
    for (const t of COPY.more.items) expect(screen.getByText(t)).toBeInTheDocument();
    expect(screen.getByText(COPY.more.sources)).toBeInTheDocument();
    expect(screen.getByText(COPY.more.rounding)).toBeInTheDocument();
  });

  it("with an answer, Done is the one filled link, Print or save is an outline that opens the sheet, and the step buttons are gone", async () => {
    const { container } = render(<Page />);
    await convert({ number: "2" });
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
    const done = screen.getByRole("link", { name: "I'm done" });
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
    expect(screen.getByRole("button", { name: "Save a copy" })).toBeEnabled();
    expect(screen.getByRole("group", { name: "Preview" })).toHaveTextContent(COPY.save.preview);
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
  });
});

describe("Unit Converter saved numbers", () => {
  it("shows the resume screen instead of step 1 and brings the number and the step back", async () => {
    const first = render(<Page />);
    await cont();
    await fill("Number", "77");
    first.unmount();
    const { container } = render(<Page />);
    expectResumeScreen(container);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
    expect(screen.getByLabelText("Number")).toHaveValue("77");
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
  });

  it("Use them brings back the answer screen when that is where the person was", async () => {
    const first = render(<Page />);
    await convert({ number: "12" });
    first.unmount();
    const { container } = render(<Page />);
    expectResumeScreen(container);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.queryByRole("heading", { level: 1, name: COPY.resume.title })).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(card()).toHaveTextContent("304.8 millimeters");
  });

  it("shows step 1, not the resume screen, when nothing is saved", () => {
    render(<Page />);
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
  });

  it("does not bring the resume screen back after Use them, Back or Change my numbers", async () => {
    const first = render(<Page />);
    await convert({ number: "12" });
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

  it("keeps the boxes blank when the person says No thanks to saved numbers", async () => {
    const first = render(<Page />);
    await cont();
    await fill("Number", "77");
    first.unmount();
    const { container } = render(<Page />);
    expectResumeScreen(container);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.no }));
    expect(screen.queryByText(COPY.resume.title, { exact: false })).toBeNull();
    expect(window.localStorage.getItem("nt:flow:unit-converter")).toBeNull();
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: COPY.kind.label })).toBeInTheDocument();
    expect(screen.getByText(/Your numbers stay on this phone or computer\./)).toBeInTheDocument();
    await cont();
    expect(screen.getByLabelText("Number")).toHaveValue("");
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
  it("lives on the answer screen, asks first, and Keep my numbers leaves everything as it was", async () => {
    render(<Page />);
    await cont();
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
    await fill("Number", "1234");
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
    expect(window.localStorage.getItem("nt:flow:unit-converter")).not.toBeNull();
    await see();
    expect(screen.getByText("You can put your numbers back.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.getByRole("status")).toHaveTextContent("This clears every box. You can put your numbers back right after.");
    await userEvent.click(screen.getByRole("button", { name: "Keep my numbers" }));
    expect(card()).toHaveTextContent("31,343.6 millimeters");
    expect(window.localStorage.getItem("nt:flow:unit-converter")).not.toBeNull();
  });

  it("Clear the boxes stays on the answer screen with the waiting words, and Put it back restores the numbers and the answer", async () => {
    render(<Page />);
    await convert({ kind: "Weight", number: "1234" });
    const answer = card().textContent;
    expect(answer).toContain("kilograms");
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    expect(window.localStorage.getItem("nt:flow:unit-converter")).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: COPY.question })).toBeInTheDocument();
    expect(screen.getByText("Step 3 of 3: your answer")).toBeInTheDocument();
    expect(card()).toHaveTextContent(COPY.waiting);
    expect(card().querySelector(".nt-result-label")).toBeNull();
    expect(screen.queryByRole("button", { name: "Print or save" })).toBeNull();
    expect(screen.queryByRole("link", { name: "I'm done" })).toBeNull();
    expect(screen.getByText(/Your numbers are cleared\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Put it back" }));
    expect(card().textContent).toBe(answer);
    expect(screen.getByRole("button", { name: "Print or save" })).toBeInTheDocument();
    expect(window.localStorage.getItem("nt:flow:unit-converter")).not.toBeNull();
    expect(screen.queryByText(/Your numbers are cleared\./)).toBeNull();
    await changeMine();
    await cont();
    expect(screen.getByLabelText("Number")).toHaveValue("1234");
    expect(screen.getByRole("heading", { level: 1, name: COPY.steps.number })).toBeInTheDocument();
  });

  it("Change my numbers after Clear the boxes goes to step 1 with Length picked and the number empty", async () => {
    render(<Page />);
    await convert({ kind: "Weight", number: "1234" });
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    await changeMine();
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Length" })).toBeChecked();
    await cont();
    expect(screen.getByLabelText("Number")).toHaveValue("");
    expect(screen.getByLabelText("From")).toHaveValue("inch");
  });
});
