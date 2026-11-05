import { render, screen } from "@testing-library/react";
import { TOOLS } from "../data/tools";
import { ToolPage } from "./ToolPage";

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
