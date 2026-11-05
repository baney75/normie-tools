import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToolLayout } from "./ToolLayout";

function Demo({ actions = <a className="primary" href="#/">Done</a>, below = <p>More detail</p> }: { actions?: React.ReactNode; below?: React.ReactNode }) {
  return (
    <ToolLayout name="Demo Tool" question="What does it cost?" answer={<p>The answer</p>} actions={actions} below={below}>
      <label>
        Amount
        <input />
      </label>
    </ToolLayout>
  );
}

describe("ToolLayout", () => {
  it("shows the tool name small, then the question as the one h1", () => {
    render(<Demo />);
    expect(screen.getByText("Demo Tool")).toBeInTheDocument();
    const h1 = screen.getByRole("heading", { level: 1, name: "What does it cost?" });
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText("Demo Tool").compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("says nothing is sent under the h1, with a How we know link to the privacy page", () => {
    render(<Demo />);
    const trust = screen.getByText(/There is no Send button on this page\./);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.compareDocumentPosition(trust) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(trust.compareDocumentPosition(screen.getByText("The answer")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const link = screen.getByRole("link", { name: "How we know" });
    expect(link).toHaveAttribute("href", "#/private");
    expect(trust).toContainElement(link);
    expect(trust).toHaveTextContent("There is no Send button on this page. How we know");
  });

  it("puts the answer before the boxes, and the extra detail last", () => {
    render(<Demo />);
    const answer = screen.getByText("The answer");
    const box = screen.getByLabelText("Amount");
    const more = screen.getByText("More detail");
    expect(answer.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(box.compareDocumentPosition(more) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps the main button under the answer and has one filled button", () => {
    const { container } = render(<Demo />);
    const button = screen.getByRole("link", { name: "Done" });
    expect(screen.getByText("The answer").compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(button.compareDocumentPosition(screen.getByLabelText("Amount")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
  });

  it("leaves out the actions and detail areas when none are given", () => {
    const { container } = render(<Demo actions={null} below={null} />);
    expect(container.querySelector(".nt-tool-actions")).toBeNull();
    expect(container.querySelector(".nt-tool-below")).toBeNull();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByText("The answer")).toBeInTheDocument();
  });
});
