import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gradeOf } from "../../../../scripts/check-reading-level.mjs";
import { buildMatchers, loadTerms } from "../../../../scripts/check-banned-jargon.mjs";
import { buildSheet, savedText } from "../../../../tools/form-filler/calc.mjs";
import { Page } from "./Page";
import { COPY } from "./copy";

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const next = () => userEvent.click(screen.getByRole("button", { name: "Next" }));
const primaries = () => document.querySelectorAll("button.primary:not(:disabled)").length;

async function answer(labels: string[]) {
  for (const l of labels) {
    await userEvent.click(screen.getByLabelText(l));
    await next();
  }
}

async function toInfo() {
  render(<Page />);
  await answer(["Yes", "Yes", "Not sure", "No"]); // now on the result
  await next(); // papers
  await next(); // first info box
}

async function fillInfo(values: Record<string, string>, stopAt?: string) {
  const order = ["First name", "Last name", "Street address", "City", "State", "ZIP code", "Birth date", "Phone number"];
  for (const label of order) {
    if (label === stopAt) return;
    const box = screen.getByLabelText(label);
    const v = values[label] ?? "";
    if (box.tagName === "SELECT") await userEvent.selectOptions(box, v || "");
    else if (v) fireEvent.change(box, { target: { value: v } });
    await next();
  }
}

const ALL = {
  "First name": "Ana", "Last name": "Rivera", "Street address": "12 Example Street", City: "Springfield", State: "IL",
  "ZIP code": "62701", "Birth date": "1960-02-29", "Phone number": "(555) 010-1234",
};

describe("Form Filler first screen", () => {
  it("asks one question, says the step, and has one main button", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: "Form Filler" })).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 4: Is this for you?")).toBeInTheDocument();
    expect(screen.getByText(/^Question 1 of 4\./)).toBeInTheDocument();
    expect(screen.getByText("Are you filing this year's taxes?")).toBeInTheDocument();
    expect(screen.getByLabelText("Yes")).toHaveFocus();
    expect(primaries()).toBe(1);
    expect(screen.queryByText(/no Send button/)).toBeNull();
    expect(screen.getAllByRole("link", { name: COPY.sources.freeFile })[0]).toHaveAttribute("href", "https://www.irs.gov/filing/irs-free-file-do-your-taxes-for-free");
    expect(screen.queryByText(/NaN|undefined|Infinity/)).toBeNull();
  });
});

