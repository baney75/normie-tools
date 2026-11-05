import { useState } from "react";
import { CalmMessage } from "../../components/CalmMessage";
import { ErrorNote, Field, MoneyField, PrivacyNote, ResultCard, StartOver, StepLabel } from "../../components/calc";
import { SavePrintSheet } from "../../components/SavePrintSheet";
import { ScreenFrame } from "../../components/ScreenFrame";
import { useAutosave } from "../../lib/useAutosave";
import { formatMoney, MAX_ROWS, planBudget } from "../../../../tools/monthly-budget/calc.mjs";
import { COPY } from "./copy";
import "./Page.css";

type Line = { id: string; name: string; amount: string };
type Inputs = { next: number; income: Line[]; expenses: Line[] };
type Kind = "income" | "expenses";

const mk = (prefix: string, names: string[]): Line[] => names.map((name, i) => ({ id: `${prefix}${i + 1}`, name, amount: "" }));
const initial = (): Inputs => ({
  next: 20,
  income: mk("i", ["Pay"]),
  expenses: mk("e", ["Rent or mortgage", "Food", "Bills", "Transport", "Other"]),
});
const EMPTY = initial();
const START = JSON.stringify(EMPTY);

// Saved data could be old or damaged. Keep only what has the right shape.
function tidy(v: Inputs): Inputs {
  const lines = (x: unknown): Line[] =>
    Array.isArray(x)
      ? x.filter((l) => l && typeof l === "object" && typeof l.id === "string").map((l) => ({
          id: l.id,
          name: typeof l.name === "string" ? l.name : "",
          amount: typeof l.amount === "string" ? l.amount : "",
        }))
      : [];
  if (!v || typeof v !== "object") return EMPTY;
  return { next: typeof v.next === "number" ? v.next : 100, income: lines(v.income), expenses: lines(v.expenses) };
}

const shown = (l: Line, fallback: string, i: number) => l.name.trim() || `${fallback} ${i + 1}`;
const pct = (n: number | null) => (n === null ? "" : `${n}%`);

