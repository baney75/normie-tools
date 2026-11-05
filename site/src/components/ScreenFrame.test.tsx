import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ScreenFrame } from "./ScreenFrame";

describe("ScreenFrame", () => {
  it("has an h1 title and exactly one primary action", async () => {
    const onClick = vi.fn();
    const { container } = render(
      <ScreenFrame title="Read your bank file" primary={{ label: "Choose file", onClick }} more={[{ label: "Print", onClick: () => {} }]}>
        hi
      </ScreenFrame>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Read your bank file" })).toBeInTheDocument();
    expect(container.querySelectorAll(".nt-primary")).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "Choose file" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByText("More")).toBeInTheDocument();
  });

  it("can be a div so it does not nest a second main", () => {
    const { container } = render(<ScreenFrame title="T" as="div" />);
    expect(container.querySelector("main")).toBeNull();
    expect(container.querySelector("div.nt-frame")).not.toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders a link primary when href is given", () => {
    render(<ScreenFrame title="T" primary={{ label: "Go", href: "/go" }} />);
    expect(screen.getByRole("link", { name: "Go" })).toHaveClass("nt-primary");
  });

  it("reserves space for async content", () => {
    const { container, rerender } = render(<ScreenFrame title="T" />);
    expect((container.querySelector(".nt-frame-body") as HTMLElement).style.minHeight).toBe("12rem");
    rerender(<ScreenFrame title="T" reserve="20rem" />);
    expect((container.querySelector(".nt-frame-body") as HTMLElement).style.minHeight).toBe("20rem");
  });

  it("has no primary or more when not given", () => {
    const { container } = render(<ScreenFrame title="T" />);
    expect(container.querySelectorAll(".nt-primary")).toHaveLength(0);
    expect(screen.queryByText("More")).not.toBeInTheDocument();
  });
});
