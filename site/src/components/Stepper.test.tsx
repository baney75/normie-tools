import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Stepper } from "./Stepper";

const steps = Array.from({ length: 7 }, (_, i) => ({ id: `s${i}`, title: `Title ${i + 1}` }));

describe("Stepper", () => {
  it("says the step in words and names the progress bar", () => {
    render(<Stepper steps={steps} current={2} flowTitle="Taxes">body</Stepper>);
    expect(screen.getByRole("heading", { name: "Step 3 of 7" })).toBeInTheDocument();
    const bar = screen.getByRole("progressbar", { name: "Step 3 of 7 progress" });
    expect(bar).toHaveAttribute("value", "3");
    expect(bar).toHaveAttribute("max", "7");
    expect(screen.getByRole("heading", { name: "Title 3" })).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
  });

  it("shows the step count intro only on the first step", () => {
    const { rerender } = render(<Stepper steps={steps} current={0} flowTitle="T" />);
    expect(screen.getByText("This has 7 steps.")).toBeInTheDocument();
    rerender(<Stepper steps={steps} current={1} flowTitle="T" />);
    expect(screen.queryByText("This has 7 steps.")).not.toBeInTheDocument();
  });

  it("has exactly one primary button and wires Back and Next", async () => {
    const onBack = vi.fn();
    const onNext = vi.fn();
    const { container } = render(
      <Stepper steps={steps} current={1} flowTitle="T" onBack={onBack} onNext={onNext} />,
    );
    expect(container.querySelectorAll(".nt-primary")).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("clamps out of range steps", () => {
    const { rerender } = render(<Stepper steps={steps} current={99} flowTitle="T" />);
    expect(screen.getByRole("heading", { name: "Step 7 of 7" })).toBeInTheDocument();
    rerender(<Stepper steps={steps} current={-4} flowTitle="T" />);
    expect(screen.getByRole("heading", { name: "Step 1 of 7" })).toBeInTheDocument();
  });
});
