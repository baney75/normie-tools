import { useState } from "react";
import { X } from "lucide-react";
import { CalmMessage } from "../../components/CalmMessage";
import { amountText, ErrorNote, Field, MoneyField, RemoveAsk, ResultCard, Finish, SeeAnswer, StartOver, ToolLayout } from "../../components/calc";
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
/** Percent with one decimal, worked straight from the cents so no line is off. */
const pct = (cents: number, base: number) => {
  if (base <= 0) return "";
  const tenths = Math.floor((cents * 2000 + base) / (base * 2));
  return `${Math.floor(tenths / 10)}.${tenths % 10}%`;
};

export function Page() {
  const flow = useAutosave<Inputs>("monthly-budget", EMPTY);
  const v = tidy(flow.value);
  const set = (next: Inputs) => flow.setValue(next);
  const change = (kind: Kind, id: string, patch: Partial<Line>) =>
    set({ ...v, [kind]: v[kind].map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const [undo, setUndo] = useState<{ kind: Kind; index: number; line: Line } | null>(null);
  const [asking, setAsking] = useState<{ kind: Kind; id: string } | null>(null);
  const remove = (kind: Kind, id: string) => {
    setAsking(null);
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

  const good = result.ok && result.hasAmounts ? result : null;

  return (
    <ToolLayout
      name={COPY.title}
      question={COPY.question}
      answer={<Answer result={good} />}
      actions={good ? <Save result={good} /> : null}
      below={good ? <Details result={good} /> : null}
    >
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

      <form className="nt-budget-form" onSubmit={(e) => e.preventDefault()} noValidate>
        {(["income", "expenses"] as const).map((kind) => {
          const c = kind === "income" ? COPY.income : COPY.spending;
          const askIndex = asking && asking.kind === kind ? v[kind].findIndex((l) => l.id === asking.id) : -1;
          return (
            <section key={kind} className="nt-budget-list" aria-label={c.heading}>
              <h2>{c.heading}</h2>
              <div className="nt-budget-cols" aria-hidden="true">
                <span>{COPY.columns.name}</span>
                <span>{COPY.columns.amount}</span>
              </div>
              {v[kind].map((l, i) => {
                const label = shown(l, c.fallback, i);
                return (
                  <div key={l.id} className="nt-budget-row">
                    <Field
                      hideLabel
                      label={`${c.nameLabel} ${i + 1}`}
                      inputMode="text"
                      value={l.name}
                      placeholder={c.fallback}
                      onChange={(t) => change(kind, l.id, { name: t })}
                    />
                    <MoneyField
                      hideLabel
                      label={`${label}, ${COPY.amount.suffix}`}
                      value={l.amount}
                      onChange={(t) => change(kind, l.id, { amount: t })}
                      error={bad(`${kind}.${i}`)}
                    />
                    <button type="button" className="nt-budget-remove" aria-label={`${COPY.remove} ${label}`} onClick={() => setAsking({ kind, id: l.id })}>
                      <X aria-hidden="true" focusable="false" size={20} />
                    </button>
                  </div>
                );
              })}
              {askIndex >= 0 ? (
                <RemoveAsk
                  what={`${shown(v[kind][askIndex], c.fallback, askIndex)}, ${amountText(v[kind][askIndex].amount)}`}
                  onRemove={() => remove(kind, v[kind][askIndex].id)}
                  onKeep={() => setAsking(null)}
                />
              ) : null}
              {undo && undo.kind === kind ? (
                <p className="nt-budget-help">
                  {COPY.undoHelp}{" "}
                  <button type="button" className="nt-more-btn" onClick={putBack}>
                    {COPY.undo}
                  </button>
                </p>
              ) : null}
              {v[kind].length < MAX_ROWS ? (
                <button type="button" className="nt-more-btn" onClick={() => add(kind)}>
                  {c.add}
                </button>
              ) : (
                <p className="nt-budget-help">{COPY.full}</p>
              )}
            </section>
          );
        })}
        <p className="nt-budget-help">{COPY.removeNote}</p>
      </form>

      {!result.ok ? <ErrorNote>{COPY.fixFirst}</ErrorNote> : null}

      <SeeAnswer label={COPY.see} main={!good} />
      <StartOver flowId="monthly-budget" value={flow.value} empty={EMPTY} onChange={flow.setValue} />
    </ToolLayout>
  );
}

type Good = Extract<ReturnType<typeof planBudget>, { ok: true }>;

const pctOf = (result: Good) => (x: Good["expenseRows"][number]) =>
  result.incomeCents > 0
    ? `${pct(x.cents, result.incomeCents)} ${COPY.where.ofIncome}`
    : `${pct(x.cents, result.spendingCents)} ${COPY.where.ofSpending}`;
const spentRows = (result: Good) => result.expenseRows.filter((x: { cents: number }) => x.cents > 0) as Good["expenseRows"];

function Answer({ result }: { result: Good | null }) {
  const r = COPY.result;
  if (!result) return <ResultCard label={r.leftLabel} waiting={COPY.waiting} />;
  const leftHelp =
    result.leftCents < 0 ? `${r.leftMinus} ${formatMoney(-result.leftCents)}.` : result.leftCents === 0 ? r.leftZero : r.leftPlus;
  return (
    <ResultCard label={r.leftLabel} answer={formatMoney(result.leftCents)}>
      <p>{leftHelp}</p>
      <dl>
        <div>
          <dt>{r.totalIncome}</dt>
          <dd>{formatMoney(result.incomeCents)}</dd>
        </div>
        <div>
          <dt>{r.totalSpending}</dt>
          <dd>{formatMoney(result.spendingCents)}</dd>
        </div>
      </dl>
    </ResultCard>
  );
}

function Save({ result }: { result: Good }) {
  const r = COPY.result;
  const sayPct = pctOf(result);
  function save() {
    const text = [
      COPY.save.fileTitle,
      "",
      `${r.totalIncome}: ${formatMoney(result.incomeCents)}`,
      `${r.totalSpending}: ${formatMoney(result.spendingCents)}`,
      `${r.leftLabel}: ${formatMoney(result.leftCents)}`,
      "",
      ...spentRows(result).map((x) => `${x.name}: ${formatMoney(x.cents)} (${sayPct(x)})`),
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
    <Finish onSave={save} exact>
      <p>{COPY.save.preview}</p>
    </Finish>
  );
}

function Details({ result }: { result: Good }) {
  const hasIncome = result.incomeCents > 0;
  const rows = spentRows(result);
  const sayPct = pctOf(result);
  const width = (x: Good["expenseRows"][number]) =>
    Math.max(0, Math.min(100, (x.cents * 100) / (hasIncome ? result.incomeCents : result.spendingCents || 1)));
  return (
    <>
      {rows.length > 0 ? (
        <section className="nt-budget-where" aria-label={COPY.where.heading}>
          <h2>{COPY.where.heading}</h2>
          {!hasIncome ? <p className="nt-budget-help">{COPY.where.noIncome}</p> : null}
          <ul className="nt-budget-bars">
            {rows.map((x, i) => (
              <li key={`${x.name}-${i}`}>
                <div className="nt-budget-bar-head">
                  <span>{x.name}</span>
                  <span className="nt-budget-bar-num">{formatMoney(x.cents)}, {sayPct(x)}</span>
                </div>
                <div className="nt-budget-bar" aria-hidden="true">
                  <div className="nt-budget-bar-fill" style={{ width: `${width(x)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <details>
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
                      <td>{hasIncome ? pct(x.cents, result.incomeCents) : "-"}</td>
                      <td>{pct(x.cents, result.spendingCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {hasIncome ? (
            <p className="nt-budget-help">{COPY.more.spentPercent}: {pct(result.spendingCents, result.incomeCents)}</p>
          ) : null}
        </div>
      </details>
    </>
  );
}

export default Page;
