import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { gradeOf } from "../../../../scripts/check-reading-level.mjs";
import { buildMatchers, loadTerms } from "../../../../scripts/check-banned-jargon.mjs";
import { QUESTIONS } from "../../../../tools/save-me-money/calc.mjs";
import { Page } from "./Page";
import { COPY } from "./copy";

beforeEach(() => window.localStorage.clear());

async function fill(label: string, text: string) {
  const box = screen.getByLabelText(label);
  await userEvent.clear(box);
  if (text) await userEvent.type(box, text);
}

// Golden "plain" case: tools/save-me-money/tests/golden.json
async function fillPlain() {
  await fill("Phone, amount", "65");
  await fill("Internet, amount", "80");
  await fill("Streaming, amount", "15.99");
  await fill("Insurance, amount", "1200");
  await userEvent.selectOptions(screen.getByLabelText("Insurance, how often"), "year");
  await fill("Gym, amount", "10");
  await userEvent.selectOptions(screen.getByLabelText("Gym, how often"), "week");
  await fill("Other, amount", "25");
}

describe("Save Me Money page", () => {
  it("shows the empty state, prefilled labels and no answer", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: "Save Me Money" })).toBeInTheDocument();
    expect(screen.getByText(COPY.empty)).toBeInTheDocument();
    for (const n of ["Phone", "Internet", "Streaming", "Insurance", "Gym", "Other"]) {
      expect(screen.getByLabelText(`${n}, amount`)).toHaveValue("");
    }
    expect(screen.getByLabelText("Total for a year")).toHaveTextContent(COPY.waiting);
    expect(screen.getByRole("heading", { name: "Your costs" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your list" })).toBeInTheDocument();
    expect(screen.queryByText(/NaN|undefined|Infinity/)).toBeNull();
  });

  it("focuses the first amount box", () => {
    render(<Page />);
    expect(screen.getByLabelText("Phone, amount")).toHaveFocus();
  });

  it("says what Remove does, next to the lines", () => {
    render(<Page />);
    expect(screen.getAllByText(COPY.removeHint)).toHaveLength(6);
  });

  it("has one filled button, Save a copy, and the sheet is titled Save or print my list", async () => {
    const { container } = render(<Page />);
    expect(container.querySelectorAll(".nt-sheet-primary")).toHaveLength(1);
    expect(container.querySelectorAll("button.primary")).toHaveLength(0);
    expect(screen.getByText("Save or print my list")).toBeInTheDocument();
    expect(container.querySelector(".nt-sheet-primary")).toHaveTextContent("Save a copy");
    expect(screen.getByRole("button", { name: "Print" })).toBeDisabled();
    await fillPlain();
    expect(screen.getByRole("button", { name: "Print" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Save a copy" })).toBeEnabled();
  });

  it("has decimal keypads and no autofill on amounts", () => {
    render(<Page />);
    const box = screen.getByLabelText("Gym, amount");
    expect(box).toHaveAttribute("inputmode", "decimal");
    expect(box).toHaveAttribute("autocomplete", "off");
  });

  it("shows exact totals and the list biggest first", async () => {
    render(<Page />);
    await fillPlain();
    const card = screen.getByLabelText("Total for a year");
    expect(card).toHaveTextContent("$3,951.88");
    expect(card).toHaveTextContent("Total for a month$329.32");
    expect(card).toHaveTextContent("Costs in your list6");
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(6);
    const names = boxes.map((b) => b.closest("label")!.textContent);
    expect(names[0]).toBe("Insurance: $1,200.00 a year, $100.00 a month");
    expect(names[3]).toBe("Gym: $520.00 a year, $43.33 a month");
    expect(names[5]).toBe("Streaming: $191.88 a year, $15.99 a month");
  });

  it("says plainly that the helpers are coming soon and links to none", async () => {
    render(<Page />);
    expect(screen.getByText(/Subscription Finder, Bill Negotiation Prep and Cheaper Plan Finder/)).toBeInTheDocument();
    expect(screen.getByText(/never calls, cancels or pays anything/)).toBeInTheDocument();
    await fillPlain();
    expect(screen.getByText(/coming soon/)).toBeInTheDocument();
    const links = screen.queryAllByRole("link").map((a) => a.textContent);
    expect(links.join(" ")).not.toMatch(/Subscription Finder|Bill Negotiation|Cheaper Plan/);
  });

  it("shows questions only for ticked lines, and they are the generic ones", async () => {
    render(<Page />);
    await fillPlain();
    const q = screen.getByRole("region", { name: COPY.questions.heading });
    expect(q).toHaveTextContent(COPY.questions.none);
    expect(within(q).queryByText(QUESTIONS[0])).toBeNull();
    await userEvent.click(screen.getByRole("checkbox", { name: /^Gym:/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /^Phone:/ }));
    expect(q).toHaveTextContent("For: Phone, Gym");
    for (const text of QUESTIONS) expect(within(q).getByText(text)).toBeInTheDocument();
    expect(q.textContent).not.toMatch(/\d/);
    await userEvent.click(screen.getByRole("checkbox", { name: /^Gym:/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /^Phone:/ }));
    expect(q).toHaveTextContent(COPY.questions.none);
  });

  it("adds a line, names it, and removes it", async () => {
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: "Add a cost" }));
    await fill("Name of cost 7", "Newspaper");
    await fill("Newspaper, amount", "$40.50");
    expect(screen.getByLabelText("Total for a year")).toHaveTextContent("$486.00");
    await userEvent.click(screen.getByRole("button", { name: "Remove Newspaper" }));
    expect(screen.queryByLabelText("Newspaper, amount")).toBeNull();
    expect(screen.getByLabelText("Total for a year")).toHaveTextContent(COPY.waiting);
  });

  it("puts a removed line back with its words, amount and how often", async () => {
    render(<Page />);
    await fill("Gym, amount", "10");
    await userEvent.selectOptions(screen.getByLabelText("Gym, how often"), "week");
    await userEvent.click(screen.getByRole("button", { name: "Remove Gym" }));
    expect(screen.queryByLabelText("Gym, amount")).toBeNull();
    expect(screen.getByText(COPY.undoHelp)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.undo }));
    expect(screen.getByLabelText("Gym, amount")).toHaveValue("10");
    expect(screen.getByLabelText("Gym, how often")).toHaveValue("week");
    expect(screen.queryByRole("button", { name: COPY.undo })).toBeNull();
  });

  it("no longer shows the privacy note", () => {
    render(<Page />);
    expect(screen.queryByText(/no Send button/)).toBeNull();
  });

  it("says where the numbers come from and that weeks are an estimate", () => {
    render(<Page />);
    expect(screen.getByText(/Source: only the numbers you type/)).toBeInTheDocument();
    expect(screen.getByText(/52 weeks in a year/)).toBeInTheDocument();
  });

  it("lists every line under Show more", async () => {
    render(<Page />);
    await fillPlain();
    await userEvent.click(screen.getByText("Show more"));
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(1 + 6);
    expect(within(table).getAllByRole("row")[4]).toHaveTextContent("Gym$10.00 every week$520.00$43.33");
  });

  it("shows a calm error that names the line on junk, never NaN", async () => {
    render(<Page />);
    await fill("Phone, amount", "65");
    await fill("Gym, amount", "lots");
    expect(screen.getByText(/Gym: use a dollar amount/)).toBeInTheDocument();
    expect(screen.getByLabelText("Gym, amount")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(COPY.fixFirst)).toBeInTheDocument();
    expect(screen.getByLabelText("Total for a year")).toHaveTextContent(COPY.waiting);
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("offers to use saved costs and brings them back, with ticks", async () => {
    const first = render(<Page />);
    await fill("Phone, amount", "65");
    await userEvent.click(screen.getByRole("checkbox", { name: /^Phone:/ }));
    first.unmount();
    render(<Page />);
    expect(screen.getByText(COPY.resume.title, { exact: false })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.getByLabelText("Phone, amount")).toHaveValue("65");
    expect(screen.getByRole("checkbox", { name: /^Phone:/ })).toBeChecked();
  });

  it("starts fresh when asked", async () => {
    const first = render(<Page />);
    await fill("Phone, amount", "65");
    first.unmount();
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.no }));
    expect(screen.getByLabelText("Phone, amount")).toHaveValue("");
  });

  it("survives damaged saved data", async () => {
    window.localStorage.setItem("nt:flow:save-me-money", JSON.stringify({ v: 1, step: 0, at: "x", value: { items: 5, picked: "x" } }));
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: COPY.resume.yes }));
    expect(screen.queryByText(/NaN|undefined/)).toBeNull();
    expect(screen.getByRole("button", { name: "Add a cost" })).toBeInTheDocument();
  });
});

