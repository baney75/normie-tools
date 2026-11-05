import { ResumePrompt } from "../components/ResumePrompt";
import { Stepper } from "../components/Stepper";
import { UploadField } from "../components/UploadField";
import { useAutosave } from "../lib/useAutosave";

// A demo flow that is not a tool. Browser tests use it to check the step bar,
// autosave and resume, and the upload message. It is not in the tool list.
const STEPS = [
  { id: "name", title: "Your name" },
  { id: "file", title: "Your file" },
  { id: "review", title: "Look it over" },
];

type Answers = { name: string; file: string };

export function Harness() {
  const flow = useAutosave<Answers>("harness", { name: "", file: "" });
  const { value, step } = flow;
  const last = STEPS.length - 1;

  if (flow.hasSaved && flow.saved) {
    return (
      <ResumePrompt
        step={flow.saved.step}
        total={STEPS.length}
        stepTitle={STEPS[Math.min(flow.saved.step, last)].title}
        onPickUp={flow.restore}
        onStartOver={flow.clear}
      />
    );
  }

  return (
    <Stepper
      steps={STEPS}
      current={step}
      flowTitle="Demo flow"
      onBack={() => flow.setStep(Math.max(step - 1, 0))}
      onNext={() => flow.setStep(Math.min(step + 1, last))}
      nextLabel={step === last ? "Done" : "Next"}
    >
      {step === 0 && (
        <>
          <label htmlFor="harness-name">Your name</label>
          <input
            id="harness-name"
            type="text"
            autoComplete="off"
            value={value.name}
            onChange={(e) => flow.setValue({ ...value, name: e.target.value })}
          />
        </>
      )}
      {step === 1 && (
        <UploadField
          needed="csv"
          label="Pick a CSV file"
          onAccepted={(file) => flow.setValue({ ...value, file: file.name })}
        />
      )}
      {step === 2 && (
        <p>
          {value.name || "No name yet"}. {value.file || "No file yet"}.
        </p>
      )}
    </Stepper>
  );
}
