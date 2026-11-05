import fs from "node:fs";
import path from "node:path";
import { render, screen, within } from "@testing-library/react";
import { Shell } from "./Shell";

const css = fs.readFileSync(path.resolve(__dirname, "../styles/container.css"), "utf8");

describe("Shell", () => {
  it("has a skip link, main landmark and footer landmark with Research", () => {
    render(<Shell>hello</Shell>);
    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute("href", "#main");
    expect(screen.getByRole("main")).toHaveTextContent("hello");
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByRole("link", { name: "Research" })).toBeInTheDocument();
  });
  it("links the wordmark home", () => {
    render(<Shell>x</Shell>);
    expect(screen.getByRole("link", { name: "NT, home" })).toHaveAttribute("href", "#/");
  });
  it("renders the aside once, only when given", () => {
    const { rerender } = render(<Shell>x</Shell>);
    expect(screen.queryByRole("complementary")).toBeNull();
    rerender(<Shell aside={<p>panel</p>}>x</Shell>);
    expect(screen.getAllByText("panel")).toHaveLength(1);
  });
  it("sets a container, a readable width and a wide-only aside", () => {
    expect(css).toContain("container-type: inline-size");
    expect(css).toContain("max-width: var(--nt-measure)");
    expect(css).toMatch(/\.nt-aside\s*{\s*display:\s*none/);
    expect(css).toMatch(/@container \(min-width: 60rem\)/);
    expect(css).toContain("env(safe-area-inset-top)");
    expect(css).toContain("min-width: 0");
  });
});
