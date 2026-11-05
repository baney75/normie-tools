import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ComingSoonBadge, needsComingSoonBadge } from "./ComingSoonBadge";

describe("ComingSoonBadge", () => {
  it("shows the words, not only color", () => {
    render(<ComingSoonBadge />);
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });
  it("hides the icon from screen readers", () => {
    const { container } = render(<ComingSoonBadge />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
  it("helper says a non-shipped tool needs the badge", () => {
    expect(needsComingSoonBadge({ status: "coming_soon" })).toBe(true);
    expect(needsComingSoonBadge({ status: "shipped" })).toBe(false);
  });
});
