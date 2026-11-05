import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WhereYouAre } from "./WhereYouAre";

const steps = [
  { id: "a", title: "Your name" },
  { id: "b", title: "Your bank file" },
  { id: "c", title: "Check it" },
  { id: "d", title: "Finish" },
];

describe("WhereYouAre", () => {
  it("labels done, now and next in text", () => {
    render(<WhereYouAre steps={steps} current={1} answers={{ a: "Sam" }} />);
    const items = screen.getAllByRole("listitem", { hidden: true });
    expect(within(items[0]).getByText("Done")).toBeInTheDocument();
    expect(within(items[0]).getByText("Sam")).toBeInTheDocument();
    expect(within(items[1]).getByText("Now")).toBeInTheDocument();
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(within(items[2]).getByText("Next")).toBeInTheDocument();
    expect(within(items[3]).getByText("Next")).toBeInTheDocument();
  });

  it("is a native details element, closed by default", () => {
    const { container } = render(<WhereYouAre steps={steps} current={0} />);
    const d = container.querySelector("details");
    expect(d).not.toBeNull();
    expect(d).not.toHaveAttribute("open");
  });

  it("calls onJump with the index of a done step", async () => {
    const onJump = vi.fn();
    render(<WhereYouAre steps={steps} current={2} onJump={onJump} />);
    await userEvent.click(screen.getByText("Where you are"));
    await userEvent.click(screen.getByRole("button", { name: "Your bank file" }));
    expect(onJump).toHaveBeenCalledWith(1);
    expect(screen.queryByRole("button", { name: "Finish" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Check it" })).not.toBeInTheDocument();
  });
});
