import { useId, type ReactNode } from "react";
import { CalmMessage } from "../../components/CalmMessage";
import { Chips, ErrorNote, Field, ResultCard, Finish, SeeAnswer, StartOver, ToolLayout } from "../../components/calc";
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
    <div className="nt-field nt-unit-pick">
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
  const set = (patch: Partial<Inputs>) => flow.setValue({ ...v, ...patch });

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
    <ToolLayout
      name={COPY.title}
      question={COPY.question}
      answer={<Answer result={result.ok ? result : null} />}
      actions={result.ok ? <Save result={result} typed={v.value.trim()} /> : null}
      below={<Facts />}
    >
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

      <form className="nt-unit-form" onSubmit={(e) => e.preventDefault()} noValidate>
        <Chips
          legend={COPY.kind.label}
          options={CATEGORY_IDS.map((id: string) => ({ value: id, label: (CATEGORIES as Record<string, { label: string }>)[id].label }))}
          value={v.category}
          onChange={pickCategory}
        />
        <Field label={COPY.value.label} value={v.value} onChange={(t) => set({ value: t })} error={valueBad} />
        <div className="nt-unit-pair">
          <Pick label={COPY.from.label} value={v.from} onChange={(from) => set({ from })}>
            {units.map((u) => <option key={u.id} value={u.id}>{upper(u.name)} ({u.short})</option>)}
          </Pick>
          <button type="button" className="nt-unit-swap" onClick={() => set({ from: v.to, to: v.from })}>
            {COPY.swap}
          </button>
          <Pick label={COPY.to.label} value={v.to} onChange={(to) => set({ to })}>
            {units.map((u) => <option key={u.id} value={u.id}>{upper(u.name)} ({u.short})</option>)}
          </Pick>
        </div>
      </form>

      {!result.ok && !blank && valueBad ? <ErrorNote>{COPY.fixFirst}</ErrorNote> : null}

      <SeeAnswer label={COPY.see} main={!result.ok} />
      <StartOver flowId="unit-converter" value={flow.value} empty={START} onChange={flow.setValue} />
    </ToolLayout>
  );
}

type Good = Extract<ReturnType<typeof convertUnit>, { ok: true }>;

function Answer({ result }: { result: Good | null }) {
  return (
    <ResultCard
      label={COPY.result.label}
      answer={result ? `${result.answer} ${result.toName}` : undefined}
      waiting={COPY.waiting}
     
    >
      <p>{COPY.result.shown}</p>
    </ResultCard>
  );
}

function Save({ result, typed }: { result: Good; typed: string }) {
  function save() {
    const sentence = `${typed} ${result.fromName} is ${result.answer} ${result.toName}.`;
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
    <Finish onSave={save}>
      <p>{COPY.save.preview}</p>
    </Finish>
  );
}

function Facts() {
  return (
    <details>
      <summary>{COPY.more.summary}</summary>
      <div className="nt-unit-details-body">
        <ul className="nt-unit-facts">
          {COPY.more.items.map((t) => <li key={t}>{t}</li>)}
        </ul>
        <p className="nt-unit-help">{COPY.more.rounding}</p>
        <p className="nt-unit-help">{COPY.more.sources}</p>
      </div>
    </details>
  );
}

export default Page;
