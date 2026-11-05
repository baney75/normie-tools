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
  it("ErrorNote starts with a word, not only a color", () => {
    render(<ErrorNote id="e1">Use a number.</ErrorNote>);
    expect(screen.getByText("Use a number.", { exact: false })).toHaveTextContent("Check this. Use a number.");
  });
});
