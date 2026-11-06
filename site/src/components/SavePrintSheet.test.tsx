import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { SavePrintSheet } from "./SavePrintSheet";

describe("SavePrintSheet", () => {
  it("shows the preview next to the buttons and is not a modal", () => {
    render(
      <SavePrintSheet title="Your list" onSave={() => {}}>
        <p>Milk and eggs</p>
      </SavePrintSheet>,
    );
    expect(screen.getByRole("group", { name: "Preview" })).toHaveTextContent("Milk and eggs");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("heading", { name: "Your list" })).toBeInTheDocument();
  });
  it("prints through the given handler", async () => {
    const onPrint = vi.fn();
    render(
      <SavePrintSheet title="T" onSave={() => {}} onPrint={onPrint}>
        <p>x</p>
      </SavePrintSheet>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Print" }));
    expect(onPrint).toHaveBeenCalledOnce();
  });
  it("uses window.print by default", async () => {
    const spy = vi.spyOn(window, "print").mockImplementation(() => {});
    render(
      <SavePrintSheet title="T" onSave={() => {}}>
        <p>x</p>
      </SavePrintSheet>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Print" }));
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
  it("saves, passes the copy, and says Saved with no timer", async () => {
    const onSave = vi.fn();
    const blob = new Blob(["hi"]);
    render(
      <SavePrintSheet title="T" onSave={onSave} blob={blob}>
        <p>x</p>
      </SavePrintSheet>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("");
    await userEvent.click(screen.getByRole("button", { name: "Save a copy" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/Saves a file on this phone\. Nothing leaves it/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Save the file" }));
    expect(onSave).toHaveBeenCalledWith(blob);
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });
  it("shows Undo only when it can, and Undo clears Saved", async () => {
    const onUndo = vi.fn();
    const { rerender } = render(
      <SavePrintSheet title="T" onSave={() => {}}>
        <p>x</p>
      </SavePrintSheet>,
    );
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
    rerender(
      <SavePrintSheet title="T" onSave={() => {}} canUndo onUndo={onUndo}>
        <p>x</p>
      </SavePrintSheet>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save a copy" }));
    await userEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onUndo).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent("");
  });
  it("does nothing without a preview", () => {
    render(<SavePrintSheet title="T" onSave={() => {}}>{null}</SavePrintSheet>);
    expect(screen.getByRole("button", { name: "Print" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save a copy" })).toBeDisabled();
  });
  it("says why the buttons are off, only while there is no preview", () => {
    const { rerender } = render(<SavePrintSheet title="T" onSave={() => {}}>{null}</SavePrintSheet>);
    expect(screen.getByText("They work after you type your numbers.")).toBeInTheDocument();
    rerender(<SavePrintSheet title="T" onSave={() => {}}><p>x</p></SavePrintSheet>);
    expect(screen.queryByText("They work after you type your numbers.")).toBeNull();
  });
  it("no longer shows the long note under the buttons", () => {
    render(<SavePrintSheet title="T" onSave={() => {}}><p>x</p></SavePrintSheet>);
    expect(screen.queryByText(/Print opens a preview/)).toBeNull();
    expect(screen.queryByText(/delete the file any time to undo/)).toBeNull();
  });
});
