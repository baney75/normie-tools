import { render, screen } from "@testing-library/react";
import { TOOLS } from "../data/tools";
import { REGISTRY, pageFor } from "../tools/registry";
import { ToolPage } from "./ToolPage";

vi.mock("../data/tools", async (importOriginal) => {
  const real = await importOriginal<typeof import("../data/tools")>();
  const ghost = { id: "ghost-shipped", name: "Ghost Shipped", status: "shipped" as const, routes: ["/tools/ghost-shipped"] };
  return { ...real, TOOLS: [...real.TOOLS, ghost] };
});

describe("ToolPage ship gate", () => {
  it("shows a calm message for an unknown tool", () => {
    render(<ToolPage id="nope" />);
    expect(screen.getByText("We could not find that tool.")).toBeInTheDocument();
  });
  it.each(TOOLS.filter((t) => t.status !== "shipped").map((t) => [t.id, t.name]))(
    "%s is not usable",
    (id, name) => {
      const { container } = render(<ToolPage id={id} />);
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
      expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
      expect(screen.getByText("This tool is not ready yet.")).toBeInTheDocument();
      expect(container.querySelector("form, input, textarea, select, button")).toBeNull();
      expect(screen.getByRole("link")).toHaveAttribute("href", "#/");
    },
  );
});

describe("ToolPage shipped tools", () => {
  it("every shipped tool has a registered page, and every registered page is shipped", () => {
    const shipped = TOOLS.filter((t) => t.status === "shipped" && t.id !== "ghost-shipped").map((t) => t.id).sort();
    expect(Object.keys(REGISTRY).sort()).toEqual(shipped);
  });
  it("pageFor ignores names that are not tool ids", () => {
    expect(pageFor("constructor")).toBeUndefined();
    expect(pageFor("nope")).toBeUndefined();
  });
  it("shows a calm loading line, then the registered page", async () => {
    render(<ToolPage id="loan-explainer" />);
    expect(screen.getByRole("status")).toHaveTextContent("Getting your tool ready.");
    expect(await screen.findByRole("heading", { level: 1, name: "Loan Explainer" })).toBeInTheDocument();
    expect(screen.getByLabelText("Amount borrowed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "#/");
  });
  it("falls back to the old placeholder when a shipped tool has no page yet", () => {
    render(<ToolPage id="ghost-shipped" />);
    expect(screen.getByRole("heading", { name: "Ghost Shipped" })).toBeInTheDocument();
    expect(screen.getByText("Tool page")).toBeInTheDocument();
  });
});
