import { useState } from "react";
import { CalmMessage } from "../../components/CalmMessage";
import { ErrorNote, Field, StartOver, StepLabel } from "../../components/calc";
import { SavePrintSheet } from "../../components/SavePrintSheet";
import { ScreenFrame } from "../../components/ScreenFrame";
import { useAutosave } from "../../lib/useAutosave";
import { MAX_ITEMS, buildBriefing, formatDate, parseTime } from "../../../../tools/morning-briefing/calc.mjs";
import { COPY } from "./copy";
import "./Page.css";

type Part = "weather" | "news" | "day" | "reminders";
type DayLine = { id: string; time: string; title: string };
type Reminder = { id: string; text: string };
type Inputs = { next: number; include: Record<Part, boolean>; day: DayLine[]; reminders: Reminder[] };
type Undo = { kind: "day"; index: number; line: DayLine } | { kind: "reminders"; index: number; line: Reminder };

const PARTS: Part[] = ["weather", "news", "day", "reminders"];
const EMPTY: Inputs = {
  next: 10,
  include: { weather: true, news: true, day: true, reminders: true },
  day: [{ id: "d1", time: "", title: "" }],
  reminders: [{ id: "r1", text: "" }],
};

// Saved data could be old or damaged. Keep only what has the right shape.
function tidy(v: Inputs): Inputs {
  if (!v || typeof v !== "object") return EMPTY;
  const rows = <T,>(x: unknown, pick: (r: Record<string, unknown>) => T | null): T[] =>
    Array.isArray(x) ? x.filter((r) => r && typeof r === "object" && typeof r.id === "string").map((r) => pick(r)).filter((r): r is T => r !== null) : [];
  const s = (x: unknown) => (typeof x === "string" ? x : "");
  const inc = v.include && typeof v.include === "object" ? v.include : ({} as Record<Part, boolean>);
  return {
    next: typeof v.next === "number" ? v.next : 100,
    include: { weather: inc.weather === true, news: inc.news === true, day: inc.day === true, reminders: inc.reminders === true },
    day: rows(v.day, (r) => ({ id: r.id as string, time: s(r.time), title: s(r.title) })).slice(0, MAX_ITEMS),
    reminders: rows(v.reminders, (r) => ({ id: r.id as string, text: s(r.text) })).slice(0, MAX_ITEMS),
  };
}

function today() {
  const n = new Date();
  return { year: n.getFullYear(), month: n.getMonth() + 1, day: n.getDate() };
}

