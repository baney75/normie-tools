import { useState } from "react";
import { CalmMessage } from "../../components/CalmMessage";
import { Field, PrivacyNote, ResultCard, StartOver, StepLabel } from "../../components/calc";
import { SavePrintSheet } from "../../components/SavePrintSheet";
import { ScreenFrame } from "../../components/ScreenFrame";
import { useAutosave } from "../../lib/useAutosave";
import { checkAnswers, formatMoney, PRACTICE_SHEET, screensOf } from "../../../../tools/tax-filing-helper/calc.mjs";
import { parseMoney } from "../../../../tools/_shared/money.mjs";
import { COPY, SOURCE_URL, START_URL } from "./copy";
import "./Page.css";

type Way = "" | "guided" | "fillable";
type Inputs = { step: number; sub: number; way: Way; typed: Record<string, string> };

const SCREENS = screensOf(PRACTICE_SHEET) as { name: string; items: typeof PRACTICE_SHEET }[];
const STEPS = COPY.stepNames.length;
const EMPTY: Inputs = { step: 1, sub: 0, way: "", typed: {} };
const START = JSON.stringify(EMPTY);

// Saved data could be old or damaged. Keep only what has the right shape.
function tidy(v: Inputs): Inputs {
  if (!v || typeof v !== "object") return EMPTY;
  const typed: Record<string, string> = {};
  if (v.typed && typeof v.typed === "object" && !Array.isArray(v.typed)) {
    for (const [k, t] of Object.entries(v.typed)) if (typeof t === "string") typed[k] = t;
  }
  const whole = (n: unknown, lo: number, hi: number, fallback: number) =>
    typeof n === "number" && Number.isInteger(n) && n >= lo && n <= hi ? n : fallback;
  return {
    step: whole(v.step, 1, STEPS, 1),
    sub: whole(v.sub, 0, SCREENS.length - 1, 0),
    way: v.way === "guided" || v.way === "fillable" ? v.way : "",
    typed,
  };
}

const sayValue = (item: { kind: string; value: string }) =>
  item.kind === "money" ? formatMoney(parseMoney(item.value) ?? 0) : item.value;

function Source({ label }: { label: string }) {
  return (
    <p className="nt-tfh-source">
      <a href={SOURCE_URL} rel="noreferrer">{label}</a>
    </p>
  );
}

