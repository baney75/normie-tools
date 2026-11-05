import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gradeOf } from "../../../../scripts/check-reading-level.mjs";
import { buildMatchers, loadTerms } from "../../../../scripts/check-banned-jargon.mjs";
import { Page } from "./Page";
import { COPY } from "./copy";

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 5, 8, 0, 0));
});
afterEach(() => vi.useRealTimers());

const click = (name: string) => userEvent.click(screen.getByRole("button", { name }));
async function fill(label: string, text: string) {
  const box = screen.getByLabelText(label);
  await userEvent.clear(box);
  if (text) await userEvent.type(box, text);
}
async function toStep2() {
  await click("Next");
}
async function fillDay() {
  await toStep2();
  await fill("Time of thing 1", "1pm");
  await fill("Name of thing 1", "Lunch");
  await click("Add a thing to my day");
  await fill("Time of thing 2", "7:30 am");
  await fill("Name of thing 2", "Pills");
  await click("Add a thing to my day");
  await fill("Time of thing 3", "later");
  await fill("Name of thing 3", "Call Sam");
  await fill("Reminder 1", "Water the plants");
}

describe("Morning Briefing page", () => {
  it("shows step 1 with four ticked parts, one filled button and focus on the first box", () => {
    const { container } = render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: "Morning Briefing" })).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 3: Pick what to include")).toBeInTheDocument();
    for (const n of ["Weather (Example only)", "News headlines (Example only)", "My day", "My reminders"]) {
      expect(screen.getByLabelText(n)).toBeChecked();
    }
    expect(screen.getByLabelText("Weather (Example only)")).toHaveFocus();
    expect(container.querySelectorAll("button.primary")).toHaveLength(1);
    expect(container.querySelectorAll(".nt-sheet-primary")).toHaveLength(0);
  });

  it("asks for at least one part and turns Next off", async () => {
    render(<Page />);
    for (const n of ["Weather (Example only)", "News headlines (Example only)", "My day", "My reminders"]) await userEvent.click(screen.getByLabelText(n));
    expect(screen.getByText(COPY.pick.none)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("step 2 says today's date from the clock and has one filled button", async () => {
    const { container } = render(<Page />);
    await toStep2();
    expect(screen.getByText("Step 2 of 3: Type your own things")).toBeInTheDocument();
    expect(screen.getByText("Today is Thursday, November 5, 2026.")).toBeInTheDocument();
    expect(screen.getByLabelText("Time of thing 1")).toHaveFocus();
    expect(container.querySelectorAll("button.primary")).toHaveLength(1);
    expect(screen.getAllByText(COPY.removeHint)).toHaveLength(2);
  });

  it("says when a time is not clear, without guessing", async () => {
    render(<Page />);
    await toStep2();
    await fill("Time of thing 1", "7:30");
    expect(screen.getByText(COPY.type.timeUnsure)).toBeInTheDocument();
    await fill("Time of thing 1", "7:30 am");
    expect(screen.queryByText(COPY.type.timeUnsure)).toBeNull();
  });

  it("limits each list to 5", async () => {
    render(<Page />);
    await toStep2();
    for (let i = 0; i < 6; i++) if (screen.queryByRole("button", { name: "Add a reminder" })) await click("Add a reminder");
    expect(screen.getAllByLabelText(/^Reminder \d$/)).toHaveLength(5);
    expect(screen.queryByRole("button", { name: "Add a reminder" })).toBeNull();
    expect(screen.getAllByText(COPY.full).length).toBeGreaterThan(0);
  });

  it("step 3 shows the briefing in time order, with Example parts marked", async () => {
    const { container } = render(<Page />);
    await fillDay();
    await click("Next");
    expect(screen.getByText("Step 3 of 3: Your briefing")).toBeInTheDocument();
    const paper = screen.getByLabelText("Your briefing");
    expect(paper).toHaveTextContent("Thursday, November 5, 2026");
    expect(within(paper).getByLabelText("Weather (Example)")).toHaveTextContent("Example town: 58 degrees, clear.");
    expect(within(paper).getByLabelText("Weather (Example)")).toHaveTextContent("Example. Not today's weather.");
    expect(within(paper).getByLabelText("News headlines (Example)")).toHaveTextContent("Example. Not today's news.");
    const day = within(paper).getByLabelText("My day");
    expect(day.textContent).toMatch(/7:30 am: Pills.*1:00 pm: Lunch.*Time not clear.*later: Call Sam/);
    expect(within(paper).getByLabelText("My reminders")).toHaveTextContent("Water the plants");
    expect(paper).toHaveTextContent("Live weather and news need the NT app or your AI helper. This page does not go online.");
    expect(container.querySelectorAll(".nt-sheet-primary")).toHaveLength(1);
    expect(container.querySelectorAll("button.primary")).toHaveLength(0);
    expect(screen.getByText("Save or print my briefing")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("leaves out the parts that were not ticked and the offline line when no example is ticked", async () => {
    render(<Page />);
    await userEvent.click(screen.getByLabelText("Weather (Example only)"));
    await userEvent.click(screen.getByLabelText("News headlines (Example only)"));
    await userEvent.click(screen.getByLabelText("My day"));
    await toStep2();
    await fill("Reminder 1", "Call Sam");
    await click("Next");
    const paper = screen.getByLabelText("Your briefing");
    expect(paper).toHaveTextContent("Call Sam");
    expect(paper).not.toHaveTextContent("Example");
    expect(paper).not.toHaveTextContent("Live weather");
    expect(screen.queryByLabelText("My day")).toBeNull();
  });

  it("goes back to step 2 and step 1", async () => {
    render(<Page />);
    await toStep2();
    await click("Next");
    await click("Back");
    expect(screen.getByText("Step 2 of 3: Type your own things")).toBeInTheDocument();
    await click("Back");
    expect(screen.getByText("Step 1 of 3: Pick what to include")).toBeInTheDocument();
  });

  it("puts a removed line back with its words", async () => {
    render(<Page />);
    await toStep2();
    await fill("Reminder 1", "Water the plants");
    await click("Remove reminder 1");
    expect(screen.queryByLabelText("Reminder 1")).toBeNull();
    expect(screen.getByText(COPY.undoHelp)).toBeInTheDocument();
    await click(COPY.undo);
    expect(screen.getByLabelText("Reminder 1")).toHaveValue("Water the plants");
  });

  it("says nothing is sent and links to the page code", () => {
    render(<Page />);
    expect(screen.getByText(/Nothing is sent\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "our public page" })).toHaveAttribute("href", expect.stringContaining("github.com"));
  });

  it("offers to use saved choices and brings them back", async () => {
    const first = render(<Page />);
    await toStep2();
    await fill("Reminder 1", "Call Sam");
    first.unmount();
    render(<Page />);
    expect(screen.getByText(COPY.resume.title, { exact: false })).toBeInTheDocument();
    await click(COPY.resume.yes);
    expect(screen.getByLabelText("Reminder 1")).toHaveValue("Call Sam");
  });

  it("survives damaged saved data", async () => {
    window.localStorage.setItem("nt:flow:morning-briefing", JSON.stringify({ v: 1, step: 9, at: "x", value: { include: 5, day: "x", reminders: [null, 4] } }));
    render(<Page />);
    await click(COPY.resume.yes);
    expect(document.body.textContent).not.toMatch(/NaN|undefined/);
    expect(screen.getByText(/Step \d of 3/)).toBeInTheDocument();
  });
});

describe("Morning Briefing copy", () => {
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
  it("never gives advice and never claims a source", () => {
    expect(strings.join(" ")).not.toMatch(/\byou should\b|\bwe recommend\b|\btry to\b|according to|\bsource:/i);
  });
});

describe("morning-briefing Start over", () => {
  it("clears the choices and the saved copy, then puts them back", async () => {
    render(<Page />);
    await toStep2();
    await fill("Reminder 1", "Call Sam");
    expect(window.localStorage.getItem("nt:flow:morning-briefing")).not.toBeNull();
    await click("Start over");
    await click("Clear the boxes");
    expect(screen.getByText("Step 1 of 3: Pick what to include")).toBeInTheDocument();
    expect(window.localStorage.getItem("nt:flow:morning-briefing")).toBeNull();
    expect(screen.getByText(/Your numbers are cleared\./)).toBeInTheDocument();
    await click("Put it back");
    await toStep2();
    expect(screen.getByLabelText("Reminder 1")).toHaveValue("Call Sam");
  });
});
