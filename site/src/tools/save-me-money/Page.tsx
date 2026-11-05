import { useId, useState } from "react";
import { CalmMessage } from "../../components/CalmMessage";
import { ErrorNote, Field, MoneyField, PrivacyNote, ResultCard, StartOver } from "../../components/calc";
import { SavePrintSheet } from "../../components/SavePrintSheet";
import { ScreenFrame } from "../../components/ScreenFrame";
import { useAutosave } from "../../lib/useAutosave";
import { formatMoney, listCosts, MAX_ROWS, QUESTIONS } from "../../../../tools/save-me-money/calc.mjs";
import { COPY } from "./copy";
import "./Page.css";

type Every = "week" | "month" | "year";
type Line = { id: string; name: string; amount: string; every: Every };
type Inputs = { next: number; items: Line[]; picked: string[] };

const NAMES = ["Phone", "Internet", "Streaming", "Insurance", "Gym", "Other"];
const initial = (): Inputs => ({
  next: 20,
  items: NAMES.map((name, i) => ({ id: `c${i + 1}`, name, amount: "", every: "month" as Every })),
  picked: [],
});
const EMPTY = initial();
const START = JSON.stringify(EMPTY);
const EVERY: Every[] = ["week", "month", "year"];

// Saved data could be old or damaged. Keep only what has the right shape.
function tidy(v: Inputs): Inputs {
  if (!v || typeof v !== "object") return EMPTY;
  const items: Line[] = Array.isArray(v.items)
    ? v.items.filter((l) => l && typeof l === "object" && typeof l.id === "string").map((l) => ({
        id: l.id,
        name: typeof l.name === "string" ? l.name : "",
        amount: typeof l.amount === "string" ? l.amount : "",
        every: EVERY.includes(l.every) ? l.every : "month",
      }))
    : [];
  const picked = Array.isArray(v.picked) ? v.picked.filter((p): p is string => typeof p === "string") : [];
  return { next: typeof v.next === "number" ? v.next : 100, items, picked };
}

const shown = (l: Line, i: number) => l.name.trim() || `${COPY.fallback} ${i + 1}`;