export function Page() {
  const flow = useAutosave<Inputs>("tax-filing-helper", EMPTY);
  const v = tidy(flow.value);
  const set = (patch: Partial<Inputs>) => flow.setValue({ ...v, ...patch });
  const pristine = JSON.stringify(v) === START;
  const result = checkAnswers(PRACTICE_SHEET, v.typed);
  // After Start over the page sits on step 1, but the "Put it back" offer must stay.
  const [cleared, setCleared] = useState(false);
  const reset = (next: Inputs) => {
    setCleared(JSON.stringify(next) === START);
    flow.setValue(next);
  };
  const go = (step: number, sub = v.sub) => set({ step, sub });

  return (
    <ScreenFrame title={COPY.title} as="div" reserve="0">
      <div className="nt-tfh">
        <p className="nt-tfh-banner" role="note">{COPY.banner}</p>

        {flow.hasSaved && pristine ? (
          <div className="nt-tfh-status">
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

        <StepLabel n={v.step} of={STEPS}>{COPY.stepNames[v.step - 1]}</StepLabel>

        {v.step === 1 ? <Pick v={v} set={set} next={() => go(2)} /> : null}
        {v.step === 2 ? <Sheet back={() => go(1)} next={() => go(3, 0)} /> : null}
        {v.step === 3 ? (
          <CopyIn v={v} set={set} back={() => (v.sub > 0 ? go(3, v.sub - 1) : go(2))} next={() => (v.sub < SCREENS.length - 1 ? go(3, v.sub + 1) : go(4))} />
        ) : null}
        {v.step === 4 ? <Review v={v} result={result} back={() => go(3, SCREENS.length - 1)} /> : null}

        {v.step >= 3 || (cleared && pristine) ? <StartOver flowId="tax-filing-helper" value={flow.value} empty={EMPTY} onChange={reset} /> : null}
        <p className="nt-tfh-note">{COPY.note}</p>
        <PrivacyNote />
      </div>
    </ScreenFrame>
  );
}

function Pick({ v, set, next }: { v: Inputs; set: (p: Partial<Inputs>) => void; next: () => void }) {
  const c = COPY.pick;
  const options = [["guided", c.guided], ["fillable", c.fillable]] as const;
  return (
    <>
      <p className="nt-tfh-lead">{COPY.intro}</p>
      <fieldset className="nt-tfh-choices">
        <legend>{c.legend}</legend>
        {options.map(([id, o], i) => (
          <label key={id} className={`nt-tfh-choice${v.way === id ? " nt-tfh-choice-on" : ""}`}>
            <input type="radio" name="way" value={id} checked={v.way === id} autoFocus={i === 0} onChange={() => set({ way: id })} />
            <span>
              <strong>{o.name}</strong>
              {o.lines.map((l) => <span key={l} className="nt-tfh-line">{l}</span>)}
            </span>
          </label>
        ))}
      </fieldset>
      <p className="nt-tfh-help">{c.closed}</p>
      <p className="nt-tfh-help">{c.start}</p>
      <Source label={c.sourceLabel} />

      <section className="nt-tfh-who" aria-label={COPY.who.heading}>
        <h2>{COPY.who.heading}</h2>
        <p className="nt-tfh-help">{COPY.who.note}</p>
        <table className="nt-tfh-table">
          <thead>
            <tr><th scope="col">{COPY.who.helperHead}</th><th scope="col">{COPY.who.youHead}</th></tr>
          </thead>
          <tbody>
            {COPY.who.rows.map(([a, b]) => <tr key={a}><td>{a}</td><td>{b}</td></tr>)}
          </tbody>
        </table>
        <p className="nt-tfh-help">{COPY.who.never}</p>
        <Source label={COPY.who.sourceLabel} />
      </section>

      <div className="nt-tfh-actions">
        <button type="button" className="primary nt-tfh-btn" onClick={next}>{COPY.next}</button>
      </div>
    </>
  );
}

function Sheet({ back, next }: { back: () => void; next: () => void }) {
  const c = COPY.sheet;
  return (
    <>
      <h2 className="nt-tfh-h2">{c.heading}</h2>
      <p className="nt-tfh-lead">{c.lead} {c.madeUp}</p>
      {SCREENS.map((s, i) => (
        <section key={s.name} className="nt-tfh-card" aria-label={`${c.screenWord} ${i + 1}: ${s.name}`}>
          <h3>{`${c.screenWord} ${i + 1}: ${s.name}`}</h3>
          <dl className="nt-tfh-lines">
            {s.items.map((it) => (
              <div key={it.id}>
                <dt>{it.label}</dt>
                <dd>{sayValue(it)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <div className="nt-tfh-actions">
        <button type="button" className="nt-tfh-btn nt-tfh-outline" onClick={back}>{COPY.back}</button>
        <button type="button" className="primary nt-tfh-btn" onClick={next}>{COPY.next}</button>
      </div>
    </>
  );
}

function CopyIn({ v, set, back, next }: { v: Inputs; set: (p: Partial<Inputs>) => void; back: () => void; next: () => void }) {
  const c = COPY.copyIn;
  const screen = SCREENS[v.sub];
  const last = v.sub === SCREENS.length - 1;
  return (
    <>
      <h2 className="nt-tfh-h2">{`${c.heading} ${v.sub + 1} ${c.of} ${SCREENS.length}: ${screen.name}`}</h2>
      <p className="nt-tfh-help">{c.hint}</p>
      <form className="nt-tfh-form" onSubmit={(e) => e.preventDefault()} noValidate>
        {screen.items.map((it, i) => (
          <div key={it.id} className="nt-tfh-item">
            <p className="nt-tfh-type">{c.typeThis}</p>
            <p className="nt-tfh-big">{sayValue(it)}</p>
            <Field
              label={it.label}
              inputMode={it.kind === "money" ? "decimal" : "text"}
              autoFocus={i === 0}
              value={v.typed[it.id] ?? ""}
              onChange={(t) => set({ typed: { ...v.typed, [it.id]: t } })}
            />
          </div>
        ))}
      </form>
      <p className="nt-tfh-help">{c.undo}</p>
      <div className="nt-tfh-actions">
        <button type="button" className="nt-tfh-btn nt-tfh-outline" onClick={back}>{COPY.back}</button>
        <button type="button" className="primary nt-tfh-btn" onClick={next}>{last ? COPY.toReview : COPY.nextScreen}</button>
      </div>
    </>
  );
}

type Good = Extract<ReturnType<typeof checkAnswers>, { ok: true }>;

function Review({ v, result, back }: { v: Inputs; result: ReturnType<typeof checkAnswers>; back: () => void }) {
  const r = COPY.review;
  const wayName = v.way === "guided" ? COPY.pick.guided.name : v.way === "fillable" ? COPY.pick.fillable.name : "";
  const good = result.ok ? (result as Good) : null;
  const word = (s: string) => (s === "match" ? r.match : s === "different" ? r.different : r.missing);

  function save() {
    if (!good) return;
    const text = [
      COPY.save.fileTitle,
      "",
      good.summary,
      ...good.rows.map((x: Good["rows"][number]) => x.message),
      "",
      r.stop,
      COPY.note,
      "",
    ].join("\n");
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
      <h2 className="nt-tfh-h2">{r.heading}</h2>
      <ResultCard label={r.resultLabel} answer={good ? good.summary : undefined} waiting="The check shows here">
        <p className="nt-tfh-help">{wayName ? `${r.youPicked}: ${wayName}.` : r.notPicked}</p>
      </ResultCard>

      <section className="nt-tfh-stop" aria-label="Stop">
        <p className="nt-tfh-stop-text">{r.stop}</p>
        <p>
          <a className="nt-tfh-link" href={START_URL} rel="noreferrer">{r.openReal}</a>
        </p>
        <p className="nt-tfh-help">{r.openRealHelp}</p>
      </section>

      {good ? (
        <section aria-label={r.tableCaption} className="nt-tfh-compare">
          <h3>{r.tableCaption}</h3>
          <ul className="nt-tfh-rows">
            {good.rows.map((x: Good["rows"][number]) => (
              <li key={x.id} className={`nt-tfh-row nt-tfh-${x.status}`}>
                <p className="nt-tfh-row-head">
                  <span>{x.label}</span>
                  <strong>{word(x.status)}</strong>
                </p>
                <p className="nt-tfh-row-line">{`${r.sheetHead}: ${x.expected}`}</p>
                <p className="nt-tfh-row-line">{`${r.typedHead}: ${x.typed || r.nothingTyped}`}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="nt-tfh-watch" aria-label={r.watch.heading}>
        <h3>{r.watch.heading}</h3>
        <ul>
          {r.watch.items.map((t) => <li key={t}>{t}</li>)}
        </ul>
        <Source label={r.watch.sourceLabel} />
      </section>

      <div className="nt-tfh-actions">
        <button type="button" className="nt-tfh-btn nt-tfh-outline" onClick={back}>{COPY.back}</button>
      </div>

      <SavePrintSheet title={COPY.save.title} onSave={save}>
        {good ? (
          <>
            <p>{good.summary}</p>
            {good.rows.map((x: Good["rows"][number]) => <p key={x.id}>{x.message}</p>)}
          </>
        ) : null}
      </SavePrintSheet>
    </>
  );
}

export default Page;
