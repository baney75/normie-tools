import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ResumePrompt } from "./ResumePrompt";

function setup() {
  const onPickUp = vi.fn();
  const onStartOver = vi.fn();
  render(<ResumePrompt step={3} total={7} stepTitle="Your bank file" onPickUp={onPickUp} onStartOver={onStartOver} />);
  return { onPickUp, onStartOver };
}

describe("ResumePrompt", () => {
  it("shows the text and exactly two buttons", () => {
    setup();
    expect(screen.getByText("Pick up where you left off?")).toBeInTheDocument();
    expect(screen.getByText("You were on Step 4 of 7: Your bank file.")).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("pick up calls back", async () => {
    const { onPickUp, onStartOver } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Pick up" }));
    expect(onPickUp).toHaveBeenCalledTimes(1);
    expect(onStartOver).not.toHaveBeenCalled();
  });

  it("start over asks inline first, then confirms", async () => {
    const { onStartOver } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(onStartOver).not.toHaveBeenCalled();
    expect(screen.getByText("Start over? Your saved answers will be cleared.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Yes, start over" }));
    expect(onStartOver).toHaveBeenCalledTimes(1);
  });

  it("keep my answers goes back without clearing", async () => {
    const { onStartOver } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Keep my answers" }));
    expect(onStartOver).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Pick up" })).toBeInTheDocument();
  });
});