describe("Form Filler reader fixes", () => {
  it("shows no file box on the first screen until asked, and no privacy line under the intro", async () => {
    render(<Page />);
    expect(document.querySelector('input[type="file"]')).toBeNull();
    const intro = screen.getByText(/This page never files for you\./);
    expect(intro.nextElementSibling).not.toHaveTextContent(/no Send button/);
    expect(document.querySelectorAll(".nt-privacy")).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: "Have saved answers?" }));
    expect(screen.getByLabelText("Open my saved answers")).toBeInTheDocument();
  });

  it("says Free File opens again in January 2027 with a source, and shows no privacy note on any screen", async () => {
    render(<Page />);
    expect(screen.getByText(/Free File opens again in January 2027\. You can fill this in now and use it then\./)).toBeInTheDocument();
    for (let i = 0; i < 14; i++) {
      expect(document.querySelector(".nt-privacy"), `screen ${i + 1}`).toBeNull();
      expect(screen.queryByText(/no Send button/), `screen ${i + 1}`).toBeNull();
      await next();
    }
  });

  it("says info stays on the phone or computer on the info screens", async () => {
    await toInfo();
    expect(screen.getByText(/These stay on this phone or computer\./)).toBeInTheDocument();
  });

  it("shows 'Next saves your answer' directly under the Next button", () => {
    render(<Page />);
    const actions = document.querySelector(".nt-ff-actions")!;
    expect(actions.nextElementSibling).toHaveTextContent("Next saves your answer. You can go Back and change it.");
  });

  it("makes the question a heading with a plain hint and a pick-one line", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 2, name: "Are you filing this year's taxes?" })).toBeInTheDocument();
    expect(screen.getByText(/Pick one answer, then tap Next\./)).toBeInTheDocument();
    expect(screen.getByText(/Pick Yes if you are doing this year's taxes now\./)).toBeInTheDocument();
    expect(screen.getByText("Next saves your answer. You can go Back and change it.")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Are you filing this year's taxes?" })).toBeInTheDocument();
  });

  it("does not say 'That is your answer' on the result card", async () => {
    render(<Page />);
    await answer(["Yes", "Yes", "Yes", "Yes"]);
    expect(screen.queryByText(/That is your answer/)).toBeNull();
  });

  it("keeps the papers list short, spells out the long names, and hides the other 1099 forms", async () => {
    render(<Page />);
    await answer(["Yes", "Yes", "Yes", "Yes"]);
    await next();
    expect(screen.getByLabelText(/^Social Security number or ITIN, for each person on your return/)).toBeInTheDocument();
    expect(screen.queryByText(/AGI/)).toBeNull();
    expect(screen.getByText("Papers for credits (if you have them)", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("School costs: the school tax paper (Form 1098-T).")).toBeInTheDocument();
    expect(screen.getByText(/your bank.s routing number/)).toBeInTheDocument();
    expect(screen.getByText(/the income number on last year's return/)).toBeInTheDocument();
    const more = screen.getByText("More forms").closest("details")!;
    expect(more.open).toBe(false);
    expect(within(more).getByText(/1099-NEC, for gig or freelance work/)).toBeInTheDocument();
    expect(screen.getAllByText(/Source:/).length).toBeGreaterThanOrEqual(2);
  });
});

describe("Form Filler result", () => {
  it("picks Guided Free File and gives the official link and help", async () => {
    render(<Page />);
    await answer(["Yes", "Yes", "Not sure", "No"]);
    expect(screen.getByText("Step 1 of 4: Is this for you?")).toBeInTheDocument();
    const card = screen.getByLabelText("Which free way may fit");
    expect(card).toHaveTextContent("Guided Free File");
    expect(card).toHaveTextContent("Check IRS.gov for this year's limit");
    expect(card).toHaveTextContent("Free File was closed when we checked on November 4, 2026");
    expect(screen.getByRole("link", { name: "Open IRS.gov/freefile" })).toHaveAttribute("href", "https://www.irs.gov/freefile");
    expect(screen.getByRole("link", { name: "Find a VITA site" })).toHaveAttribute("href", expect.stringContaining("irs.gov"));
    expect(screen.getByText(/800-906-9887/)).toBeInTheDocument();
    expect(primaries()).toBe(1);
  });

  it("picks Fillable Forms for a higher income", async () => {
    render(<Page />);
    await answer(["Yes", "No", "No", "Yes"]);
    const card = screen.getByLabelText("Which free way may fit");
    expect(card).toHaveTextContent("Free File Fillable Forms");
    expect(card).toHaveTextContent("a VITA volunteer can help for free");
    expect(card).toHaveTextContent("Start at IRS.gov/freefile.");
  });

  it("says Free File does not do past years", async () => {
    render(<Page />);
    await answer(["No", "Yes", "Yes", "Yes"]);
    expect(screen.getByLabelText("Which free way may fit")).toHaveTextContent("It can't do taxes from past years");
    expect(screen.queryByRole("link", { name: "Open IRS.gov/freefile" })).toBeNull();
  });

  it("asks to find the income number when it is not known", async () => {
    render(<Page />);
    await answer(["Yes", "Not sure", "Not sure", "Not sure"]);
    expect(screen.getByLabelText("Which free way may fit")).toHaveTextContent("Tax Records");
  });
});

describe("Form Filler papers", () => {
  it("shows a tick list and counts ticks, and has no Social Security box", async () => {
    render(<Page />);
    await answer(["Yes", "Yes", "Yes", "Yes"]);
    await next();
    expect(screen.getByText("Step 2 of 4: Gather your papers")).toBeInTheDocument();
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(9);
    expect(boxes[0]).toHaveFocus();
    await userEvent.click(screen.getByLabelText(/^W-2, the pay form from each job/));
    expect(screen.getByLabelText(/^W-2, the pay form from each job/)).toBeChecked();
    expect(screen.getByText(/Tax Records/)).toBeInTheDocument();
    expect(primaries()).toBe(1);
  });
});

describe("Form Filler info boxes", () => {
  it("shows one box per screen with the right keyboard and autofill hints", async () => {
    await toInfo();
    expect(screen.getByText("Step 3 of 4: My info")).toBeInTheDocument();
    expect(screen.getByText("Box 1 of 8")).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(screen.getByLabelText("First name")).toHaveFocus();
    expect(screen.getByText(/You type your Social Security number yourself on the free filing site you pick on IRS.gov\./)).toBeInTheDocument();
    expect(primaries()).toBe(1);

    const want: [string, string, string, string?][] = [
      ["First name", "given-name", "text"], ["Last name", "family-name", "text"], ["Street address", "street-address", "text"],
      ["City", "address-level2", "text"], ["State", "address-level1", ""], ["ZIP code", "postal-code", "numeric"],
      ["Birth date", "bday", "numeric"], ["Phone number", "tel", "tel"],
    ];
    for (const [label, auto, mode] of want) {
      const box = screen.getByLabelText(label);
      expect(box).toHaveAttribute("autocomplete", auto);
      if (mode) expect(box).toHaveAttribute("inputmode", mode);
      expect(screen.queryByLabelText(/social security/i)).toBeNull();
      await next();
      if (label === "Phone number") break;
    }
  });

  it("uses a date box for the birth date and a list for the state", async () => {
    await toInfo();
    await fillInfo(ALL, "State");
    expect(screen.getByLabelText("State").tagName).toBe("SELECT");
    await userEvent.selectOptions(screen.getByLabelText("State"), "IL");
    await next();
    await next();
    expect(screen.getByLabelText("Birth date")).toHaveAttribute("type", "date");
  });

  it("holds on a bad ZIP with a calm note, then moves on when fixed", async () => {
    await toInfo();
    await fillInfo({}, "ZIP code");
    const zip = screen.getByLabelText("ZIP code");
    fireEvent.change(zip, { target: { value: "12" } });
    expect(screen.queryByText(/ZIP code: type 5 numbers/)).toBeNull();
    await next();
    expect(screen.getByText(/ZIP code: type 5 numbers, like 12345\./)).toBeInTheDocument();
    expect(screen.getByText("Box 6 of 8")).toBeInTheDocument();
    fireEvent.change(zip, { target: { value: "62701" } });
    await next();
    expect(screen.getByText("Box 7 of 8")).toBeInTheDocument();
  });

  it("tidies what was typed", async () => {
    await toInfo();
    await fillInfo({ ...ALL, "Phone number": "(555) 010-1234" });
    expect(screen.getByText("Step 4 of 4: Review")).toBeInTheDocument();
    expect(screen.getByText("555-010-1234")).toBeInTheDocument();
    expect(screen.getByText("02/29/1960")).toBeInTheDocument();
  });
});

describe("Form Filler review", () => {
  async function toReview() {
    await toInfo();
    await fillInfo(ALL);
  }

  it("shows every answer with an Edit link, one main button, and what you do yourself", async () => {
    await toReview();
    expect(screen.getByRole("heading", { name: "Look it over" })).toBeInTheDocument();
    expect(primaries()).toBe(1);
    expect(screen.getByRole("button", { name: "Save my answer sheet" })).toHaveClass("primary");
    expect(screen.getByText("Stop now and finish later")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("This saves one text file with your answers. To undo, delete the file.")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Stop now and finish later"));
    expect(screen.getByRole("button", { name: "Save my answers to use later" })).not.toHaveClass("primary");
    for (const t of ["Ana", "Rivera", "12 Example Street", "Springfield", "IL", "62701", "02/29/1960", "555-010-1234", "Guided Free File"]) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }
    expect(screen.getAllByRole("link", { name: /^Edit / }).length).toBe(4 + 8 + 1);
    for (const l of ["Make your Free File account.", "Press Submit, the button that sends your tax return.", "Sign with the income number from last year's return, or a 5-digit code you pick."]) {
      expect(screen.getByText(l)).toBeInTheDocument();
    }
    expect(screen.getAllByText(/Social Security number yourself/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /submit|file my|pay/i })).toBeNull();
    expect(screen.getAllByText(/Guided Free File asks simple questions, one at a time/).length).toBeGreaterThan(0);
    expect(screen.getByText("No. The IRS says it opens in January 2027.")).toBeInTheDocument();
    expect(screen.getByText("0 of 9 (tap Edit to see which)")).toBeInTheDocument();
    expect(screen.getByText(/The file stays where you save it\./)).toBeInTheDocument();
  });

  it("shows no privacy note, has no unnamed button, and says what the sheet is for", async () => {
    await toReview();
    expect(screen.queryByText(/no Send button/)).toBeNull();
    for (const b of screen.getAllByRole("button")) expect(b.textContent!.trim().length, b.outerHTML).toBeGreaterThan(0);
    expect(screen.getByText("Your answer sheet is a list to read from when you type your answers in at IRS.gov/freefile.")).toBeInTheDocument();
    const way = screen.getByText(/Guided Free File asks simple questions, one at a time\. The software does the math\./, { selector: "p" });
    expect(way).toHaveTextContent("Source: IRS Free File page");
    expect(within(way).getByRole("link", { name: "IRS Free File page" })).toBeInTheDocument();
  });

  it("Edit goes to that box and Next comes straight back", async () => {
    await toReview();
    await userEvent.click(screen.getByRole("link", { name: "Edit City" }));
    expect(screen.getByText("Box 4 of 8")).toBeInTheDocument();
    expect(screen.getByLabelText("City")).toHaveValue("Springfield");
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Dayton" } });
    await next();
    expect(screen.getByRole("heading", { name: "Look it over" })).toBeInTheDocument();
    expect(screen.getByText("Dayton")).toBeInTheDocument();
  });

  it("saves the answer sheet with the share sheet when the phone can share files", async () => {
    await toReview();
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, share, canShare: () => true });
    await userEvent.click(screen.getByRole("button", { name: "Save my answer sheet" }));
    expect(share).toHaveBeenCalledTimes(1);
    const file: File = share.mock.calls[0][0].files[0];
    expect(file.name).toBe("form-filler-answer-sheet.txt");
    const expected = (buildSheet({
      answers: { filing: "yes", income: "yes", fillable: "unsure", open: "no" },
      info: { firstName: "Ana", lastName: "Rivera", street: "12 Example Street", city: "Springfield", state: "IL", zip: "62701", birthDate: "1960-02-29", phone: "(555) 010-1234" },
      papers: [],
    }) as { text: string }).text;
    expect(await file.text()).toBe(expected);
    expect(await screen.findByText(/Saved as form-filler-answer-sheet\.txt\. To undo, delete that file/)).toBeInTheDocument();
    expect(screen.getByText(/Next: open the IRS link and type these answers in\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open IRS.gov/freefile" })).toHaveAttribute("href", "https://www.irs.gov/freefile");
    expect(screen.getByText("This saves one text file with your answers. To undo, delete the file.")).toBeInTheDocument();
        expect(screen.getByText(/Look in Downloads or the Files app\./, { exact: false })).toBeInTheDocument();
  });

  it("falls back to a download when sharing files is not possible", async () => {
    await toReview();
    vi.stubGlobal("navigator", { ...navigator, share: undefined, canShare: undefined });
    let blob: Blob | undefined;
    URL.createObjectURL = vi.fn((b: Blob) => { blob = b; return "blob:x"; });
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await userEvent.click(screen.getByText("Stop now and finish later"));
    await userEvent.click(screen.getByRole("button", { name: "Save my answers to use later" }));
    expect(click).toHaveBeenCalled();
    const saved = JSON.parse(await blob!.text());
    expect(saved.format).toBe("nt-form-filler");
    expect(saved.info.firstName).toBe("Ana");
    expect(JSON.stringify(saved)).not.toMatch(/social|ssn/i);
    expect(await screen.findByText(/Saved as form-filler-my-answers\.json/)).toBeInTheDocument();
  });

  it("does not save when the person closes the share sheet", async () => {
    await toReview();
    const share = vi.fn().mockRejectedValue(new DOMException("closed", "AbortError"));
    vi.stubGlobal("navigator", { ...navigator, share, canShare: () => true });
    await userEvent.click(screen.getByRole("button", { name: "Save my answer sheet" }));
    expect(share).toHaveBeenCalled();
    expect(screen.queryByText(/Saved as/)).toBeNull();
  });

  it("Start over asks first and can put the answers back", async () => {
    await toReview();
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    expect(screen.queryByText("Ana")).toBeNull();
    expect(window.localStorage.getItem("nt:flow:form-filler")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Put it back" }));
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("62701")).toBeInTheDocument();
  });
});

describe("Form Filler saved answers file", () => {
  const openPanel = () => userEvent.click(screen.getByRole("button", { name: "Have saved answers?" }));
  const pick = async (file: File) => {
    await openPanel();
    await userEvent.upload(screen.getByLabelText("Open my saved answers"), file);
  };

  it("names what was given, what is needed, what it is, and how to get it for a wrong file", async () => {
    render(<Page />);
    const pdf = new File(["%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n"], "tax.pdf", { type: "application/pdf" });
    await pick(pdf);
    const msg = await screen.findByRole("status");
    const paras = within(msg).getAllByText(/./, { selector: "p" }).map((p) => p.textContent);
    expect(paras[0]).toMatch(/PDF/);
    expect(paras[1]).toMatch(/plain text file/i);
    expect(paras.length).toBeGreaterThanOrEqual(3);
    expect(within(msg).getByRole("link")).toBeInTheDocument();
  });

  it("says so, in four parts, when a text file is not an answer file", async () => {
    render(<Page />);
    await pick(new File(["hello there, this is a note"], "note.txt", { type: "text/plain" }));
    expect(await screen.findByText(COPY.open.notMine)).toBeInTheDocument();
    expect(screen.getByText(COPY.open.problemBody)).toBeInTheDocument();
  });

  it("shows a look first, then fills the page, then puts the old answers back", async () => {
    render(<Page />);
    await answer(["Yes", "No"]);
    const text = savedText({
      answers: { filing: "yes", income: "yes", fillable: "yes", open: "yes" },
      info: { firstName: "Ana", lastName: "Rivera" },
      papers: ["w2"],
    });
    // go back to the first screen to see the panel
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    await pick(new File([text], "mine.json", { type: "application/json" }));
    expect(await screen.findByText(/Found saved answers/)).toBeInTheDocument();
    expect(screen.getByText(/Ana Rivera\. 4 of 4 questions answered\./)).toBeInTheDocument();
    // nothing changed yet
    expect(screen.getByText(/^Question 1 of 4\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Use these answers" }));
    expect(screen.getByRole("heading", { name: "Look it over" })).toBeInTheDocument();
    expect(screen.getByText("Rivera")).toBeInTheDocument();
    expect(screen.getByText(/Your saved answers are in/)).toBeInTheDocument();
    expect(primaries()).toBe(1);
    await userEvent.click(screen.getByRole("button", { name: "Put my old answers back" }));
    expect(screen.getByText(/Your old answers are back/)).toBeInTheDocument();
    expect(screen.queryByText("Rivera")).toBeNull();
  });

  it("keeps what is there when asked", async () => {
    render(<Page />);
    await pick(new File([savedText({ info: { firstName: "Zed" } })], "mine.json", { type: "application/json" }));
    await userEvent.click(await screen.findByRole("button", { name: "Keep what I have" }));
    expect(screen.queryByText(/Found saved answers/)).toBeNull();
    expect(screen.getByText(/^Question 1 of 4\./)).toBeInTheDocument();
  });

  it("refuses a file with bad boxes and changes nothing", async () => {
    render(<Page />);
    await pick(new File([JSON.stringify({ format: "nt-form-filler", version: 1, info: { zip: "9" } })], "bad.json", { type: "application/json" }));
    expect(await screen.findByText(/ZIP code: type 5 numbers/)).toBeInTheDocument();
    expect(screen.getByText(/Nothing on this page changed/)).toBeInTheDocument();
  });
});

describe("Form Filler autosave", () => {
  it("offers to pick up on the same step after a reload", async () => {
    const first = render(<Page />);
    await answer(["Yes", "Yes", "Yes", "Yes"]);
    await next();
    await userEvent.click(screen.getByLabelText(/^W-2, the pay form from each job/));
    first.unmount();
    render(<Page />);
    expect(screen.getByText("Pick up where you left off?")).toBeInTheDocument();
    expect(screen.getByText(/You were on Step 2 of 4: Gather your papers\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Pick up" }));
    expect(screen.getByText("Step 2 of 4: Gather your papers")).toBeInTheDocument();
    expect(screen.getByLabelText(/^W-2, the pay form from each job/)).toBeChecked();
  });

  it("starts fresh when asked", async () => {
    const first = render(<Page />);
    await answer(["Yes"]);
    first.unmount();
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, start over" }));
    expect(screen.getByText(/^Question 1 of 4\./)).toBeInTheDocument();
    expect(screen.getByLabelText("Yes")).not.toBeChecked();
  });

  it("keeps the screen when the phone turns (the page is not rebuilt)", async () => {
    render(<Page />);
    await answer(["Yes", "Yes"]);
    fireEvent(window, new Event("orientationchange"));
    fireEvent(window, new Event("resize"));
    expect(screen.getByText(/^Question 3 of 4\./)).toBeInTheDocument();
  });
});

describe("Form Filler keyboard", () => {
  it("scrolls a focused box into view and sets the height from visualViewport", async () => {
    const listeners: Record<string, () => void> = {};
    const vv = { height: 500, addEventListener: (n: string, f: () => void) => { listeners[n] = f; }, removeEventListener: vi.fn() };
    vi.stubGlobal("visualViewport", vv);
    Object.defineProperty(window, "visualViewport", { value: vv, configurable: true });
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    await toInfo();
    expect(document.querySelector<HTMLElement>(".nt-ff")!.style.getPropertyValue("--nt-ff-vh")).toBe("500px");
    scroll.mockClear();
    screen.getByLabelText("First name").blur();
    screen.getByLabelText("First name").focus();
    expect(scroll).toHaveBeenCalledWith({ block: "center" });
    vv.height = 300;
    scroll.mockClear();
    listeners.resize();
    expect(document.querySelector<HTMLElement>(".nt-ff")!.style.getPropertyValue("--nt-ff-vh")).toBe("300px");
    expect(scroll).toHaveBeenCalled();
    Object.defineProperty(window, "visualViewport", { value: undefined, configurable: true });
  });
});

describe("Form Filler one main button on every screen", () => {
  it("has exactly one on each of the 15 screens", async () => {
    render(<Page />);
    for (let i = 0; i < 14; i++) {
      expect(primaries(), `screen ${i + 1}`).toBe(1);
      await next();
    }
    expect(primaries(), "review").toBe(1);
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
  });
});

describe("Form Filler copy", () => {
  const strings: string[] = [];
  (function walk(n: unknown) {
    if (typeof n === "string") strings.push(n);
    else if (Array.isArray(n)) n.forEach(walk);
    else if (n && typeof n === "object") Object.values(n).forEach(walk);
  })(COPY);
  strings.push((buildSheet({}) as { text: string }).text.replace(/https?:\/\/\S+/g, ""));
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
    expect(strings.join(" ")).not.toMatch(/\byou should\b|\bwe recommend\b|\bhurry\b|\blast chance\b|\bact now\b/i);
  });
  it("has no Social Security number box in the page code", () => {
    expect(strings.join(" ")).not.toMatch(/enter your social security number|type it here/i);
  });
});
