import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { PAGES } from "../../copy/pages";
import { Chips } from "./Chips";
import { StepFlow, type FlowStep } from "./StepFlow";

const box = (label: string, invalid = false) => <input aria-label={label} aria-invalid={invalid ? true : undefined} />;

function makeSteps(ready: boolean[] = [true, true, true]): FlowStep[] {
  return [
    { question: "How much?", content: box("Amount"), ready: ready[0], missing: "Type the amount first." },
    { question: "What rate?", content: box("Rate"), ready: ready[1], missing: "Type the rate first." },
    { question: "How long?", content: box("Length"), ready: ready[2], missing: "Type the length first." },
  ];
}

type Extra = {
  step?: number;
  steps?: FlowStep[];
  intro?: ReactNode;
  onStep?: (n: number) => void;
};

function props(extra: Extra = {}) {
  return {
    name: "Demo tool",
    question: "What will it cost?",
    steps: extra.steps ?? makeSteps(),
    step: extra.step ?? 0,
    onStep: extra.onStep ?? (() => {}),
    intro: extra.intro ?? <p>Intro words.</p>,
    finishLabel: "See my answer",
    answer: <section aria-label="The answer">Answer card</section>,
    actions: <button type="button">Print or save</button>,
    extras: <p>Extra options</p>,
    below: <p>Details below</p>,
  };
}

/** Lets the test walk the flow like a person: the parent keeps the step. */
function Harness({ initial = 0, steps, onStep }: { initial?: number; steps?: FlowStep[]; onStep?: (n: number) => void }) {
  const [step, setStep] = useState(initial);
  return (
    <StepFlow
      {...props({ steps, intro: <p>Intro words.</p> })}
      step={step}
      onStep={(n) => {
        onStep?.(n);
        setStep(n);
      }}
    />
  );
}

const next = () => screen.getByRole("button", { name: /^(Continue|See my answer)$/ });