export function Page() {
  const flow = useAutosave<Inputs>("monthly-budget", EMPTY);
  const v = tidy(flow.value);
  const set = (next: Inputs) => flow.setValue(next);
  const change = (kind: Kind, id: string, patch: Partial<Line>) =>
    set({ ...v, [kind]: v[kind].map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const [undo, setUndo] = useState<{ kind: Kind; index: number; line: Line } | null>(null);
  const remove = (kind: Kind, id: string) => {
    const index = v[kind].findIndex((l) => l.id === id);
    if (index < 0) return;
    setUndo({ kind, index, line: v[kind][index] });
    set({ ...v, [kind]: v[kind].filter((l) => l.id !== id) });
  };
  const putBack = () => {
    if (!undo) return;
    const rows = v[undo.kind].filter((l) => l.id !== undo.line.id);
    rows.splice(Math.min(undo.index, rows.length), 0, undo.line);
    set({ ...v, [undo.kind]: rows });
    setUndo(null);
  };
  const add = (kind: Kind) =>
    set({ ...v, next: v.next + 1, [kind]: [...v[kind], { id: `${kind === "income" ? "i" : "e"}${v.next}`, name: "", amount: "" }] });

  // Derived in render: no timers, no effects. The answer follows the typing.
  const result = planBudget({
    income: v.income.map(({ name, amount }) => ({ name, amount })),
    expenses: v.expenses.map(({ name, amount }) => ({ name, amount })),
  });
  const problems = result.ok ? [] : result.problems;
  const bad = (field: string) => problems.find((p: { field: string }) => p.field === field)?.message as string | undefined;
  const pristine = JSON.stringify(v) === START;

  return (
    <ScreenFrame title={COPY.title} as="div" reserve="0">
      <div className="nt-budget">
        <p className="nt-budget-intro">{COPY.intro}</p>

        {flow.hasSaved && pristine ? (
          <div className="nt-budget-status">
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
        <form className="nt-budget-form" onSubmit={(e) => e.preventDefault()} noValidate>
          {(["income", "expenses"] as const).map((kind) => {
            const c = kind === "income" ? COPY.income : COPY.spending;
            return (
              <section key={kind} className="nt-budget-list" aria-label={c.heading}>
                <h2>{c.heading}</h2>
                <p className="nt-budget-help">{COPY.removeHint}</p>
                {v[kind].map((l, i) => {
                  const label = shown(l, c.fallback, i);
                  return (
                    <div key={l.id} className="nt-budget-row">
                      <Field
                        label={`${c.nameLabel} ${i + 1}`}
                        inputMode="text"
                        value={l.name}
                        placeholder={c.fallback}
                        onChange={(t) => change(kind, l.id, { name: t })}
                      />
                      <MoneyField
                        label={`${label}, ${COPY.amount.suffix}`}
                        placeholder={COPY.amount.placeholder}
                        autoFocus={kind === "income" && i === 0}
                        value={l.amount}
                        onChange={(t) => change(kind, l.id, { amount: t })}
                        error={bad(`${kind}.${i}`)}
                      />
                      <button type="button" className="nt-budget-remove" aria-label={`${COPY.remove} ${label}`} onClick={() => remove(kind, l.id)}>
                        {COPY.remove}
                      </button>
                    </div>
                  );
                })}
                {undo && undo.kind === kind ? (
                  <p className="nt-budget-help">
                    <button type="button" className="nt-budget-add" onClick={putBack}>
                      {COPY.undo}
                    </button>{" "}
                    {COPY.undoHelp}
                  </p>
                ) : null}
                {v[kind].length < MAX_ROWS ? (
                  <button type="button" className="nt-budget-add" onClick={() => add(kind)}>
                    {c.add}
                  </button>
                ) : (
                  <p className="nt-budget-help">{COPY.full}</p>
                )}
              </section>
            );
          })}
        </form>

        <StartOver flowId="monthly-budget" value={flow.value} empty={EMPTY} onChange={flow.setValue} />

        {result.ok && !result.hasAmounts ? <p className="nt-budget-status">{COPY.empty}</p> : null}
        {!result.ok ? <ErrorNote>{COPY.fixFirst}</ErrorNote> : null}

        <Answer result={result} />

        <p className="nt-budget-note">{COPY.notes.count}</p>
        <PrivacyNote />
      </div>
    </ScreenFrame>
  );
}

type Good = Extract<ReturnType<typeof planBudget>, { ok: true }>;

function Answer({ result: whole }: { result: ReturnType<typeof planBudget> }) {
  const r = COPY.result;
  if (!whole.ok || !whole.hasAmounts) {
    return (
      <>
        <ResultCard label={r.leftLabel} step={COPY.step2} waiting={COPY.waiting} />
        <SavePrintSheet title={COPY.save.title} onSave={() => {}}>{null}</SavePrintSheet>
      </>
    );
  }
  return <Done result={whole} />;
}

function Done({ result }: { result: Good }) {
  const r = COPY.result;
  const hasIncome = result.incomeCents > 0;
  const rows = result.expenseRows.filter((x: { cents: number }) => x.cents > 0) as Good["expenseRows"];
  const leftHelp =
    result.leftCents < 0 ? `${r.leftMinus} ${formatMoney(-result.leftCents)}.` : result.leftCents === 0 ? r.leftZero : r.leftPlus;
  const totals: [string, string][] = [
    [r.totalIncome, formatMoney(result.incomeCents)],
    [r.totalSpending, formatMoney(result.spendingCents)],
  ];
  const sayPct = (x: Good["expenseRows"][number]) =>
    hasIncome ? `${pct(x.percentOfIncome)} ${COPY.where.ofIncome}` : `${pct(x.shareOfSpending)} ${COPY.where.ofSpending}`;
  const width = (x: Good["expenseRows"][number]) => Math.max(0, Math.min(100, (hasIncome ? x.percentOfIncome : x.shareOfSpending) ?? 0));

  function save() {
    const text = [
      COPY.save.fileTitle,
      "",
      ...totals.map(([k, val]) => `${k}: ${val}`),
      `${r.leftLabel}: ${formatMoney(result.leftCents)}`,
      "",
      ...rows.map((x) => `${x.name}: ${formatMoney(x.cents)} (${sayPct(x)})`),
      "",
      COPY.notes.count,
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
      <ResultCard label={r.leftLabel} step={COPY.step2} answer={formatMoney(result.leftCents)}>
        <p className="nt-budget-help">{leftHelp}</p>
        <dl className="nt-budget-lines">
          {totals.map(([k, val]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{val}</dd>
            </div>
          ))}
        </dl>
      </ResultCard>

      {rows.length > 0 ? (
        <section className="nt-budget-where" aria-label={COPY.where.heading}>
          <h2>{COPY.where.heading}</h2>
          {!hasIncome ? <p className="nt-budget-help">{COPY.where.noIncome}</p> : null}
          <ul className="nt-budget-bars">
            {rows.map((x, i) => (
              <li key={`${x.name}-${i}`}>
                <div className="nt-budget-bar-head">
                  <span>{x.name}</span>
                  <span className="nt-budget-bar-num">{formatMoney(x.cents)}</span>
                </div>
                <div className="nt-budget-bar" aria-hidden="true">
                  <div className="nt-budget-bar-fill" style={{ width: `${width(x)}%` }} />
                </div>
                <p className="nt-budget-bar-pct">{sayPct(x)}</p>
              </li>
            ))}
          </ul>
          <p className="nt-budget-help">{COPY.where.barNote}</p>
        </section>
      ) : null}

      <details className="nt-budget-details">
        <summary>{COPY.more.summary}</summary>
        <div className="nt-budget-details-body">
          {rows.length > 0 ? (
            <div className="nt-budget-table-wrap">
              <table className="nt-budget-table">
                <caption>{COPY.more.tableHeading}</caption>
                <thead>
                  <tr>
                    <th scope="col">{COPY.more.line}</th>
                    <th scope="col">{COPY.more.amount}</th>
                    <th scope="col">{COPY.more.ofIncome}</th>
                    <th scope="col">{COPY.more.ofSpending}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((x, i) => (
                    <tr key={`${x.name}-${i}`}>
                      <th scope="row">{x.name}</th>
                      <td>{formatMoney(x.cents)}</td>
                      <td>{pct(x.percentOfIncome) || "-"}</td>
                      <td>{pct(x.shareOfSpending)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {hasIncome ? (
            <p className="nt-budget-help">{COPY.more.spentPercent}: {pct(result.spendingPercentOfIncome)}</p>
          ) : null}
          <p className="nt-budget-help">{COPY.more.note}</p>
        </div>
      </details>

      <SavePrintSheet title={COPY.save.title} onSave={save}>
        <p>{COPY.save.preview}</p>
      </SavePrintSheet>
    </>
  );
}

export default Page;
