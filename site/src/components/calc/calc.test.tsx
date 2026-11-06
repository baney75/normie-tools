import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { ErrorNote, MoneyField, NumberField, PercentField, ResultCard } from ".";

function Box({ Comp, label }: { Comp: typeof MoneyField; label: string }) {
  const [v, setV] = useState("");
  return <Comp label={label} value={v} onChange={setV} />;
}

describe("calculator fields", () => {
  it.each([
    ["MoneyField", MoneyField, "$"],
    ["PercentField", PercentField, "%"],
  ] as const)("%s has a label above, decimal keypad, no autofill, and takes typing", async (_n, Comp, mark) => {
    const { container } = render(<Box Comp={Comp as typeof MoneyField} label="Some number" />);
    const input = screen.getByLabelText("Some number");
    expect(input).toHaveAttribute("inputmode", "decimal");
    expect(input).toHaveAttribute("autocomplete", "off");
    expect(input).toHaveAttribute("type", "text");
    await userEvent.type(input, "12.5");
    expect(input).toHaveValue("12.5");
    expect(container.textContent).toContain(mark);
    // The label comes before the box in the page.
    const label = container.querySelector("label")!;
    expect(label.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("NumberField uses the number keypad by default and can show a unit", () => {
    render(<NumberField label="How long" value="" onChange={() => {}} unit="months" />);
    expect(screen.getByLabelText("How long")).toHaveAttribute("inputmode", "numeric");
    expect(screen.getByText("months")).toBeInTheDocument();
  });

  it("shows optional, a hint, and a plain error tied to the box", () => {
    render(<MoneyField label="Fees" value="x" onChange={() => {}} optional hint="From your paper." error="Use a dollar amount." />);
    const input = screen.getByLabelText(/Fees/);
    expect(screen.getByText("(optional)")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    const described = input.getAttribute("aria-describedby")!.split(" ");
    expect(described).toHaveLength(2);
    expect(document.getElementById(described[1])).toHaveTextContent("Use a dollar amount.");
    expect(screen.getByText("From your paper.")).toBeInTheDocument();
  });

  it("is not marked invalid with no error", () => {
    render(<MoneyField label="Fees" value="" onChange={() => {}} />);
    expect(screen.getByLabelText("Fees")).not.toHaveAttribute("aria-invalid");
  });
});

describe("ResultCard and ErrorNote", () => {
  it("shows the label, the big answer and the lines under it in a live region", () => {
    render(<ResultCard label="Monthly payment" answer="$304.22"><p>Estimate.</p></ResultCard>);
    const card = screen.getByLabelText("Monthly payment");
    expect(card).toHaveAttribute("aria-live", "polite");
    expect(card).toHaveTextContent("$304.22");
    expect(card).toHaveTextContent("Estimate.");
    expect(card.querySelector(".nt-result-answer")).not.toBeNull();
  });
  it("shows a short unit after the big answer", () => {
    render(<ResultCard label="Each month" answer="$304.22" unit="a month" />);
    const card = screen.getByLabelText("Each month");
    expect(card.querySelector(".nt-result-answer")).toHaveTextContent("$304.22 a month");
    expect(card.querySelector(".nt-result-unit")).toHaveTextContent("a month");
  });
  it("waits with plain words, not a fake button, until there is an answer", () => {
    const { rerender } = render(<ResultCard label="Each month" />);
    const card = screen.getByLabelText("Each month");
    expect(card).toHaveTextContent("Type your numbers to see your answer.");
    expect(card.querySelector(".nt-result-answer")).toBeNull();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    rerender(<ResultCard label="Each month" waiting="Type your pay to start." />);
    expect(screen.getByLabelText("Each month")).toHaveTextContent("Type your pay to start.");
    rerender(<ResultCard label="Each month" answer="$1.00" waiting="Type your pay to start." />);
    expect(screen.getByLabelText("Each month")).not.toHaveTextContent("Type your pay to start.");
  });
  it("shows no Show my answer, closing line, Done link or Change a number", () => {
    const { rerender } = render(<ResultCard label="Each month" />);
    rerender(<ResultCard label="Each month" answer="$304.22"><p>Estimate.</p></ResultCard>);
    expect(screen.queryByText(/Show my answer|That is your answer|Done\. Back to home|Change a number/)).toBeNull();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
  it("while waiting, shows only the waiting words and not the label line, but keeps the name for screen readers", () => {
    const { container } = render(<ResultCard label="Each month" waiting="Type your pay to start." />);
    const card = screen.getByLabelText("Each month");
    expect(card).toHaveTextContent(/^Type your pay to start\.$/);
    expect(container.querySelector(".nt-result-label")).toBeNull();
    expect(card).toHaveAttribute("aria-label", "Each month");
  });
  it("is the target the See button jumps to: id nt-answer and focusable by script only", () => {
    const { rerender } = render(<ResultCard label="Each month" />);
    for (const answer of [undefined, "$1.00"]) {
      rerender(<ResultCard label="Each month" answer={answer} />);
      const card = screen.getByLabelText("Each month");
      expect(card).toHaveAttribute("id", "nt-answer");
      expect(card).toHaveAttribute("tabindex", "-1");
      card.focus();
      expect(card).toHaveFocus();
    }
  });
  it("shows the label line once there is an answer, and the answer", () => {
    const { container, rerender } = render(<ResultCard label="Each month" />);
    expect(container.querySelector(".nt-result-label")).toBeNull();
    rerender(<ResultCard label="Each month" answer="$1.00" />);
    expect(container.querySelector(".nt-result-label")).toHaveTextContent("Each month");
    expect(container.querySelector(".nt-result-tag")).toBeNull();
  });
  it("puts the step label above the label and shows text answers in the text style", () => {
    render(<ResultCard label="Best way" answer="Free File" step="Step 2 of 2" />);
    const card = screen.getByLabelText("Best way");
    expect(card).toHaveTextContent("Step 2 of 2");
    expect(card.querySelector(".nt-result-answer-text")).toHaveTextContent("Free File");
  });
  it("ErrorNote starts with a word, not only a color", () => {
    render(<ErrorNote id="e1">Use a number.</ErrorNote>);
    expect(screen.getByText("Use a number.", { exact: false })).toHaveTextContent("Check this. Use a number.");
  });
});
