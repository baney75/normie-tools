import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Chips } from "./Chips";

const OPTIONS = [
  { value: "2", label: "2 years" },
  { value: "3", label: "3 years" },
  { value: "5", label: "5 years" },
];

describe("Chips", () => {
  it("is a named group of radios, one per option", () => {
    render(<Chips legend="How long" options={OPTIONS} value="3" onChange={() => {}} />);
    const group = screen.getByRole("group", { name: "How long" });
    expect(group).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(radios.map((r) => (r as HTMLInputElement).value)).toEqual(["2", "3", "5"]);
    for (const o of OPTIONS) expect(screen.getByRole("radio", { name: o.label })).toBeInTheDocument();
  });

  it("checks only the picked value", () => {
    render(<Chips legend="How long" options={OPTIONS} value="3" onChange={() => {}} />);
    expect(screen.getByRole("radio", { name: "3 years" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "2 years" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "5 years" })).not.toBeChecked();
  });

  it("checks none when no value is picked", () => {
    render(<Chips legend="How long" options={OPTIONS} value="" onChange={() => {}} />);
    for (const r of screen.getAllByRole("radio")) expect(r).not.toBeChecked();
  });

  it("calls onChange with the value of the chip that was tapped", async () => {
    const onChange = vi.fn();
    render(<Chips legend="How long" options={OPTIONS} value="3" onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: "5 years" }));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith("5");
  });

  it("does not call onChange when the picked chip is tapped again", async () => {
    const onChange = vi.fn();
    render(<Chips legend="How long" options={OPTIONS} value="3" onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: "3 years" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("moves the pick as the person taps, and works from the keyboard", async () => {
    function Demo() {
      const [v, setV] = useState("2");
      return <Chips legend="How long" options={OPTIONS} value={v} onChange={setV} />;
    }
    render(<Demo />);
    await userEvent.click(screen.getByRole("radio", { name: "5 years" }));
    expect(screen.getByRole("radio", { name: "5 years" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "2 years" })).not.toBeChecked();
    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "3 years" })).toBeChecked();
  });

  it("gives each group its own radio name, so two groups do not clash", () => {
    render(
      <>
        <Chips legend="First" options={OPTIONS} value="2" onChange={() => {}} />
        <Chips legend="Second" options={OPTIONS} value="5" onChange={() => {}} />
      </>,
    );
    const names = new Set(screen.getAllByRole("radio").map((r) => (r as HTMLInputElement).name));
    expect(names.size).toBe(2);
    expect(screen.getAllByRole("radio").filter((r) => (r as HTMLInputElement).checked)).toHaveLength(2);
  });
});
