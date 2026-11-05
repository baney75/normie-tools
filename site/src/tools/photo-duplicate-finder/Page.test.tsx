import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gradeOf } from "../../../../scripts/check-reading-level.mjs";
import { buildMatchers, loadTerms } from "../../../../scripts/check-banned-jargon.mjs";
import { Page } from "./Page";
import { COPY } from "./copy";

// A stand-in for the part that opens pictures. Made-up bytes decide the look-alike code.
vi.mock("./decode", async () => {
  const { sha256Hex } = await import("../../../../tools/photo-duplicate-finder/calc.mjs");
  const DOWN = "ffffffffffffffff";
  const NEAR = "7fffffffffffffff";
  const ALT = "aaaaaaaaaaaaaaaa";
  const bytesOf = (f: Blob) =>
    new Promise<Uint8Array>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(new Uint8Array(r.result as ArrayBuffer));
      r.readAsArrayBuffer(f);
    });
  return {
    readPhoto: async (f: Blob) => {
      const b = await bytesOf(f);
      const text = new TextDecoder("latin1").decode(b);
      if (text.includes("BROKEN")) return { sha256: await sha256Hex(b), dhash: null, opened: false };
      return { sha256: await sha256Hex(b), dhash: text.includes("NEAR") ? NEAR : text.includes("ALT") ? ALT : DOWN, opened: true };
    },
  };
});

const jpeg = (payload: string, name: string, mtime = 1) => {
  const body = new TextEncoder().encode(payload);
  return new File([new Uint8Array([0xff, 0xd8, 0xff, ...body, 0xff, 0xd9])], name, { type: "image/jpeg", lastModified: mtime });
};

let blobs: Blob[] = [];
const revoked: string[] = [];
let made = 0;

