import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, afterEach } from "vitest";
import { TOOLS } from "../data/tools";
import { PromptSearch } from "./PromptSearch";

afterEach(() => vi.unstubAllGlobals());

describe("PromptSearch", () => {
  it("has one labeled box and one primary button", () => {
    render(<PromptSearch tools={TOOLS} />);
    expect(screen.getByLabelText("What do you want to get done?")).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Find a tool" })).toBeInTheDocument();
  });
  it("shows nothing extra when empty", () => {
    render(<PromptSearch tools={TOOLS} />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
  });
  it("shows matches as the person types, with no network", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const user = userEvent.setup();
    render(<PromptSearch tools={TOOLS} />);
    await user.type(screen.getByLabelText("What do you want to get done?"), "scan my receipts");
    expect(screen.getByText("Receipt to Spreadsheet")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it("shows a calm message when nothing matches", async () => {
    const user = userEvent.setup();
    render(<PromptSearch tools={TOOLS} />);
    await user.type(screen.getByLabelText("What do you want to get done?"), "zzzzqq");
    expect(screen.getByRole("status")).toHaveTextContent("Nothing matches yet. Try other words.");
  });
  it("never submits anywhere", async () => {
    const user = userEvent.setup();
    render(<PromptSearch tools={TOOLS} initialQuery="tax" />);
    expect(screen.getByText("Tax Filing Helper")).toBeInTheDocument();
    const before = window.location.href;
    await user.click(screen.getByRole("button", { name: "Find a tool" }));
    expect(window.location.href).toBe(before);
    expect(screen.getByText("Tax Filing Helper")).toBeInTheDocument();
  });
});