export function Page() {
  const flow = useAutosave<Inputs>("morning-briefing", EMPTY);
  const v = tidy(flow.value);
  const set = (next: Inputs) => flow.setValue(next);
  const step = Math.min(Math.max(Math.trunc(flow.step) || 0, 0), 2);
  const [undo, setUndo] = useState<Undo | null>(null);

  const pristine = JSON.stringify(v) === JSON.stringify(EMPTY) && step === 0;
  const anyPart = PARTS.some((p) => v.include[p]);
  const dateText = formatDate(today());

  const toggle = (p: Part) => set({ ...v, include: { ...v.include, [p]: !v.include[p] } });
  const changeDay = (id: string, patch: Partial<DayLine>) => set({ ...v, day: v.day.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const changeRem = (id: string, text: string) => set({ ...v, reminders: v.reminders.map((l) => (l.id === id ? { ...l, text } : l)) });
  const removeDay = (id: string) => {
    const index = v.day.findIndex((l) => l.id === id);
    if (index < 0) return;
    setUndo({ kind: "day", index, line: v.day[index] });
    set({ ...v, day: v.day.filter((l) => l.id !== id) });
  };
  const removeRem = (id: string) => {
    const index = v.reminders.findIndex((l) => l.id === id);
    if (index < 0) return;
    setUndo({ kind: "reminders", index, line: v.reminders[index] });
    set({ ...v, reminders: v.reminders.filter((l) => l.id !== id) });
  };
  const putBack = () => {
    if (!undo) return;
    if (undo.kind === "day") {
      const rows = v.day.filter((l) => l.id !== undo.line.id);
      rows.splice(Math.min(undo.index, rows.length), 0, undo.line);
      set({ ...v, day: rows });
    } else {
      const rows = v.reminders.filter((l) => l.id !== undo.line.id);
      rows.splice(Math.min(undo.index, rows.length), 0, undo.line);
      set({ ...v, reminders: rows });
    }
    setUndo(null);
  };
  const addDay = () => set({ ...v, next: v.next + 1, day: [...v.day, { id: `d${v.next}`, time: "", title: "" }] });
  const addRem = () => set({ ...v, next: v.next + 1, reminders: [...v.reminders, { id: `r${v.next}`, text: "" }] });

  const onStartOver = (next: Inputs) => {
    set(next);
    if (JSON.stringify(next) === JSON.stringify(EMPTY)) {
      flow.setStep(0);
      setUndo(null);
    }
  };

  return (
    <ScreenFrame title={COPY.title} as="div" reserve="0">
      <div className="nt-mb">
        <p className="nt-mb-intro">{COPY.intro}</p>

        {flow.hasSaved && pristine ? (
          <div className="nt-mb-status">
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

        {step === 0 ? (
          <>
            <StepLabel n={1} of={3}>{COPY.steps.pick}</StepLabel>
            <fieldset className="nt-mb-pick">
              <legend>{COPY.pick.legend}</legend>
              {PARTS.map((p, i) => (
                <label key={p} className="nt-mb-check">
                  <input type="checkbox" autoFocus={i === 0} checked={v.include[p]} onChange={() => toggle(p)} />
                  <span>{COPY.pick[p]}</span>
                </label>
              ))}
            </fieldset>
            <p className="nt-mb-help">{COPY.pick.exampleHelp}</p>
            {!anyPart ? <ErrorNote>{COPY.pick.none}</ErrorNote> : null}
            <div className="nt-mb-nav">
              <button type="button" className="primary" disabled={!anyPart} onClick={() => flow.setStep(1)}>
                {COPY.next}
              </button>
            </div>
            <p className="nt-mb-help">{COPY.pick.preview}</p>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <StepLabel n={2} of={3}>{COPY.steps.type}</StepLabel>
            <p className="nt-mb-today">{COPY.type.today} {dateText}.</p>
            {!v.include.day && !v.include.reminders ? <p className="nt-mb-help">{COPY.type.nothing}</p> : null}

            {v.include.day ? (
              <section className="nt-mb-list" aria-label={COPY.type.dayHeading}>
                <h2>{COPY.type.dayHeading}</h2>
                <p className="nt-mb-help">{COPY.type.dayHelp}</p>
                <p className="nt-mb-help">{COPY.removeHint}</p>
                {v.day.map((l, i) => (
                  <div key={l.id} className="nt-mb-row">
                    <Field
                      label={`${COPY.type.timeLabel} ${i + 1}`}
                      inputMode="text"
                      value={l.time}
                      placeholder={COPY.type.timePlaceholder}
                      autoFocus={i === 0}
                      hint={l.time.trim() && !parseTime(l.time).ok ? COPY.type.timeUnsure : undefined}
                      onChange={(t) => changeDay(l.id, { time: t })}
                    />
                    <Field
                      label={`${COPY.type.titleLabel} ${i + 1}`}
                      inputMode="text"
                      value={l.title}
                      placeholder={COPY.type.titlePlaceholder}
                      onChange={(t) => changeDay(l.id, { title: t })}
                    />
                    <button type="button" className="nt-mb-small" aria-label={`${COPY.remove} thing ${i + 1}`} onClick={() => removeDay(l.id)}>
                      {COPY.remove}
                    </button>
                  </div>
                ))}
                {undo && undo.kind === "day" ? (
                  <p className="nt-mb-help">
                    <button type="button" className="nt-mb-small" onClick={putBack}>{COPY.undo}</button> {COPY.undoHelp}
                  </p>
                ) : null}
                {v.day.length < MAX_ITEMS ? (
                  <button type="button" className="nt-mb-small" onClick={addDay}>{COPY.type.addDay}</button>
                ) : (
                  <p className="nt-mb-help">{COPY.full}</p>
                )}
              </section>
            ) : null}

            {v.include.reminders ? (
              <section className="nt-mb-list" aria-label={COPY.type.remindersHeading}>
                <h2>{COPY.type.remindersHeading}</h2>
                <p className="nt-mb-help">{COPY.type.remindersHelp}</p>
                <p className="nt-mb-help">{COPY.removeHint}</p>
                {v.reminders.map((l, i) => (
                  <div key={l.id} className="nt-mb-row">
                    <Field
                      label={`${COPY.type.reminderLabel} ${i + 1}`}
                      inputMode="text"
                      value={l.text}
                      placeholder={COPY.type.reminderPlaceholder}
                      autoFocus={!v.include.day && i === 0}
                      onChange={(t) => changeRem(l.id, t)}
                    />
                    <button type="button" className="nt-mb-small" aria-label={`${COPY.remove} reminder ${i + 1}`} onClick={() => removeRem(l.id)}>
                      {COPY.remove}
                    </button>
                  </div>
                ))}
                {undo && undo.kind === "reminders" ? (
                  <p className="nt-mb-help">
                    <button type="button" className="nt-mb-small" onClick={putBack}>{COPY.undo}</button> {COPY.undoHelp}
                  </p>
                ) : null}
                {v.reminders.length < MAX_ITEMS ? (
                  <button type="button" className="nt-mb-small" onClick={addRem}>{COPY.type.addReminder}</button>
                ) : (
                  <p className="nt-mb-help">{COPY.full}</p>
                )}
              </section>
            ) : null}

            <div className="nt-mb-nav">
              <button type="button" onClick={() => flow.setStep(0)}>{COPY.back1}</button>
              <button type="button" className="primary" onClick={() => flow.setStep(2)}>{COPY.next}</button>
            </div>
          </>
        ) : null}

        {step === 2 ? <Briefing v={v} onBack={() => flow.setStep(1)} /> : null}

        <StartOver flowId="morning-briefing" value={flow.value} empty={EMPTY} onChange={onStartOver} />

        {step === 2 ? <p className="nt-mb-note">{COPY.note}</p> : null}
      </div>
    </ScreenFrame>
  );
}

function Briefing({ v, onBack }: { v: Inputs; onBack: () => void }) {
  const result = buildBriefing({
    include: v.include,
    date: today(),
    day: v.day.map(({ time, title }) => ({ time, title })),
    reminders: v.reminders.map((r) => r.text),
  }) as unknown as Built;

  function save() {
    if (!result.ok) return;
    try {
      const url = URL.createObjectURL(new Blob([result.text], { type: "text/plain" }));
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
      <StepLabel n={3} of={3}>{COPY.steps.see}</StepLabel>
      <p className="nt-mb-help">{COPY.see.intro}</p>
      <div className="nt-mb-nav">
        <button type="button" onClick={onBack}>{COPY.back2}</button>
      </div>
      {!result.ok ? (
        <ErrorNote>{COPY.see.nothingFixed}</ErrorNote>
      ) : (
        <SavePrintSheet title={COPY.save.title} onSave={save} savePrimary>
          <article className="nt-mb-paper" aria-label="Your briefing">
            <h3>{COPY.see.paperTitle}</h3>
            {result.dateLine ? <p className="nt-mb-date">{result.dateLine}</p> : null}
            {result.sections.map((s) => (
              <section key={s.id} className="nt-mb-part" aria-label={s.heading}>
                <h4>{s.heading}</h4>
                {s.lines.length === 0 && !(s.unclear && s.unclear.length) ? <p>{s.empty}</p> : null}
                {s.lines.length > 0 ? <ul>{s.lines.map((l, i) => <li key={i}>{l}</li>)}</ul> : null}
                {s.unclear && s.unclear.length > 0 ? (
                  <>
                    <p><strong>{s.unclearHeading}</strong></p>
                    <ul>{s.unclear.map((l, i) => <li key={i}>{l}</li>)}</ul>
                  </>
                ) : null}
                {s.label ? <p className="nt-mb-label">{s.label}</p> : null}
              </section>
            ))}
            {result.offlineNote ? <p className="nt-mb-note">{result.offlineNote}</p> : null}
            {result.offlineNote ? <p className="nt-mb-note">{COPY.see.sourceNote}</p> : null}
            <p className="nt-mb-note">{COPY.see.madeHere}</p>
            {result.notes.map((n) => <p key={n} className="nt-mb-note">{n}</p>)}
          </article>
        </SavePrintSheet>
      )}
    </>
  );
}

type Built =
  | { ok: false }
  | { ok: true; text: string; dateLine: string; sections: Section[]; notes: string[]; offlineNote: string };
type Section = { id: string; heading: string; lines: string[]; label?: string; unclearHeading?: string; unclear?: string[]; empty?: string };

export default Page;
