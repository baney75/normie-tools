import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TOOLS as ALL, isUsable, type Tool } from "../data/tools";
import { ToolGrid, iconFor } from "./ToolGrid";

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
  it("is one plain list of rows with no group headings", () => {
    const { container } = render(<ToolGrid tools={ALL} />);
    const list = container.querySelector("ul.nt-rows");
    expect(list).not.toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(ALL.length);
    expect(screen.queryAllByRole("heading")).toHaveLength(0);
  });
  it("sends every coming soon tool to the coming page with its name and Not ready yet", () => {
    render(<ToolGrid tools={SOON} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(SOON.length);
    for (const a of links) expect(a).toHaveAttribute("href", "#/coming");
    for (const t of SOON) expect(screen.getByText(t.name)).toBeInTheDocument();
    expect(screen.getAllByText("Not ready yet")).toHaveLength(SOON.length);
    expect(screen.queryByText("Coming soon")).toBeNull();
    expect(document.querySelectorAll("a[href^='#/tools']")).toHaveLength(0);
  });
  it("in the real list, lists shipped tools first and links each to its page", () => {
    const { container } = render(<ToolGrid tools={ALL} />);
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs.slice(0, SHIPPED.length)).toEqual(SHIPPED.map((t) => `#/tools/${t.id}`));
    expect(hrefs.slice(SHIPPED.length)).toEqual(SOON.map(() => "#/coming"));
    for (const t of SHIPPED) {
      const link = screen.getByRole("link", { name: new RegExp(t.name) });
      expect(link).toHaveAttribute("href", `#/tools/${t.id}`);
      expect(link).toHaveTextContent(t.question!);
    }
    expect(container.querySelectorAll("[aria-disabled='true']")).toHaveLength(0);
  });
  it("puts shipped tools first even when the input has them last", () => {
    render(<ToolGrid tools={[...SOON.slice(0, 2), shipped]} />);
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "#/tools/demo");
    expect(links[1]).toHaveAttribute("href", "#/coming");
  });
  it("links a shipped tool by hash route, shows its question over its name, and has no Not ready yet", () => {
    render(<ToolGrid tools={[{ ...shipped, question: "What is my demo?" }]} />);
    const link = screen.getByRole("link", { name: /Demo Tool/ });
    expect(link).toHaveAttribute("href", "#/tools/demo");
    expect(link).toHaveTextContent("What is my demo?");
    expect(link).toHaveTextContent("Demo Tool");
    expect(screen.queryByText("Not ready yet")).toBeNull();
  });
  it("falls back to the name when a shipped tool has no question", () => {
    render(<ToolGrid tools={[shipped]} />);
    expect(screen.getByRole("link", { name: "Demo Tool" })).toHaveAttribute("href", "#/tools/demo");
  });
  it("gives every shipped tool its own icon, not the fallback", () => {
    for (const t of SHIPPED) expect(iconFor(t.icon), t.id).not.toBe(iconFor(undefined));
  });
  it("uses a fallback icon for tools without one", () => {
    const { container } = render(<ToolGrid tools={[{ ...shipped, icon: undefined }]} />);
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
