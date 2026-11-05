import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RemoveAsk, amountText } from "./RemoveAsk";

describe("RemoveAsk", () => {
  it("shows which line goes and has two buttons", async () => {
    const onRemove = vi.fn();
    const onKeep = vi.fn();
    render(<RemoveAsk what="Card B, balance $900" onRemove={onRemove} onKeep={onKeep} />);
    expect(screen.getByRole("group", { name: "Before you remove" })).toHaveTextContent("Card B, balance $900");
    await userEvent.click(screen.getByRole("button", { name: "Keep it" }));
    expect(onKeep).toHaveBeenCalledOnce();
    expect(onRemove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Yes, remove it" }));
    expect(onRemove).toHaveBeenCalledOnce();
  });
  it("writes an amount with a dollar sign, or says none was typed", () => {
    expect(amountText("40.50")).toBe("$40.50");
    expect(amountText("$12,000")).toBe("$12,000");
    expect(amountText("  ")).toBe("no amount typed");
  });
});
