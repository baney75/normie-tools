import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { gradeOf } from "../../../../scripts/check-reading-level.mjs";
import { readSaved, useAutosave } from "../../lib/useAutosave";
import { StartOver } from "./StartOver";

const EMPTY = { a: "", b: "" };

function Demo() {
  const flow = useAutosave("demo", EMPTY);
  return (
    <div>
      <input aria-label="A" value={flow.value.a} onChange={(e) => flow.setValue({ ...flow.value, a: e.target.value })} />
      <input aria-label="B" value={flow.value.b} onChange={(e) => flow.setValue({ ...flow.value, b: e.target.value })} />
      <StartOver flowId="demo" value={flow.value} empty={EMPTY} onChange={flow.setValue} />
    </div>
  );
}

beforeEach(() => window.localStorage.clear());

describe("StartOver", () => {
  it("shows nothing while nothing is typed, then offers Start over with a short undo note", async () => {
    render(<Demo />);
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
    expect(screen.queryByText("You can put your numbers back.")).toBeNull();
    expect(document.querySelector("details.nt-more")).toBeNull();
    await userEvent.type(screen.getByLabelText("A"), "1");
    const more = document.querySelector("details.nt-more") as HTMLDetailsElement;
    expect(more).not.toBeNull();
    expect(more.open).toBe(false);
    expect(more.querySelector("summary")).toHaveTextContent("More options");
    await userEvent.click(screen.getByText("More options"));
    expect(more.open).toBe(true);
    const button = screen.getByRole("button", { name: "Start over" });
    expect(more).toContainElement(button);
    expect(button).toBeEnabled();
    const note = screen.getByText("You can put your numbers back.");
    expect(note.tagName).toBe("SPAN");
    expect(note).toHaveClass("nt-startover-note");
    expect(button.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(note.textContent).not.toMatch(/\u2013|\u2014/);
    expect(gradeOf(note.textContent ?? "")!.grade).toBeLessThanOrEqual(7);
    // The old long hint stays gone.
    expect(screen.queryByText(/Start over asks first/)).toBeNull();
  });

  it("clears the boxes and the saved copy, then puts everything back exactly", async () => {
    render(<Demo />);
    await userEvent.type(screen.getByLabelText("A"), "12.5");
    await userEvent.type(screen.getByLabelText("B"), "7");
    expect(readSaved("demo")).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    expect(screen.getByLabelText("A")).toHaveValue("");
    expect(screen.getByLabelText("B")).toHaveValue("");
    expect(readSaved("demo")).toBeNull();
    expect(screen.getByText(/Your numbers are cleared\./)).toBeInTheDocument();
    // The cleared message sits outside More options, which is gone while it shows.
    expect(document.querySelector("details.nt-more")).toBeNull();
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Put it back" }));
    expect(screen.getByLabelText("A")).toHaveValue("12.5");
    expect(screen.getByLabelText("B")).toHaveValue("7");
    expect(screen.queryByText(/Your numbers are cleared\./)).toBeNull();
    expect(screen.getByRole("button", { name: "Start over" })).toBeEnabled();
    expect(document.querySelector("details.nt-more")).toContainElement(screen.getByRole("button", { name: "Start over" }));
  });

  it("asks inside More options, and Keep my numbers leaves the boxes alone", async () => {
    render(<Demo />);
    await userEvent.type(screen.getByLabelText("A"), "4");
    await userEvent.click(screen.getByText("More options"));
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    const more = document.querySelector("details.nt-more") as HTMLDetailsElement;
    expect(more).toContainElement(screen.getByRole("button", { name: "Clear the boxes" }));
    expect(more).toContainElement(screen.getByRole("button", { name: "Keep my numbers" }));
    await userEvent.click(screen.getByRole("button", { name: "Keep my numbers" }));
    expect(screen.getByLabelText("A")).toHaveValue("4");
    expect(screen.getByRole("button", { name: "Start over" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear the boxes" })).toBeNull();
  });

  it("stops offering the old numbers once the person types again", async () => {
    render(<Demo />);
    await userEvent.type(screen.getByLabelText("A"), "5");
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear the boxes" }));
    await userEvent.type(screen.getByLabelText("A"), "9");
    expect(screen.queryByRole("button", { name: "Put it back" })).toBeNull();
  });
});
