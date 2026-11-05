import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SeeAnswer } from "./SeeAnswer";

function Demo({ main, first = "", second = "" }: { main: boolean; first?: string; second?: string }) {
  return (
    <div>
      <section id="nt-answer" tabIndex={-1} aria-label="Answer">The answer</section>
      <div className="nt-tool-inputs">
        <input className="nt-field-input" aria-label="First box" defaultValue={first} />
        <input className="nt-field-input" aria-label="Second box" defaultValue={second} />
        <SeeAnswer label="See my answer" main={main} />
      </div>
    </div>
  );
}

describe("SeeAnswer", () => {
  it("is the one filled button when main is true", () => {
    const { container } = render(<Demo main />);
    const button = screen.getByRole("button", { name: "See my answer" });
    expect(button).toHaveClass("primary");
    expect(button).toHaveClass("nt-see-btn");
    expect(button).toHaveAttribute("type", "button");
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
  });

  it("renders nothing when main is false, so there is no button once there is an answer", () => {
    const { container } = render(<SeeAnswer label="See my answer" main={false} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.querySelectorAll(".primary")).toHaveLength(0);
  });

  it("drops the button from a page when the answer arrives", () => {
    const { rerender } = render(<Demo main />);
    expect(screen.getByRole("button", { name: "See my answer" })).toBeInTheDocument();
    rerender(<Demo main={false} />);
    expect(screen.queryByRole("button", { name: "See my answer" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Go up to my answer" })).toBeNull();
  });

  it("when main, puts the cursor in the first empty box", async () => {
    render(<Demo main />);
    await userEvent.click(screen.getByRole("button", { name: "See my answer" }));
    expect(screen.getByLabelText("First box")).toHaveFocus();
  });

  it("when main, skips boxes that already have something and goes to the first empty one", async () => {
    render(<Demo main first="12" />);
    await userEvent.click(screen.getByRole("button", { name: "See my answer" }));
    expect(screen.getByLabelText("Second box")).toHaveFocus();
  });

  it("when main but no box is empty, focuses the answer card (#nt-answer)", async () => {
    render(<Demo main first="1" second="2" />);
    await userEvent.click(screen.getByRole("button", { name: "See my answer" }));
    expect(screen.getByLabelText("Answer")).toHaveFocus();
  });

  it("does not fail when the page has no answer card or boxes", async () => {
    render(<SeeAnswer label="See my answer" main />);
    await userEvent.click(screen.getByRole("button", { name: "See my answer" }));
    expect(screen.getByRole("button", { name: "See my answer" })).toBeInTheDocument();
  });

  it("when main, skips optional boxes and goes to the first needed empty box", async () => {
    render(
      <div>
        <section id="nt-answer" tabIndex={-1} aria-label="Answer">The answer</section>
        <div className="nt-tool-inputs">
          <input className="nt-field-input" aria-label="Amount" defaultValue="12000" />
          <input className="nt-field-input" aria-label="Fees" data-optional="" defaultValue="" />
          <input className="nt-field-input" aria-label="Rate" defaultValue="" />
          <SeeAnswer label="See my answer" main />
        </div>
      </div>,
    );
    await userEvent.click(screen.getByRole("button", { name: "See my answer" }));
    expect(screen.getByLabelText("Rate")).toHaveFocus();
  });
});

