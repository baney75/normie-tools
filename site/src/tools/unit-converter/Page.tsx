import { useId, useState, type ReactNode } from "react";
import { CalmMessage } from "../../components/CalmMessage";
import { ErrorNote, Field, PrivacyNote, ResultCard, StartOver, StepLabel } from "../../components/calc";
import { SavePrintSheet } from "../../components/SavePrintSheet";
import { ScreenFrame } from "../../components/ScreenFrame";
import { useAutosave } from "../../lib/useAutosave";
import { CATEGORIES, CATEGORY_IDS, DEFAULT_UNITS, convertUnit } from "../../../../tools/unit-converter/calc.mjs";
import { COPY } from "./copy";
import "./Page.css";

type Inputs = { category: string; from: string; to: string; value: string };

const START: Inputs = { category: "length", from: DEFAULT_UNITS.length[0], to: DEFAULT_UNITS.length[1], value: "" };

type Unit = { id: string; name: string; short: string };
const unitsOf = (category: string): Unit[] => (CATEGORIES as Record<string, { units: Unit[] }>)[category]?.units ?? [];
const upper = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Pick({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  const id = useId();
  return (
    <div className="nt-field">
      <label className="nt-field-label" htmlFor={id}>{label}</label>
      <select id={id} className="nt-unit-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
    </div>
  );
}

export function Page() {
  const flow = useAutosave<Inputs>("unit-converter", START);
  const v = flow.value;
  const [swapped, setSwapped] = useState(false);
  const set = (patch: Partial<Inputs>) => {
    setSwapped(false);
    flow.setValue({ ...v, ...patch });
  };

  // Derived in render: no timers, no effects. The answer follows the typing.
  const result = convertUnit(v);
  const problems: { field: string; kind: string; message: string }[] = result.ok ? [] : result.problems;
  const valueBad = problems.find((p) => p.field === "value" && p.kind === "bad")?.message;
  const blank = !v.value.trim();
  const units = unitsOf(v.category);

  function pickCategory(category: string) {
    const [from, to] = DEFAULT_UNITS[category as keyof typeof DEFAULT_UNITS] ?? DEFAULT_UNITS.length;
    set({ category, from, to });
  }

  return (
    <ScreenFrame title={COPY.title} as="div" reserve="0">
      <div className="nt-unit">
        <p className="nt-unit-intro">{COPY.intro}</p>

        {flow.hasSaved && blank ? (
          <div className="nt-unit-status">
            <CalmMessage
              tone="info"
              title={COPY.resume.title}
              actions={[
                { label: COPY.resume.yes, onClick: flow.restore },
                { label: COPY.resume.no, onClick: flow.clear },
              ]}
            >
              {COPY.resume.body}
            </CalmMessage>
          </div>
        ) : null}

        <StepLabel n={1} of={2}>{COPY.step1}</StepLabel>
        <form className="nt-unit-form" onSubmit={(e) => e.preventDefault()} noValidate>
          <Pick label={COPY.kind.label} value={v.category} onChange={pickCategory}>
            {CATEGORY_IDS.map((id: string) => (
              <option key={id} value={id}>{(CATEGORIES as Record<string, { label: string }>)[id].label}</option>
            ))}
          </Pick>
          <Field
            label={COPY.value.label}
            hint={COPY.value.hint}
            placeholder={COPY.value.placeholder}
            autoFocus
            value={v.value}
            onChange={(t) => set({ value: t })}
            error={valueBad}
          />
          <Pick label={COPY.from.label} value={v.from} onChange={(from) => set({ from })}>
            {units.map((u) => <option key={u.id} value={u.id}>{upper(u.name)} ({u.short})</option>)}
          </Pick>
          <button type="button" className="nt-unit-swap" onClick={() => {
            flow.setValue({ ...v, from: v.to, to: v.from });
            setSwapped(!swapped);
          }}>
            {COPY.swap}
          </button>
          {swapped ? <p className="nt-unit-help" role="status">{COPY.swapped}</p> : null}
          <Pick label={COPY.to.label} value={v.to} onChange={(to) => set({ to })}>
            {units.map((u) => <option key={u.id} value={u.id}>{upper(u.name)} ({u.short})</option>)}
          </Pick>
        </form>

        <StartOver flowId="unit-converter" value={flow.value} empty={START} onChange={flow.setValue} />

        <Answer result={result.ok ? result : null} typed={v.value.trim()} />
        {!result.ok && blank ? <p className="nt-unit-status">{COPY.empty}</p> : null}
        {!result.ok && !blank && valueBad ? <ErrorNote>{COPY.fixFirst}</ErrorNote> : null}

        <details className="nt-unit-details">
          <summary>{COPY.more.summary}</summary>
          <div className="nt-unit-details-body">
            <ul className="nt-unit-facts">
              {COPY.more.items.map((t) => <li key={t}>{t}</li>)}
            </ul>
            <p className="nt-unit-help">{COPY.more.rounding}</p>
          </div>
        </details>
        <p className="nt-unit-help">{COPY.more.sources}</p>
        <PrivacyNote />
      </div>
    </ScreenFrame>
  );
}

type Good = Extract<ReturnType<typeof convertUnit>, { ok: true }>;

function Answer({ result, typed }: { result: Good | null; typed: string }) {
  const sentence = result ? `${typed} ${result.fromName} is ${result.answer} ${result.toName}.` : "";

  function save() {
    if (!result) return;
    const text = [COPY.save.title, "", sentence, COPY.result.shown, ""].join("\n");
    try {
      const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = COPY.save.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* Print still works. */
    }
  }

  return (
    <>
      <ResultCard label={COPY.result.label} step={COPY.step2} answer={result ? `${result.answer} ${result.toName}` : undefined} waiting={COPY.waiting}>
        <p className="nt-unit-help">{COPY.result.shown}</p>
      </ResultCard>

      <SavePrintSheet title={COPY.save.summary} onSave={save}>
        {result ? <p>{COPY.save.preview}</p> : null}
      </SavePrintSheet>
    </>
  );
}

export default Page;