beforeEach(() => {
  blobs = [];
  revoked.length = 0;
  made = 0;
  window.localStorage.clear();
  URL.createObjectURL = vi.fn((b: Blob) => {
    blobs.push(b);
    return `blob:made-up-${++made}`;
  }) as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL = vi.fn((u: string) => void revoked.push(u));
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

const picker = () => screen.getByLabelText(COPY.pick.label) as HTMLInputElement;
async function pickFiles(files: File[], applyAccept = true) {
  await userEvent.upload(picker(), files, { applyAccept } as never);
}
const textOf = (b: Blob) =>
  new Promise<string>((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.readAsText(b);
  });
const primaries = () => document.querySelectorAll("button.primary");

describe("Photo Duplicate Finder page", () => {
  it("shows the empty state with one primary button and the first field focused", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: "Photo Duplicate Finder" })).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 3: Pick your photos")).toBeInTheDocument();
    expect(screen.getByLabelText("Photos picked")).toHaveTextContent(COPY.pick.waiting(0));
    expect(screen.getByRole("button", { name: COPY.pick.choose })).toBeEnabled();
    expect(screen.getByText("You picked 0 photos. Pick 2 or more.")).toBeInTheDocument();
    expect(screen.queryByText(/at least 2/)).toBeNull();
    expect(screen.queryByText(/That is your answer/)).toBeNull();
    expect(screen.getAllByRole("link", { name: /how this page is made/i })).toHaveLength(1);
    expect(screen.getByText(/Photos stay on this phone or computer/)).toBeInTheDocument();
    expect(primaries()).toHaveLength(1);
    expect(picker().multiple).toBe(true);
    expect(picker()).toHaveFocus();
    expect(screen.getByText(/Nothing is sent\./)).toBeInTheDocument();
  });

  it("with fewer than 2 photos the one filled button is Choose photos and opens the chooser", async () => {
    render(<Page />);
    const click = vi.spyOn(picker(), "click");
    const button = screen.getByRole("button", { name: COPY.pick.choose });
    expect(button).toHaveClass("primary");
    expect(screen.queryByRole("button", { name: COPY.pick.next })).toBeNull();
    await userEvent.click(button);
    expect(click).toHaveBeenCalled();
    expect(screen.getByText("Step 1 of 3: Pick your photos")).toBeInTheDocument();
  });

  it("groups exact copies, keeps the largest by default, and walks to the list", async () => {
    render(<Page />);
    await pickFiles([jpeg("ALPHA", "one.jpg"), jpeg("ALPHA", "one copy.jpg", 2), jpeg("ALT lone photo", "lone.jpg", 3)]);
    await waitFor(() => expect(screen.getByLabelText("Photos picked")).toHaveTextContent(/^Photos picked3$/));
    const picked = screen.getByRole("region", { name: COPY.pick.picked });
    expect(within(picked).getByText(/^one\.jpg$/)).toBeInTheDocument();
    expect(within(picked).getByText(/^lone\.jpg/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.pick.next }));

    expect(screen.getByText("Step 2 of 3: Look at the groups")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Group 1 of 1: Exact copies" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Keep one copy\.jpg/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Keep one\.jpg/ })).not.toBeChecked();
    expect(primaries()).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: COPY.groups.next }));
    expect(screen.getByText("Step 3 of 3: Check your list")).toBeInTheDocument();
    expect(screen.getByLabelText(COPY.review.label)).toHaveTextContent("1 file");
    const list = screen.getByRole("region", { name: COPY.review.listHeading });
    expect(within(list).getByText(/^one\.jpg/)).toBeInTheDocument();
    expect(screen.getByText(COPY.review.what)).toBeInTheDocument();
    expect(screen.getByText(`${COPY.review.saveHelp} ${COPY.review.undo}`)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\bKB\b|\bMB\b|bytes/);
    expect(screen.queryByText(/That is your answer/)).toBeNull();
    expect(primaries()).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: COPY.review.save }));
    expect(screen.getByText(COPY.review.saved)).toBeInTheDocument();
    expect(screen.getByText(/Look in Downloads or the Files app/)).toBeInTheDocument();
    const saved = await textOf(blobs[blobs.length - 1]);
    expect(saved).toMatch(/^one\.jpg \(\d+ bytes\) - exact copy of one copy\.jpg$/m);
    expect(saved).toMatch(/Nothing was deleted\. Your photos are untouched\./);
    expect(saved).not.toMatch(/lone\.jpg/);
  });

  it("changes the one to keep, and Put it back marks nothing", async () => {
    render(<Page />);
    await pickFiles([jpeg("ALPHA", "one.jpg"), jpeg("ALPHA", "one copy.jpg", 2)]);
    await waitFor(() => expect(screen.getByLabelText("Photos picked")).toHaveTextContent(/^Photos picked2$/));
    await userEvent.click(screen.getByRole("button", { name: COPY.pick.next }));
    await userEvent.click(screen.getByRole("radio", { name: /Keep one\.jpg/ }));
    await userEvent.click(screen.getByRole("button", { name: COPY.groups.next }));
    const list = screen.getByRole("region", { name: COPY.review.listHeading });
    expect(within(list).getByText(/^one copy\.jpg/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: COPY.review.back }));
    await userEvent.click(screen.getByRole("button", { name: COPY.groups.putBack }));
    expect(screen.getByText(COPY.groups.putBackHelp)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: COPY.groups.next }));
    expect(screen.getByLabelText(COPY.review.label)).toHaveTextContent(COPY.review.empty);
    expect(screen.queryByRole("button", { name: COPY.review.save })).toBeNull();
    expect(primaries()).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: COPY.review.back }));
    await userEvent.click(screen.getByRole("button", { name: COPY.groups.markAgain }));
    await userEvent.click(screen.getByRole("button", { name: COPY.groups.next }));
    expect(screen.getByLabelText(COPY.review.label)).toHaveTextContent("1 file");
  });

  it("names look-alike groups apart and says to check", async () => {
    render(<Page />);
    await pickFiles([jpeg("ALPHA", "a.jpg"), jpeg("ALPHA NEAR bigger", "b.jpg", 2), jpeg("ALT lone photo", "c.jpg", 3)]);
    await waitFor(() => expect(screen.getByLabelText("Photos picked")).toHaveTextContent(/^Photos picked3$/));
    await userEvent.click(screen.getByRole("button", { name: COPY.pick.next }));
    expect(screen.getByRole("heading", { level: 2, name: "Group 1 of 1: Look alike, check yourself" })).toBeInTheDocument();
    expect(screen.getByText(COPY.groups.estimate)).toBeInTheDocument();
    expect(screen.getByText(COPY.groups.alikeHelp)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Keep b\.jpg/ })).toBeChecked();
  });

  it("says plainly when no copies are found", async () => {
    render(<Page />);
    await pickFiles([jpeg("ALPHA", "a.jpg"), jpeg("ALT other photo", "c.jpg", 3)]);
    await waitFor(() => expect(screen.getByLabelText("Photos picked")).toHaveTextContent(/^Photos picked2$/));
    await userEvent.click(screen.getByRole("button", { name: COPY.pick.next }));
    expect(screen.getByText(COPY.groups.none)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: COPY.groups.pickMore })).toBeEnabled();
    expect(primaries()).toHaveLength(1);
  });

  it("messy: a PDF, an empty file and a broken photo each get a calm plain message", async () => {
    render(<Page />);
    const pdf = new File(["%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n"], "statement.pdf", { type: "application/pdf" });
    const empty = new File([], "empty.jpg", { type: "image/jpeg" });
    await pickFiles([pdf, empty, jpeg("BROKEN", "broken.jpg", 4), jpeg("ALPHA", "ok.jpg", 5)], false);
    const note = await screen.findByText(/This is a PDF\./);
    const box = note.closest('[role="status"]') as HTMLElement;
    expect(within(box).getByText(/This tool needs a photo\./)).toBeInTheDocument();
    expect(within(box).getByText("empty.jpg is empty, so it was skipped.")).toBeInTheDocument();
    expect(within(box).getByText(COPY.cantOpen.damaged("broken.jpg"))).toBeInTheDocument();
    expect(within(box).getAllByRole("link").length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/NaN|undefined|Infinity/);
    await waitFor(() => expect(screen.getByLabelText("Photos picked")).toHaveTextContent(/You picked 1 photo\./));
    expect(screen.getByRole("button", { name: COPY.pick.choose })).toBeInTheDocument();
  });

  it("messy: an iPhone photo this page cannot open gets a clear message", async () => {
    render(<Page />);
    const head = [0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63, ...new TextEncoder().encode("BROKEN")];
    await pickFiles([new File([new Uint8Array(head)], "IMG_1.HEIC", { type: "image/heic" })], false);
    expect(await screen.findByText(COPY.cantOpen.gave("IMG_1.HEIC"))).toBeInTheDocument();
    expect(screen.getByText(COPY.cantOpen.explainer)).toBeInTheDocument();
  });

  it("messy: leaves out photos beyond 300 and tells the person", async () => {
    render(<Page />);
    const files = Array.from({ length: 302 }, (_, i) => jpeg(`P${i} ALT`, `p${i}.jpg`, i + 1));
    await pickFiles(files);
    await waitFor(() => expect(screen.getByLabelText("Photos picked")).toHaveTextContent(/^Photos picked300$/), { timeout: 20000 });
    expect(screen.getAllByText(/left out\. Up to 300 photos are checked at a time\./)).toHaveLength(2);
  }, 30000);

  it("messy: the same photo picked twice is added once", async () => {
    render(<Page />);
    await pickFiles([jpeg("ALPHA", "a.jpg", 7)]);
    await waitFor(() => expect(screen.getByLabelText("Photos picked")).toHaveTextContent(/You picked 1 photo\./));
    await pickFiles([jpeg("ALPHA", "a.jpg", 7), jpeg("ALT x", "b.jpg", 8)]);
    await waitFor(() => expect(screen.getByLabelText("Photos picked")).toHaveTextContent(/^Photos picked2$/));
    expect(screen.getByText(COPY.already(1))).toBeInTheDocument();
  });

  it("lets go of photo links when the page closes", async () => {
    const { unmount } = render(<Page />);
    await pickFiles([jpeg("ALPHA", "a.jpg"), jpeg("ALPHA", "a2.jpg", 2)]);
    await waitFor(() => expect(screen.getByLabelText("Photos picked")).toHaveTextContent(/^Photos picked2$/));
    unmount();
    expect(revoked.sort()).toEqual(["blob:made-up-1", "blob:made-up-2"]);
  });

  it("Start over clears the photos and can put them back", async () => {
    render(<Page />);
    await pickFiles([jpeg("ALPHA", "a.jpg"), jpeg("ALPHA", "a2.jpg", 2)]);
    await waitFor(() => expect(screen.getByLabelText("Photos picked")).toHaveTextContent(/^Photos picked2$/));
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    expect(screen.getByLabelText("Photos picked")).toHaveTextContent(COPY.pick.waiting(0));
    await userEvent.click(screen.getByRole("button", { name: "Put it back" }));
    expect(screen.getByLabelText("Photos picked")).toHaveTextContent(/^Photos picked2$/);
  });
});

describe("Photo Duplicate Finder copy", () => {
  const strings: string[] = [];
  (function walk(n: unknown) {
    if (typeof n === "string") strings.push(n);
    else if (typeof n === "function") {
      try {
        walk((n as (...a: never[]) => unknown)(...([3, 2] as never[])));
      } catch {
        /* skip */
      }
    } else if (Array.isArray(n)) n.forEach(walk);
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
  it("does not say NT or use byte counts", () => {
    for (const s of strings) expect(s).not.toMatch(/\bNT\b|\bbytes?\b/);
  });
  it("never gives advice and has no pressure words", () => {
    expect(strings.join(" ")).not.toMatch(/\byou should\b|\bwe recommend\b|\bhurry\b|\burgent\b|\blast chance\b|\bnow or\b/i);
  });
  it("says it never deletes once, and only once", () => {
    expect(COPY.intro).toMatch(/never deletes, moves or sends a photo/);
    const others = strings.filter((s) => s !== COPY.intro && !/delete the list file/.test(s));
    for (const s of others) expect(s).not.toMatch(/delete|untouched/i);
  });
});