export function Page() {
  const flow = useAutosave<Inputs>("save-me-money", EMPTY);
  const v = tidy(flow.value);
  const set = (next: Inputs) => flow.setValue(next);
  const change = (id: string, patch: Partial<Line>) => set({ ...v, items: v.items.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const [undo, setUndo] = useState<{ index: number; line: Line } | null>(null);
  const remove = (id: string) => {
    const index = v.items.findIndex((l) => l.id === id);
    if (index < 0) return;
    setUndo({ index, line: v.items[index] });
    set({ ...v, items: v.items.filter((l) => l.id !== id) });
  };
  const putBack = () => {
    if (!undo) return;
    const rows = v.items.filter((l) => l.id !== undo.line.id);
    rows.splice(Math.min(undo.index, rows.length), 0, undo.line);
    set({ ...v, items: rows });
    setUndo(null);
  };
  const add = () => set({ ...v, next: v.next + 1, items: [...v.items, { id: `c${v.next}`, name: "", amount: "", every: "month" }] });
  const toggle = (id: string) => set({ ...v, picked: v.picked.includes(id) ? v.picked.filter((p) => p !== id) : [...v.picked, id] });

  // Derived in render: no timers, no effects. The list follows the typing.
  const result = listCosts({ items: v.items.map(({ name, amount, every }) => ({ name, amount, every })) });
  const problems = result.ok ? [] : result.problems;
  const bad = (field: string) => problems.find((p: { field: string }) => p.field === field)?.message as string | undefined;
  const pristine = JSON.stringify(v) === START;

  return (
    <ScreenFrame title={COPY.title} as="div" reserve="0">
      <div className="nt-smm">
        <p className="nt-smm-intro">{COPY.intro}</p>
        <PrivacyNote />

        {flow.hasSaved && pristine ? (
          <div className="nt-smm-status">
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

        <h2 className="nt-smm-h">{COPY.step1}</h2>
        <form className="nt-smm-form" onSubmit={(e) => e.preventDefault()} noValidate>
          <section className="nt-smm-list" aria-label={COPY.step1}>
            {v.items.map((l, i) => {
              const label = shown(l, i);
              return (
                <div key={l.id} className="nt-smm-row">
                  <Field
                    label={`${COPY.nameLabel} ${i + 1}`}
                    inputMode="text"
                    value={l.name}
                    placeholder={`${COPY.fallback} ${i + 1}`}
                    onChange={(t) => change(l.id, { name: t })}
                  />
                  <MoneyField
                    label={`${label}, ${COPY.amountSuffix}`}
                    placeholder={COPY.amountPlaceholder}
                    autoFocus={i === 0}
                    value={l.amount}
                    onChange={(t) => change(l.id, { amount: t })}
                    error={bad(`items.${i}`)}
                  />
                  <EverySelect label={`${label}, ${COPY.howOften}`} value={l.every} onChange={(e) => change(l.id, { every: e })} />
                  <button type="button" className="nt-smm-remove" aria-label={`${COPY.remove} ${label}`} onClick={() => remove(l.id)}>
                    {COPY.remove}
                  </button>
                  <span className="nt-smm-help nt-smm-removehint">{COPY.removeHint}</span>
                </div>
              );
            })}
            {undo ? (
              <p className="nt-smm-help">
                <button type="button" className="nt-smm-add" onClick={putBack}>
                  {COPY.undo}
                </button>{" "}
                {COPY.undoHelp}
              </p>
            ) : null}
            {v.items.length < MAX_ROWS ? (
              <button type="button" className="nt-smm-add" onClick={add}>
                {COPY.add}
              </button>
            ) : (
              <p className="nt-smm-help">{COPY.full}</p>
            )}
          </section>
        </form>

        <StartOver flowId="save-me-money" value={flow.value} empty={EMPTY} onChange={flow.setValue} />

        {result.ok && !result.hasAmounts ? <p className="nt-smm-status">{COPY.empty}</p> : null}
        {!result.ok ? <ErrorNote>{COPY.fixFirst}</ErrorNote> : null}

        {result.ok && result.hasAmounts ? (
          <Done result={result} items={v.items} picked={v.picked} toggle={toggle} />
        ) : (
          <>
            <h2 className="nt-smm-h">{COPY.step2}</h2>
            <ResultCard label={COPY.result.label} waiting={COPY.waiting} closing={false} />
            <Soon />
            <h2 className="nt-smm-h">{COPY.step3}</h2>
            <SavePrintSheet savePrimary title={COPY.save.title} onSave={() => {}}>{null}</SavePrintSheet>
          </>
        )}

        <p className="nt-smm-note">{COPY.notes.count}</p>
        <p className="nt-smm-note">{COPY.never}</p>
        <p className="nt-smm-note">{COPY.source}</p>
      </div>
    </ScreenFrame>
  );
}

function EverySelect({ label, value, onChange }: { label: string; value: Every; onChange: (e: Every) => void }) {
  const id = useId();
  return (
    <div className="nt-smm-select-wrap">
      <label className="nt-smm-select-label" htmlFor={id}>{label}</label>
      <select id={id} className="nt-smm-select" value={value} onChange={(e) => onChange(e.target.value as Every)}>
        {EVERY.map((e) => (
          <option key={e} value={e}>{COPY.every[e]}</option>
        ))}
      </select>
    </div>
  );
}

function Soon() {
  return (
    <details className="nt-smm-details">
      <summary>{COPY.soon.heading}</summary>
      <div className="nt-smm-details-body">
        <p>{COPY.soon.body}</p>
      </div>
    </details>
  );
}

type Good = Extract<ReturnType<typeof listCosts>, { ok: true }>;

function Done({ result, items, picked, toggle }: { result: Good; items: Line[]; picked: string[]; toggle: (id: string) => void }) {
  const r = COPY.result;
  const rows = result.rows as Good["rows"];
  const idOf = (x: Good["rows"][number]) => items[x.index]?.id ?? "";
  const chosen = rows.filter((x) => picked.includes(idOf(x)));
  const say = (x: Good["rows"][number]) => `${formatMoney(x.yearlyCents)} ${COPY.list.aYear}, ${formatMoney(x.monthlyCents)} ${COPY.list.aMonth}`;

  function save() {
    const text = [
      COPY.save.fileTitle,
      "",
      `${r.label}: ${formatMoney(result.yearlyCents)}`,
      `${r.perMonth}: ${formatMoney(result.monthlyCents)}`,
      "",
      ...rows.map((x) => `${x.name}: ${say(x)}${picked.includes(idOf(x)) ? ` (${COPY.save.first})` : ""}`),
      ...(chosen.length > 0 ? ["", `${COPY.questions.heading}:`, ...QUESTIONS] : []),
      "",
      COPY.notes.count,
      COPY.source,
      COPY.never,
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
      <h2 className="nt-smm-h">{COPY.step2}</h2>
      <ResultCard label={r.label} answer={formatMoney(result.yearlyCents)} closing={false}>
        <dl className="nt-smm-lines">
          <div>
            <dt>{r.perMonth}</dt>
            <dd>{formatMoney(result.monthlyCents)}</dd>
          </div>
          <div>
            <dt>{r.howMany}</dt>
            <dd>{result.count}</dd>
          </div>
        </dl>
        <p className="nt-smm-help">{r.leftOut}</p>
        <p className="nt-smm-help">{r.done}</p>
      </ResultCard>

      <section className="nt-smm-picks" aria-label={COPY.list.heading}>
        <h2>{COPY.list.heading}</h2>
        <p className="nt-smm-help">{COPY.list.help}</p>
        <ul className="nt-smm-picklist">
          {rows.map((x) => (
            <li key={x.index}>
              <label className="nt-smm-pick">
                <input type="checkbox" checked={picked.includes(idOf(x))} onChange={() => toggle(idOf(x))} />
                <span className="nt-smm-pick-text">
                  <span className="nt-smm-pick-name">{x.name}</span>: {say(x)}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="nt-smm-questions" aria-label={COPY.questions.heading}>
        <h2>{COPY.questions.heading}</h2>
        {chosen.length === 0 ? (
          <p className="nt-smm-help nt-smm-grey">{COPY.questions.none}</p>
        ) : (
          <>
            <p>{COPY.questions.forThese}: {chosen.map((x) => x.name).join(", ")}</p>
            <ul>
              {QUESTIONS.map((q: string) => <li key={q}>{q}</li>)}
            </ul>
            <p className="nt-smm-help">{COPY.questions.note}</p>
          </>
        )}
      </section>

      <Soon />

      <details className="nt-smm-details">
        <summary>{COPY.more.summary}</summary>
        <div className="nt-smm-details-body">
          <div className="nt-smm-table-wrap">
            <table className="nt-smm-table">
              <caption>{COPY.more.tableHeading}</caption>
              <thead>
                <tr>
                  <th scope="col">{COPY.more.line}</th>
                  <th scope="col">{COPY.more.typed}</th>
                  <th scope="col">{COPY.more.year}</th>
                  <th scope="col">{COPY.more.month}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((x) => (
                  <tr key={x.index}>
                    <th scope="row">{x.name}</th>
                    <td>{formatMoney(x.amountCents)} {COPY.every[x.every as Every].toLowerCase()}</td>
                    <td>{formatMoney(x.yearlyCents)}</td>
                    <td>{formatMoney(x.monthlyCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="nt-smm-help">{COPY.more.note}</p>
        </div>
      </details>

      <h2 className="nt-smm-h">{COPY.step3}</h2>
      <SavePrintSheet savePrimary title={COPY.save.title} onSave={save}>
        <p>{COPY.save.preview}</p>
      </SavePrintSheet>
    </>
  );
}

export default Page;
