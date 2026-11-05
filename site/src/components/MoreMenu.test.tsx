import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MoreMenu } from "./MoreMenu";

describe("MoreMenu", () => {
  it("is closed by default", () => {
    const { container } = render(<MoreMenu items={[{ label: "Print", onClick: () => {} }]} />);
    expect(container.querySelector("details")).not.toHaveAttribute("open");
    expect(screen.getByText("More").tagName).toBe("SUMMARY");
  });

  it("shows items when opened and runs clicks", async () => {
    const onClick = vi.fn();
    const { container } = render(
      <MoreMenu items={[{ label: "Print", onClick }, { label: "Help page", href: "/help" }]} />,
    );
    await userEvent.click(screen.getByText("More"));
    expect(container.querySelector("details")).toHaveAttribute("open");
    await userEvent.click(screen.getByRole("button", { name: "Print" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Help page" })).toHaveAttribute("href", "/help");
    await userEvent.click(screen.getByText("More"));
    expect(container.querySelector("details")).not.toHaveAttribute("open");
  });

  it("is reachable by keyboard (summary takes focus)", async () => {
    // jsdom does not toggle <details> on Enter; browsers do natively.
    render(<MoreMenu items={[{ label: "Print", onClick: () => {} }]} />);
    await userEvent.tab();
    expect(screen.getByText("More")).toHaveFocus();
  });

  it("renders nothing with no items", () => {
    const { container } = render(<MoreMenu items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
