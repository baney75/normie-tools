import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CalmMessage } from "./CalmMessage";

describe("CalmMessage", () => {
  it("renders title, body and a text cue for the tone", () => {
    render(
      <CalmMessage tone="problem" title="We could not read that file">
        Try a different one.
      </CalmMessage>,
    );
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Problem: We could not read that file");
    expect(status).toHaveTextContent("Try a different one.");
    expect(status.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("uses role status for every tone", () => {
    for (const tone of ["info", "problem", "done"] as const) {
      const { unmount } = render(<CalmMessage tone={tone}>x</CalmMessage>);
      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      unmount();
    }
  });

  it("shows at most 2 actions and runs them", async () => {
    const a = vi.fn();
    render(
      <CalmMessage
        tone="info"
        actions={[
          { label: "One", onClick: a },
          { label: "Two", onClick: () => {} },
          { label: "Three", onClick: () => {} },
        ]}
      >
        x
      </CalmMessage>,
    );
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Three" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "One" }));
    expect(a).toHaveBeenCalledTimes(1);
  });
});