describe("Save Me Money review fixes", () => {
  it("keeps the coming-soon note inside a closed What comes next section", async () => {
    const { container } = render(<Page />);
    await fillPlain();
    const d = Array.from(container.querySelectorAll("details")).find((x) => x.querySelector("summary")?.textContent === "What comes next")!;
    expect(d).toBeTruthy();
    expect(d.open).toBe(false);
    expect(d).toHaveTextContent("coming soon");
    expect(d.querySelector("a")).toBeNull();
  });

  it("uses headings in order and no Step N of M labels", async () => {
    render(<Page />);
    await fillPlain();
    const heads = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(heads.indexOf("Your costs")).toBeLessThan(heads.indexOf("Your list"));
    expect(heads.indexOf("Your list")).toBeLessThan(heads.indexOf("Keep your list if you want"));
    expect(document.body.textContent).not.toMatch(/Step \d of \d|That is your answer/);
  });

  it("says costs with no amount are left out, and tells what to tap before ticking", async () => {
    render(<Page />);
    await fill("Phone, amount", "65");
    expect(screen.getByText("Costs with no amount are left out.")).toBeInTheDocument();
    expect(screen.getByText("Tap a cost to see questions to ask before you call.")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: COPY.questions.heading })).toHaveTextContent("Questions appear here");
    await fill("Gym, amount", "10");
    expect(screen.getByText("That is your list. You can stop here, or keep a copy below.")).toBeInTheDocument();
  });

  it("previews the save sheet in one sentence without repeating the totals", async () => {
    render(<Page />);
    await fillPlain();
    const sheet = screen.getByRole("group", { name: "Preview" });
    expect(sheet).toHaveTextContent(COPY.save.preview);
    expect(sheet.textContent).not.toMatch(/\$/);
  });

  it("says what Remove does with Put it back", () => {
    render(<Page />);
    expect(screen.getAllByText("Remove takes out one cost. A Put it back button shows right after.").length).toBeGreaterThan(0);
  });
});

describe("Save Me Money copy", () => {
  const strings: string[] = [...QUESTIONS];
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
  it("never gives advice or pressure", () => {
    expect(strings.join(" ")).not.toMatch(/\byou should\b|\bwe recommend\b|\btry to\b|\bcut back\b|\bsave more\b|\bhurry\b|\bact now\b|\blast chance\b/i);
  });
});

describe("save-me-money Start over", () => {
  it("clears the first box and the saved copy, then puts it back", async () => {
    render(<Page />);
    const box = () => screen.getAllByRole("textbox")[1];
    await userEvent.type(box(), "1234");
    expect(window.localStorage.getItem("nt:flow:save-me-money")).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Keep my numbers" }));
    expect(box()).toHaveValue("1234");
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    expect(box()).toHaveValue("");
    expect(window.localStorage.getItem("nt:flow:save-me-money")).toBeNull();
    expect(screen.getByText(/Your numbers are cleared\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Put it back" }));
    expect(box()).toHaveValue("1234");
  });
});
