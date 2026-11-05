import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReviewStop } from "./ReviewStop";

describe("ReviewStop", () => {
  it("shows the notice and the summary without confirming", () => {
    const onConfirm = vi.fn();
    render(<ReviewStop summary={<p>Total: 12 dollars</p>} confirmLabel="Send now" onConfirm={onConfirm} onBack={() => {}} />);
    expect(screen.getByText("Check everything. Nothing is sent or paid until you press the button.")).toBeInTheDocument();
    expect(screen.getByText("Total: 12 dollars")).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("calls onConfirm once only when pressed", async () => {
    const onConfirm = vi.fn();
    render(<ReviewStop summary="s" confirmLabel="Send now" onConfirm={onConfirm} onBack={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Send now" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("back works and does not confirm", async () => {
    const onConfirm = vi.fn();
    const onBack = vi.fn();
    render(<ReviewStop summary="s" confirmLabel="Send now" onConfirm={onConfirm} onBack={onBack} />);
    await userEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