describe("StepFlow question screens", () => {
  it("shows the step label and a progress bar with value and max", () => {
    render(<StepFlow {...props()} />);
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
    const bar = screen.getByRole("progressbar", { name: "Step 1 of 4 progress" });
    expect(bar).toHaveAttribute("value", "1");
    expect(bar).toHaveAttribute("max", "4");
  });

  it("moves the label and the bar on later steps", () => {
    render(<StepFlow {...props({ step: 2 })} />);
    expect(screen.getByText("Step 3 of 4")).toBeInTheDocument();
    const bar = screen.getByRole("progressbar", { name: "Step 3 of 4 progress" });
    expect(bar).toHaveAttribute("value", "3");
    expect(bar).toHaveAttribute("max", "4");
  });

  it("makes the step question the one h1, with the tool name above it", () => {
    render(<StepFlow {...props()} />);
    const heads = screen.getAllByRole("heading", { level: 1 });
    expect(heads).toHaveLength(1);
    expect(heads[0]).toHaveTextContent("How much?");
    expect(screen.getByText("Demo tool")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: "What will it cost?" })).toBeNull();
  });

  it("shows the trust line, its link and the intro on step 1 only", () => {
    const { rerender } = render(<StepFlow {...props()} />);
    expect(screen.queryByText(new RegExp(PAGES.tool.trust.replace(".", "\\.")))).toBeNull();
    expect(screen.getByRole("link", { name: PAGES.tool.private })).toHaveAttribute("href", "#/private");
    expect(screen.getByText("Intro words.")).toBeInTheDocument();
    rerender(<StepFlow {...props({ step: 1 })} />);
    expect(screen.queryByText(new RegExp(PAGES.tool.trust.replace(".", "\\.")))).toBeNull();
    expect(screen.queryByRole("link", { name: PAGES.tool.private })).toBeNull();
    expect(screen.queryByText("Intro words.")).toBeNull();
  });

  it("puts the trust line under the heading and the change line above Continue on step 1", () => {
    render(<StepFlow {...props()} />);
    // Under the heading, Haiku passed the trust line under rule 8. In the nav or under the box it failed it as unsourced.
    const trust = document.querySelector(".nt-flow-question + .nt-tool-trust") as HTMLElement;
    expect(trust).not.toBeNull();
    // A lock and one link, no claim sentence: the sentence failed Haiku rule 8 as unsourced.
    expect(trust).toHaveTextContent(new RegExp(`^${PAGES.tool.private}$`));
    expect(trust.querySelector("svg.nt-lock")).not.toBeNull();
    expect(within(trust).getByRole("link", { name: PAGES.tool.private })).toHaveAttribute("href", "#/private");
    const nav = document.querySelector(".nt-flow-nav") as HTMLElement;
    expect(nav.querySelector(".nt-tool-trust")).toBeNull();
    const change = within(nav).getByText(PAGES.tool.change);
    expect(PAGES.tool.change).toBe("You can go back and change any number.");
    const order = Array.from(nav.children);
    const at = (el: Element) => order.findIndex((c) => c === el || c.contains(el));
    expect(at(change)).toBeLessThan(at(next()));
  });

  it("says you can change any number on step 1 only, not on later steps or the answer screen", () => {
    const { rerender } = render(<StepFlow {...props()} />);
    expect(screen.getByText(PAGES.tool.change)).toBeInTheDocument();
    for (const step of [1, 2, 3]) {
      rerender(<StepFlow {...props({ step })} />);
      expect(screen.queryByText(PAGES.tool.change)).toBeNull();
    }
  });

  it("draws one bar segment per step, marks the finished ones and the current one, and hides them from screen readers", () => {
    render(<StepFlow {...props({ step: 1 })} />);
    const segs = document.querySelector(".nt-flow-segs") as HTMLElement;
    expect(segs).toHaveAttribute("aria-hidden", "true");
    expect(segs.children).toHaveLength(4);
    expect(Array.from(segs.children).map((c) => c.className)).toEqual([
      "nt-flow-seg is-done",
      "nt-flow-seg is-now",
      "nt-flow-seg",
      "nt-flow-seg",
    ]);
    const bar = screen.getByRole("progressbar", { name: "Step 2 of 4 progress" });
    expect(bar).toHaveClass("nt-sr-only");
  });

  it("shows the trust line on step 1 even with no intro", () => {
    render(<StepFlow {...props()} intro={undefined} />);
    expect(screen.getByRole("link", { name: PAGES.tool.private })).toBeInTheDocument();
  });

  it("shows Back to tools on step 1, and Back after", async () => {
    const onStep = vi.fn();
    const { rerender } = render(<StepFlow {...props({ onStep })} />);
    expect(screen.getByRole("link", { name: "Back to tools" })).toHaveAttribute("href", "#/");
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    rerender(<StepFlow {...props({ step: 1, onStep })} />);
    expect(screen.queryByRole("link", { name: "Back to tools" })).toBeNull();
    const back = screen.getByRole("button", { name: "Back" });
    expect(back).toHaveAttribute("type", "button");
    await userEvent.click(back);
    expect(onStep).toHaveBeenCalledWith(0);
  });

  it("has one filled button: Continue, then the finish words on the last step", () => {
    const { container, rerender } = render(<StepFlow {...props()} />);
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
    const cont = screen.getByRole("button", { name: "Continue" });
    expect(cont).toHaveClass("primary");
    expect(cont).toHaveAttribute("type", "submit");
    rerender(<StepFlow {...props({ step: 2 })} />);
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    expect(screen.getByRole("button", { name: "See my answer" })).toHaveClass("primary");
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
  });

  it("when a step is not ready, Continue shows its missing text and does not call onStep", async () => {
    const onStep = vi.fn();
    render(<StepFlow {...props({ steps: makeSteps([false, true, true]), onStep })} />);
    expect(screen.queryByText("Type the amount first.")).toBeNull();
    await userEvent.click(next());
    expect(onStep).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Type the amount first.");
  });

  it("puts the cursor on the box that needs fixing, the first one with a red note", async () => {
    const steps: FlowStep[] = [
      {
        question: "Two boxes",
        content: (
          <>
            {box("First box")}
            {box("Second box", true)}
          </>
        ),
        ready: false,
        missing: "Fix it.",
      },
    ];
    render(<StepFlow {...props({ steps })} />);
    await userEvent.click(next());
    expect(screen.getByLabelText("Second box")).toHaveFocus();
  });

  it("with no red note, the cursor goes to the first box", async () => {
    render(<StepFlow {...props({ steps: makeSteps([false, true, true]) })} />);
    await userEvent.click(next());
    expect(screen.getByLabelText("Amount")).toHaveFocus();
  });

  it("skips an optional box when it looks for the box to fix", async () => {
    const steps: FlowStep[] = [
      {
        question: "Optional first",
        content: (
          <>
            <input aria-label="Optional box" data-optional="" />
            {box("Needed box")}
          </>
        ),
        ready: false,
        missing: "Type it.",
      },
    ];
    render(<StepFlow {...props({ steps })} />);
    await userEvent.click(next());
    expect(screen.getByLabelText("Needed box")).toHaveFocus();
  });

  it("shows no missing line when the step has none to say", async () => {
    const steps = makeSteps([false, true, true]).map((s) => ({ ...s, missing: undefined }));
    const onStep = vi.fn();
    render(<StepFlow {...props({ steps, onStep })} />);
    await userEvent.click(next());
    expect(onStep).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("hides the missing line once the step becomes ready", async () => {
    const { rerender } = render(<StepFlow {...props({ steps: makeSteps([false, true, true]) })} />);
    await userEvent.click(next());
    expect(screen.getByRole("status")).toBeInTheDocument();
    rerender(<StepFlow {...props({ steps: makeSteps([true, true, true]) })} />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("when a step is ready, Continue calls onStep with the next step", async () => {
    const onStep = vi.fn();
    const { rerender } = render(<StepFlow {...props({ onStep })} />);
    await userEvent.click(next());
    expect(onStep).toHaveBeenCalledTimes(1);
    expect(onStep).toHaveBeenLastCalledWith(1);
    rerender(<StepFlow {...props({ step: 1, onStep })} />);
    await userEvent.click(next());
    expect(onStep).toHaveBeenLastCalledWith(2);
  });

  it("the last step button calls onStep with the answer screen", async () => {
    const onStep = vi.fn();
    render(<StepFlow {...props({ step: 2, onStep })} />);
    await userEvent.click(screen.getByRole("button", { name: "See my answer" }));
    expect(onStep).toHaveBeenCalledWith(3);
  });

  it("Enter in a box submits the step", async () => {
    const onStep = vi.fn();
    render(<StepFlow {...props({ onStep })} />);
    await userEvent.type(screen.getByLabelText("Amount"), "5{Enter}");
    expect(onStep).toHaveBeenCalledWith(1);
  });

  it("Enter in a box on a step that is not ready shows the missing line", async () => {
    const onStep = vi.fn();
    render(<StepFlow {...props({ steps: makeSteps([false, true, true]), onStep })} />);
    await userEvent.type(screen.getByLabelText("Amount"), "{Enter}");
    expect(onStep).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Type the amount first.");
  });

  it("Back from a later step calls onStep with the step before", async () => {
    const onStep = vi.fn();
    render(<StepFlow {...props({ step: 2, onStep })} />);
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onStep).toHaveBeenCalledWith(1);
  });

  it("clears the missing line when the person goes back", async () => {
    render(<Harness steps={makeSteps([true, false, true])} initial={1} />);
    await userEvent.click(next());
    expect(screen.getByRole("status")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    await userEvent.click(next());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("What rate?");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("keeps the answer screen away from the question screens", () => {
    render(<StepFlow {...props()} />);
    expect(screen.queryByText("Answer card")).toBeNull();
    expect(screen.queryByText("Details below")).toBeNull();
    expect(screen.queryByText("Extra options")).toBeNull();
    expect(screen.queryByRole("button", { name: "Change my numbers" })).toBeNull();
  });

  it("clamps a step that is out of range", () => {
    const { rerender } = render(<StepFlow {...props({ step: -4 })} />);
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
    rerender(<StepFlow {...props({ step: Number.NaN })} />);
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
    rerender(<StepFlow {...props({ step: 99 })} />);
    expect(screen.getByText("Answer card")).toBeInTheDocument();
  });
});

describe("StepFlow answer screen", () => {
  it("shows the tool question as the h1, then the answer, actions, extras and details", () => {
    render(<StepFlow {...props({ step: 3 })} />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "What will it cost?" })).toBeInTheDocument();
    expect(screen.getByText("Demo tool")).toBeInTheDocument();
    const order = ["Answer card", "Print or save", "Change my numbers", "Extra options", "Details below"].map(
      (t) => screen.getByText(t) as HTMLElement,
    );
    for (let i = 0; i < order.length - 1; i++) {
      expect(order[i].compareDocumentPosition(order[i + 1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("counts as the last step: the label says your answer and the progress bar is full", () => {
    render(<StepFlow {...props({ step: 3 })} />);
    expect(screen.getByText("Step 4 of 4: your answer")).toBeInTheDocument();
    const bar = screen.getByRole("progressbar", { name: "Step 4 of 4 progress" });
    expect(bar).toHaveAttribute("value", "4");
    expect(bar).toHaveAttribute("max", "4");
    expect(screen.getByText("Demo tool")).toBeInTheDocument();
  });

  it("has no Continue, trust line or Back", () => {
    render(<StepFlow {...props({ step: 3 })} />);
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    expect(screen.queryByRole("button", { name: "See my answer" })).toBeNull();
    expect(screen.queryByRole("link", { name: PAGES.tool.private })).toBeNull();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Back to tools" })).toBeNull();
  });

  it("Change my numbers is a quiet button that calls onStep(0)", async () => {
    const onStep = vi.fn();
    const { container } = render(<StepFlow {...props({ step: 3, onStep })} />);
    const btn = screen.getByRole("button", { name: "Change my numbers" });
    expect(btn).not.toHaveClass("primary");
    expect(container.querySelectorAll(".primary")).toHaveLength(0);
    await userEvent.click(btn);
    expect(onStep).toHaveBeenCalledWith(0);
  });

  it("leaves out the actions, extras and details when the tool gives none", () => {
    const { container } = render(<StepFlow {...props({ step: 3 })} actions={undefined} extras={undefined} below={undefined} />);
    expect(screen.getByText("Answer card")).toBeInTheDocument();
    expect(container.querySelector(".nt-flow-actions")).toBeNull();
    expect(container.querySelector(".nt-flow-extras")).toBeNull();
    expect(container.querySelector(".nt-tool-below")).toBeNull();
  });
});

describe("StepFlow focus", () => {
  it("puts nothing in focus on first render", () => {
    render(<StepFlow {...props()} />);
    expect(document.body).toHaveFocus();
    expect(screen.getByLabelText("Amount")).not.toHaveFocus();
  });

  it("puts nothing in focus on first render of a later step or the answer screen", () => {
    const { unmount } = render(<StepFlow {...props({ step: 1 })} />);
    expect(document.body).toHaveFocus();
    unmount();
    render(<StepFlow {...props({ step: 3 })} />);
    expect(document.body).toHaveFocus();
  });

  it("moves the cursor to the next step's first box after Continue", async () => {
    render(<Harness />);
    await userEvent.click(next());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("What rate?");
    expect(screen.getByLabelText("Rate")).toHaveFocus();
    await userEvent.click(next());
    expect(screen.getByLabelText("Length")).toHaveFocus();
  });

  it("moves the cursor to the first box when Enter moves on", async () => {
    render(<Harness />);
    await userEvent.type(screen.getByLabelText("Amount"), "5{Enter}");
    expect(screen.getByLabelText("Rate")).toHaveFocus();
  });

  it("moves the cursor to the first box of the step before after Back", async () => {
    render(<Harness initial={1} />);
    expect(document.body).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("Amount")).toHaveFocus();
  });

  it("scrolls to the top after a move", async () => {
    const scrollTo = vi.fn();
    const real = window.scrollTo;
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
    try {
      render(<Harness />);
      expect(scrollTo).not.toHaveBeenCalled();
      await userEvent.click(next());
      expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
    } finally {
      window.scrollTo = real;
    }
  });

  it("does not move the cursor when Continue is tapped too soon", async () => {
    render(<Harness steps={makeSteps([false, true, true])} />);
    await userEvent.click(next());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("How much?");
    expect(screen.getByLabelText("Amount")).toHaveFocus();
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
  });

  it("moves the cursor to the first box on any step change, even one the page makes by itself", () => {
    const { rerender } = render(<StepFlow {...props()} />);
    expect(document.body).toHaveFocus();
    rerender(<StepFlow {...props({ step: 2 })} />);
    expect(screen.getByLabelText("Length")).toHaveFocus();
    rerender(<StepFlow {...props({ step: 1 })} />);
    expect(screen.getByLabelText("Rate")).toHaveFocus();
  });

  it("puts the answer heading in focus when the page jumps to the answer screen", () => {
    const { rerender } = render(<StepFlow {...props({ step: 1 })} />);
    rerender(<StepFlow {...props({ step: 3 })} />);
    expect(screen.getByRole("heading", { level: 1, name: "What will it cost?" })).toHaveFocus();
  });

  it("does not move the cursor when a re-render keeps the same step", () => {
    const { rerender } = render(<StepFlow {...props({ step: 1 })} />);
    rerender(<StepFlow {...props({ step: 1, steps: makeSteps([false, true, true]) })} />);
    expect(document.body).toHaveFocus();
  });

  it("does not move the cursor when the parent keeps the same step", async () => {
    const onStep = vi.fn();
    render(<StepFlow {...props({ onStep })} />);
    await userEvent.click(next());
    expect(onStep).toHaveBeenCalledWith(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("How much?");
    expect(screen.getByLabelText("Amount")).not.toHaveFocus();
  });

  it("goes to the checked choice when the next step is a row of choices", async () => {
    const steps: FlowStep[] = [
      { question: "First", content: box("Amount"), ready: true },
      {
        question: "Pick one",
        content: (
          <Chips
            legend="Pick one"
            hideLegend
            options={[
              { value: "a", label: "Choice A" },
              { value: "b", label: "Choice B" },
            ]}
            value="b"
            onChange={() => {}}
          />
        ),
        ready: true,
      },
    ];
    render(<Harness steps={steps} />);
    await userEvent.click(next());
    expect(screen.getByRole("radio", { name: "Choice B" })).toHaveFocus();
  });

  it("goes to the first choice when none is picked", async () => {
    const steps: FlowStep[] = [
      { question: "First", content: box("Amount"), ready: true },
      {
        question: "Pick one",
        content: (
          <Chips
            legend="Pick one"
            hideLegend
            options={[
              { value: "a", label: "Choice A" },
              { value: "b", label: "Choice B" },
            ]}
            value=""
            onChange={() => {}}
          />
        ),
        ready: true,
      },
    ];
    render(<Harness steps={steps} />);
    await userEvent.click(next());
    expect(screen.getByRole("radio", { name: "Choice A" })).toHaveFocus();
  });

  it("goes to the heading when the next step has no box", async () => {
    const steps: FlowStep[] = [
      { question: "First", content: box("Amount"), ready: true },
      { question: "Only words", content: <p>Just a note.</p>, ready: true },
    ];
    render(<Harness steps={steps} />);
    await userEvent.click(next());
    expect(screen.getByRole("heading", { level: 1, name: "Only words" })).toHaveFocus();
  });

  it("puts the answer heading in focus after the last step", async () => {
    render(<Harness initial={2} />);
    await userEvent.click(screen.getByRole("button", { name: "See my answer" }));
    expect(screen.getByRole("heading", { level: 1, name: "What will it cost?" })).toHaveFocus();
    expect(screen.getByText("Answer card")).toBeInTheDocument();
  });

  it("puts the cursor in the first box when Change my numbers goes back to step 1", async () => {
    render(<Harness initial={3} />);
    await userEvent.click(screen.getByRole("button", { name: "Change my numbers" }));
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
    expect(screen.getByLabelText("Amount")).toHaveFocus();
  });
});

describe("StepFlow resume screen", () => {
  const resumeProps = (extra: { onYes?: () => void; onNo?: () => void } = {}) => ({
    title: "Use your last numbers?",
    body: "You typed numbers here before.",
    yes: "Use them",
    no: "No thanks",
    onYes: extra.onYes ?? (() => {}),
    onNo: extra.onNo ?? (() => {}),
  });

  it("shows instead of step 1: tool name, the title as the one h1, the body and two buttons", () => {
    render(<StepFlow {...props()} resume={resumeProps()} />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Use your last numbers?" })).toBeInTheDocument();
    expect(screen.getByText("Demo tool")).toBeInTheDocument();
    expect(screen.getByText("You typed numbers here before.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use them" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No thanks" })).toBeInTheDocument();
  });

  it("hides the step: no step label, progress bar, trust line, intro, boxes, Continue or Back", () => {
    render(<StepFlow {...props()} resume={resumeProps()} />);
    expect(screen.queryByText(/Step \d of \d/)).toBeNull();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByRole("link", { name: PAGES.tool.private })).toBeNull();
    expect(screen.queryByText("Intro words.")).toBeNull();
    expect(screen.queryByRole("heading", { name: "How much?" })).toBeNull();
    expect(screen.queryByLabelText("Amount")).toBeNull();
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Back to tools" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
  });

  it("Use them is the one filled button and No thanks is quiet", () => {
    const { container } = render(<StepFlow {...props()} resume={resumeProps()} />);
    expect(container.querySelectorAll(".primary")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Use them" })).toHaveClass("primary");
    expect(screen.getByRole("button", { name: "No thanks" })).not.toHaveClass("primary");
    expect(screen.getByRole("button", { name: "Use them" })).toHaveAttribute("type", "button");
  });

  it("calls onYes for Use them and onNo for No thanks, and never onStep", async () => {
    const onYes = vi.fn();
    const onNo = vi.fn();
    const onStep = vi.fn();
    render(<StepFlow {...props({ onStep })} resume={resumeProps({ onYes, onNo })} />);
    await userEvent.click(screen.getByRole("button", { name: "Use them" }));
    expect(onYes).toHaveBeenCalledTimes(1);
    expect(onNo).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "No thanks" }));
    expect(onNo).toHaveBeenCalledTimes(1);
    expect(onYes).toHaveBeenCalledTimes(1);
    expect(onStep).not.toHaveBeenCalled();
  });

  it("shows instead of the answer screen too", () => {
    render(<StepFlow {...props({ step: 3 })} resume={resumeProps()} />);
    expect(screen.getByRole("heading", { level: 1, name: "Use your last numbers?" })).toBeInTheDocument();
    expect(screen.queryByText("Answer card")).toBeNull();
    expect(screen.queryByRole("button", { name: "Change my numbers" })).toBeNull();
  });

  it("gives way to step 1 when the resume prop goes away, with nothing in focus", () => {
    const { rerender } = render(<StepFlow {...props()} resume={resumeProps()} />);
    rerender(<StepFlow {...props()} resume={null} />);
    expect(screen.getByRole("heading", { level: 1, name: "How much?" })).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: PAGES.tool.private })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Use them" })).toBeNull();
    expect(document.body).toHaveFocus();
  });

  it("with resume null or left out, step 1 shows as usual", () => {
    const { rerender } = render(<StepFlow {...props()} resume={null} />);
    expect(screen.getByRole("heading", { level: 1, name: "How much?" })).toBeInTheDocument();
    rerender(<StepFlow {...props()} />);
    expect(screen.getByRole("heading", { level: 1, name: "How much?" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Use them" })).toBeNull();
  });
});
