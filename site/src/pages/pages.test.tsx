import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TOOLS, isUsable } from "../data/tools";
import { Agents } from "./Agents";
import { Home } from "./Home";
import { Install } from "./Install";
import { NotFound } from "./NotFound";
import { Research } from "./Research";

describe("Home", () => {
  it("has the tagline, one primary button and the agents link", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1, name: "Small tools for everyday things." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Point your agent here" })).toHaveAttribute("href", "#/agents");
    // The prompt box button is the only button on the page.
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
  it("shows all tools, links only the shipped ones", () => {
    render(<Home />);
    const shipped = TOOLS.filter(isUsable);
    const links = screen.getAllByRole("link").filter((a) => (a.getAttribute("href") ?? "").startsWith("#/tools"));
    expect(links.map((a) => a.getAttribute("href")).sort()).toEqual(shipped.map((t) => `#/tools/${t.id}`).sort());
    expect(screen.getAllByText(/coming soon/i)).toHaveLength(TOOLS.length - shipped.length);
  });
  it("says how many tools are ready", () => {
    render(<Home />);
    const shipped = TOOLS.filter(isUsable).length;
    expect(shipped).toBeGreaterThan(0);
    expect(screen.getByText(new RegExp(`^${TOOLS.length} tools in all\\. ${shipped} (is|are) ready now`))).toBeInTheDocument();
    expect(screen.queryByText(/None is ready/)).toBeNull();
  });
});

describe("Agents", () => {
  it("has a Copy button that copies the sentence and says Copied", async () => {
    const user = userEvent.setup();
    render(<Agents />);
    const btn = screen.getByRole("button", { name: "Copy" });
    await user.click(btn);
    expect(await screen.findByText("Copied")).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toContain("set yourself up with NT");
  });
  it("links the short page and the builder files", () => {
    render(<Agents />);
    expect(screen.getByRole("link", { name: "llms.txt" })).toHaveAttribute("href", "./llms.txt");
    expect(screen.getByRole("link", { name: "tools.json" })).toHaveAttribute("href", "./tools.json");
    expect(screen.getByRole("heading", { name: "For builders" })).toBeInTheDocument();
  });
});

describe("other pages", () => {
  it("renders Install with the three ways", () => {
    render(<Install />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Add to Home Screen/, { selector: "li" })).toBeInTheDocument();
    expect(screen.getByText(/no internet/)).toBeInTheDocument();
  });
  it("renders Research with ten topics", () => {
    render(<Research />);
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
  });
  it("renders a calm not found page", () => {
    render(<NotFound />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "#/");
  });
});
