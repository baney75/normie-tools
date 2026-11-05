import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Finish } from "./Finish";

const LINE = "That is your estimate. You can stop here, or change a number to try again.";

describe("Finish", () => {
  it("says the person is done, in plain words", () => {
    render(<Finish onSave={() => {}}><p>The answer</p></Finish>);
    expect(screen.getByText(LINE)).toBeInTheDocument();
  });

  it("makes Done the one main button, a link to the home page", () => {
    const { container } = render(<Finish onSave={() => {}}><p>The answer</p></Finish>);
    const done = screen.getByRole("link", { name: "I'm done" });
    expect(done).toHaveClass("primary");
    expect(done).toHaveClass("nt-finish-done");
    expect(done).toHaveAttribute("href", "#/");
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
  });

  it("keeps Print or save as a plain button that is closed at first", () => {
    render(<Finish onSave={() => {}}><p>The answer</p></Finish>);
    const save = screen.getByRole("button", { name: "Print or save" });
    expect(save).toHaveClass("nt-finish-save");
    expect(save).not.toHaveClass("primary");
    expect(save).toHaveAttribute("type", "button");
    expect(save).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Print" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Save a copy" })).toBeNull();
  });

  it("opens and closes the sheet with Print and Save a copy, and keeps Done as the one main button", async () => {
    const { container } = render(<Finish onSave={() => {}}><p>The answer</p></Finish>);
    const save = screen.getByRole("button", { name: "Print or save" });
    await userEvent.click(save);
    expect(save).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("heading", { name: "Print or save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save a copy" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Preview" })).toHaveTextContent("The answer");
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "I'm done" })).toHaveClass("primary");
    await userEvent.click(save);
    expect(save).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Save a copy" })).toBeNull();
  });

  it("calls onSave only after Save a copy and then Save the file", async () => {
    const onSave = vi.fn();
    render(<Finish onSave={onSave}><p>The answer</p></Finish>);
    await userEvent.click(screen.getByRole("button", { name: "Print or save" }));
    expect(onSave).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Save a copy" }));
    expect(onSave).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Save the file" }));
    expect(onSave).toHaveBeenCalledOnce();
  });
});
