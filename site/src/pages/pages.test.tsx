import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PAGES } from "../copy/pages";
import { TOOLS, isUsable } from "../data/tools";
import { Footer } from "../components/Footer";
import { Agents } from "./Agents";
import { Coming } from "./Coming";
import { Private } from "./Private";
import { Home } from "./Home";
import { Install } from "./Install";
import { NotFound } from "./NotFound";
import { Research } from "./Research";

describe("Home", () => {
  const shipped = TOOLS.filter(isUsable);
  const soon = TOOLS.filter((t) => !isUsable(t));

  it("has the tagline, subline, promise and a search box with no button", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1, name: "Small tools for everyday things." })).toBeInTheDocument();
    expect(screen.getByText("Use them yourself, or ask your AI app.")).toBeInTheDocument();
    expect(screen.getByText(PAGES.home.promise)).toBeInTheDocument();
    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.getByLabelText("What do you want to get done?")).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Find a tool" })).toBeNull();
  });
  it("has no agents link, no tool count and no All tools grid", () => {
    render(<Home />);
    expect(screen.queryByRole("link", { name: "Point your agent here" })).toBeNull();
    expect(screen.queryByText(/tools in all/)).toBeNull();
    expect(screen.queryByRole("heading", { name: "All tools" })).toBeNull();
  });
  it("lists only the shipped tools under Ready to use, each linking to its page", () => {
    render(<Home />);
    expect(shipped.length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { level: 2, name: "Ready to use" })).toBeInTheDocument();
    const toolLinks = screen.getAllByRole("link").filter((a) => (a.getAttribute("href") ?? "").startsWith("#/tools"));
    expect(toolLinks.map((a) => a.getAttribute("href")).sort()).toEqual(shipped.map((t) => `#/tools/${t.id}`).sort());
    for (const t of shipped) {
      const link = screen.getByRole("link", { name: new RegExp(t.name) });
      expect(link).toHaveAttribute("href", `#/tools/${t.id}`);
      expect(link).toHaveTextContent(t.question!);
    }
    expect(screen.getAllByRole("listitem")).toHaveLength(shipped.length);
  });
  it("names no coming soon tool and shows no Not ready yet or Coming soon", () => {
    render(<Home />);
    expect(soon.length).toBeGreaterThan(0);
    for (const t of soon) expect(screen.queryByText(t.name)).toBeNull();
    expect(screen.queryByText(/Not ready yet/)).toBeNull();
    expect(screen.queryByText(/coming soon/i)).toBeNull();
  });
  it("links to the coming page", () => {
    render(<Home />);
    expect(screen.getByText(/More tools are on the way\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See what is coming" })).toHaveAttribute("href", "#/coming");
  });
  it("still finds a coming soon tool when the person searches for it", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.type(screen.getByLabelText("What do you want to get done?"), "scan my receipts");
    expect(screen.getByText("Receipt to Spreadsheet")).toBeInTheDocument();
  });
});

describe("Coming", () => {
  const soon = TOOLS.filter((t) => !isUsable(t));
  const shipped = TOOLS.filter(isUsable);

  it("has the heading, an intro and a back link to home", () => {
    render(<Coming />);
    expect(screen.getByRole("heading", { level: 1, name: "Tools on the way" })).toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "#/");
    expect(links[0]).toHaveTextContent("Back to home");
  });
  it("lists every coming soon tool as plain text, once", () => {
    render(<Coming />);
    expect(soon.length).toBeGreaterThan(0);
    expect(screen.getAllByRole("listitem")).toHaveLength(soon.length);
    for (const t of soon) expect(screen.getByText(t.name, { selector: "li" })).toBeInTheDocument();
  });
  it("lists no shipped tool and links to no tool", () => {
    const { container } = render(<Coming />);
    for (const t of shipped) expect(screen.queryByText(t.name)).toBeNull();
    expect(container.querySelectorAll("a[href^='#/tools']")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
  it("groups the tools under a heading for each group", () => {
    render(<Coming />);
    const groups = [...new Set(soon.map((t) => t.group).filter(Boolean))] as string[];
    expect(groups.length).toBeGreaterThan(1);
    for (const g of groups) {
      const heading = screen.getByRole("heading", { level: 2, name: g });
      const section = heading.closest("section")!;
      const expected = soon.filter((t) => t.group === g).map((t) => t.name);
      expect(within(section).getAllByRole("listitem").map((li) => li.textContent)).toEqual(expected);
    }
  });
});

describe("Private", () => {
  it("says in plain words that nothing is sent, and links the code as the way to check", () => {
    render(<Private />);
    expect(screen.getByRole("heading", { level: 1, name: PAGES.private.title })).toBeInTheDocument();
    for (const line of PAGES.private.lines) expect(screen.getByText(line)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: PAGES.private.checkLink })).toHaveAttribute("href", "https://github.com/baney75/normie-tools");
    expect(screen.getByRole("link", { name: PAGES.private.back })).toHaveAttribute("href", "#/");
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

describe("Footer", () => {
  it("links to the code and the skills", () => {
    render(<Footer />);
    const code = screen.getByRole("link", { name: "See the code" });
    expect(code).toHaveAttribute("href", "https://github.com/baney75/normie-tools");
    expect(code).toHaveAttribute("rel", "noopener noreferrer");
    const skills = screen.getByRole("link", { name: "Ready-made helpers" });
    expect(skills).toHaveAttribute("href", "https://github.com/baney75/normie-tools/tree/main/skills");
    expect(skills).toHaveAttribute("rel", "noopener noreferrer");
  });
});
