import { render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TOOLS as ALL, isUsable, type Tool } from "../data/tools";
import { ToolGrid } from "./ToolGrid";

const SOON = ALL.filter((t) => !isUsable(t));
const SHIPPED = ALL.filter(isUsable);

const shipped: Tool = {
  id: "demo",
  name: "Demo Tool",
  status: "shipped",
  group: "Money",
  routes: ["/tools/demo"],
  icon: "receipt",
};

describe("ToolGrid", () => {
  it("gives coming soon tools no link or button", () => {
    render(<ToolGrid tools={SOON} />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(document.querySelectorAll("[href]")).toHaveLength(0);
    expect(document.querySelectorAll("[aria-disabled='true']")).toHaveLength(SOON.length);
  });
  it("shows the badge on every coming soon card", () => {
    render(<ToolGrid tools={SOON} />);
    expect(screen.getAllByText("Coming soon")).toHaveLength(SOON.length);
  });
  it("in the real list, links every shipped tool and keeps the rest inert", () => {
    const { container } = render(<ToolGrid tools={ALL} />);
    expect(screen.getAllByRole("link")).toHaveLength(SHIPPED.length);
    for (const t of SHIPPED) expect(screen.getByRole("link", { name: t.name })).toHaveAttribute("href", `#/tools/${t.id}`);
    expect(container.querySelectorAll("[aria-disabled='true']")).toHaveLength(SOON.length);
    expect(container.querySelectorAll("[aria-disabled='true'] a")).toHaveLength(0);
  });
  it("links a shipped tool by hash route and hides the badge", () => {
    render(<ToolGrid tools={[shipped]} />);
    const link = screen.getByRole("link", { name: "Demo Tool" });
    expect(link).toHaveAttribute("href", "#/tools/demo");
    expect(screen.queryByText("Coming soon")).toBeNull();
  });
  it("shows group headings", () => {
    render(<ToolGrid tools={ALL} />);
    const money = screen.getByRole("heading", { name: "Money" });
    expect(money).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Taxes" })).toBeInTheDocument();
    const section = money.closest("section")!;
    expect(within(section).getByText("Save Me Money")).toBeInTheDocument();
  });
  it("uses a fallback icon for tools without one", () => {
    const { container } = render(<ToolGrid tools={[{ ...shipped, icon: undefined }]} />);
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
