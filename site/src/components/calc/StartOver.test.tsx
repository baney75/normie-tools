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
  it("is disabled while nothing is typed and says what it does in plain words", () => {
    render(<Demo />);
    expect(screen.getByRole("button", { name: "Start over" })).toBeDisabled();
    const hint = screen.getByText("Start over clears the boxes. You can put them back.");
    expect(hint.textContent).not.toMatch(/\u2013|\u2014/);
    expect(gradeOf(hint.textContent ?? "")!.grade).toBeLessThanOrEqual(7);
  });

  it("clears the boxes and the saved copy, then puts everything back exactly", async () => {
    render(<Demo />);
    await userEvent.type(screen.getByLabelText("A"), "12.5");
    await userEvent.type(screen.getByLabelText("B"), "7");
    expect(readSaved("demo")).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.getByLabelText("A")).toHaveValue("");
    expect(screen.getByLabelText("B")).toHaveValue("");
    expect(readSaved("demo")).toBeNull();
    expect(screen.getByText(/Your numbers are cleared\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Put it back" }));
    expect(screen.getByLabelText("A")).toHaveValue("12.5");
    expect(screen.getByLabelText("B")).toHaveValue("7");
    expect(screen.queryByText(/Your numbers are cleared\./)).toBeNull();
    expect(screen.getByRole("button", { name: "Start over" })).toBeEnabled();
  });

  it("stops offering the old numbers once the person types again", async () => {
    render(<Demo />);
    await userEvent.type(screen.getByLabelText("A"), "5");
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.type(screen.getByLabelText("A"), "9");
    expect(screen.queryByRole("button", { name: "Put it back" })).toBeNull();
  });
});
