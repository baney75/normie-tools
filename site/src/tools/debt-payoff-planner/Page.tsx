import { useState } from "react";
import { CalmMessage } from "../../components/CalmMessage";
import { amountText, ErrorNote, Field, MoneyField, PercentField, PrivacyNote, RemoveAsk, ResultCard, StartOver } from "../../components/calc";
import { SavePrintSheet } from "../../components/SavePrintSheet";
import { ScreenFrame } from "../../components/ScreenFrame";
import { useAutosave } from "../../lib/useAutosave";
import { formatMoney, formatRate, planDebtPayoff } from "../../../../tools/debt-payoff-planner/calc.mjs";
import { COPY } from "./copy";
import "./Page.css";

type DebtText = { name: string; balance: string; rate: string; minimum: string };
type Inputs = { count: number; debts: DebtText[]; extra: string };

const MAX = 6;
const EMPTY_DEBT: DebtText = { name: "", balance: "", rate: "", minimum: "" };
const EMPTY: Inputs = { count: 2, debts: Array.from({ length: MAX }, () => ({ ...EMPTY_DEBT })), extra: "" };

const months = (n: number) => `${n} ${n === 1 ? COPY.result.month : COPY.result.months}`;
const isBlankDebt = (d: DebtText) => !d.name.trim() && !d.balance.trim() && !d.rate.trim() && !d.minimum.trim();

type Problem = { field: string; kind: string; message: string };

export function Page() {
  const flow = useAutosave<Inputs>("debt-payoff-planner", EMPTY);
  const v = flow.value;
  const shown = v.debts.slice(0, Math.min(Math.max(v.count, 1), MAX));
  const setDebt = (i: number, patch: Partial<DebtText>) =>
    flow.setValue({ ...v, debts: v.debts.map((d, k) => (k === i ? { ...d, ...patch } : d)) });
  const addDebt = () => flow.setValue({ ...v, count: Math.min(shown.length + 1, MAX) });
  const [undo, setUndo] = useState<DebtText | null>(null);
  const putBack = () => {
    if (!undo || shown.length >= MAX) return;
    flow.setValue({ ...v, count: shown.length + 1, debts: v.debts.map((d, k) => (k === shown.length ? undo : d)) });
    setUndo(null);
  };
  const [asking, setAsking] = useState(false);
  const last = shown[shown.length - 1];
  const lastWhat = `${last.name.trim() || `${COPY.debtLegend} ${shown.length}`}, ${COPY.balance.label} ${amountText(last.balance)}`;
  const removeDebt = () => {
    setAsking(false);
    setUndo(shown[shown.length - 1]);
    flow.setValue({
      ...v,
      count: Math.max(shown.length - 1, 1),
      debts: v.debts.map((d, k) => (k === shown.length - 1 ? { ...EMPTY_DEBT } : d)),
    });
  };

  // Derived in render: no timers, no effects. The answer follows the typing.
  const result = planDebtPayoff({ debts: shown, extra: v.extra });
  const problems: Problem[] = result.ok ? [] : result.problems;
  const bad = (field: string) => problems.find((p) => p.field === field && p.kind === "bad")?.message;
  const missing = problems.filter((p) => p.kind === "missing").map((p) => p.message);
  const blank = shown.every(isBlankDebt) && !v.extra.trim();
  const hasBad = problems.some((p) => p.kind === "bad");
  const wholeBad = bad("debts");

  return (
    <ScreenFrame title={COPY.title} as="div" reserve="0">
      <div className="nt-dpp">
        <p className="nt-dpp-intro">{COPY.intro}</p>
        <PrivacyNote />

        {flow.hasSaved && blank ? (
          <div className="nt-dpp-status">
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

        <form className="nt-dpp-form" onSubmit={(e) => e.preventDefault()} noValidate>
          {shown.map((d, i) => {
            const r = i + 1;
            const label = `${COPY.debtLegend} ${r}`;
            return (
              <fieldset className="nt-dpp-debt" key={i}>
                <legend>{label}</legend>
                <Field
                  label={`${label} ${COPY.name.label}`}
                  hint={COPY.name.hint}
                  placeholder={COPY.name.placeholder}
                  optional
                  autoFocus={i === 0}
                  inputMode="text"
                  value={d.name}
                  onChange={(t) => setDebt(i, { name: t })}
                />
                <MoneyField
                  label={`${label} ${COPY.balance.label}`}
                  hint={COPY.balance.hint}
                  value={d.balance}
                  onChange={(t) => setDebt(i, { balance: t })}
                  error={bad(`balance${r}`)}
                />
                <PercentField
                  label={`${label} ${COPY.rate.label}`}
                  hint={COPY.rate.hint}
                  value={d.rate}
                  onChange={(t) => setDebt(i, { rate: t })}
                  error={bad(`rate${r}`)}
                />
                <MoneyField
                  label={`${label} ${COPY.minimum.label}`}
                  hint={COPY.minimum.hint}
                  value={d.minimum}
                  onChange={(t) => setDebt(i, { minimum: t })}
                  error={bad(`minimum${r}`)}
                />
              </fieldset>
            );
          })}
          <div className="nt-dpp-actions">
            <button type="button" className="nt-dpp-button" onClick={addDebt} disabled={shown.length >= MAX}>
              {COPY.addDebt}
            </button>
            {shown.length > 1 ? (
              <div className="nt-dpp-pair">
                <button type="button" className="nt-dpp-button" onClick={() => setAsking(true)} disabled={asking}>
                  {COPY.removeDebt}
                </button>
                <span className="nt-dpp-help">{COPY.removeHint}</span>
              </div>
            ) : null}
            {asking && shown.length > 1 ? <RemoveAsk what={lastWhat} onRemove={removeDebt} onKeep={() => setAsking(false)} /> : null}
            {undo && shown.length < MAX ? (
              <div className="nt-dpp-pair">
                <button type="button" className="nt-dpp-button" onClick={putBack}>
                  {COPY.undo}
                </button>
                <span className="nt-dpp-help">{COPY.undoHelp}</span>
              </div>
            ) : null}
            {shown.length >= MAX ? <span className="nt-dpp-help">{COPY.upTo}</span> : null}
          </div>
          <MoneyField
            label={COPY.extra.label}
            hint={COPY.extra.hint}
            optional
            value={v.extra}
            onChange={(t) => flow.setValue({ ...v, extra: t })}
            error={bad("extra")}
          />
        </form>

        <StartOver flowId="debt-payoff-planner" value={flow.value} empty={EMPTY} onChange={flow.setValue} />

        {wholeBad ? <ErrorNote>{wholeBad}</ErrorNote> : null}
        {result.ok ? (
          <Answer result={result} />
        ) : (
          <ResultCard label={COPY.result.label} waiting={COPY.waiting} />
        )}

        {!result.ok && !blank && missing.length > 0 && !hasBad ? (
          <div className="nt-dpp-status" role="status">
            <p>{COPY.stillNeeded}</p>
            <ul>
              {missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {!result.ok && !blank && hasBad ? <ErrorNote>{COPY.fixFirst}</ErrorNote> : null}

        <p className="nt-dpp-note">{COPY.notes.estimate}</p>

        <details className="nt-dpp-details">
          <summary>{COPY.key.summary}</summary>
          <div className="nt-dpp-details-body">
            <dl className="nt-dpp-key">
              {COPY.key.items.map((k) => (
                <div key={k.term}>
                  <dt>{k.term}</dt>
                  <dd>{k.means}</dd>
                </div>
              ))}
            </dl>
          </div>
        </details>
      </div>
    </ScreenFrame>
  );
}

type Good = Extract<ReturnType<typeof planDebtPayoff>, { ok: true }>;
type PlanKey = "snowball" | "avalanche";
const PLAN_KEYS: PlanKey[] = ["snowball", "avalanche"];

function differenceLines(result: Good): string[] {
  const r = COPY.result;
  const d = result.difference;
  const other = (k: PlanKey) => COPY.plans[k === "snowball" ? "avalanche" : "snowball"].name;
  const interest =
    d.lessInterest === "same"
      ? r.same
      : `${COPY.plans[d.lessInterest as PlanKey].name} ${r.less} ${other(d.lessInterest as PlanKey)}.`;
  const time =
    d.fewerMonths === "same"
      ? r.monthsSame
      : `${COPY.plans[d.fewerMonths as PlanKey].name} ${r.monthsFewer} ${months(d.monthsApart)}.`;
  return [interest, time];
}

function Answer({ result }: { result: Good }) {
  const r = COPY.result;
  const lines = differenceLines(result);
  const orderOf = (k: PlanKey) => JSON.stringify(result[k].order);
  const same =
    result.difference.lessInterest === "same" &&
    result.difference.fewerMonths === "same" &&
    result.snowball.totalPaidCents === result.avalanche.totalPaidCents &&
    orderOf("snowball") === orderOf("avalanche");

  function save() {
    const text = [
      COPY.save.title,
      "",
      ...lines,
      "",
      ...PLAN_KEYS.flatMap((k) => {
        const p = result[k];
        return [
          COPY.plans[k].name,
          `${r.monthsFinal}: ${p.months}`,
          `${r.totalInterest}: ${formatMoney(p.totalInterestCents)}`,
          `${r.totalPaid}: ${formatMoney(p.totalPaidCents)}`,
          `${r.orderHeading}:`,
          ...p.order.map((s: { name: string; month: number }, i: number) => `${i + 1}. ${s.name}, ${r.orderMonth} ${s.month}`),
          "",
        ];
      }),
      COPY.notes.estimate,
      COPY.notes.facts,
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
      <ResultCard label={r.label} answer={formatMoney(result.difference.interestApartCents)}>
        {lines.map((l) => (
          <p className="nt-dpp-help" key={l}>
            {l}
          </p>
        ))}
      </ResultCard>

      {same ? (
        <section className="nt-dpp-plan" aria-label={r.bothHeading}>
          <h2>{r.bothHeading}</h2>
          <p className="nt-dpp-help">{r.bothLine}</p>
          <dl className="nt-dpp-lines">
            <div>
              <dt>{r.monthsFinal}</dt>
              <dd>{months(result.snowball.months)}</dd>
            </div>
            <div>
              <dt>{r.totalInterest}</dt>
              <dd>{formatMoney(result.snowball.totalInterestCents)}</dd>
            </div>
            <div>
              <dt>{r.totalPaid}</dt>
              <dd>{formatMoney(result.snowball.totalPaidCents)}</dd>
            </div>
          </dl>
          <h3>{r.orderHeading}</h3>
          <ol className="nt-dpp-order">
            {result.snowball.order.map((s: { name: string; month: number }, i: number) => (
              <li key={i}>
                {s.name}: {r.orderMonth} {s.month}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {(same ? [] : PLAN_KEYS).map((k) => {
        const p = result[k];
        return (
          <section className="nt-dpp-plan" key={k} aria-label={`${COPY.plans[k].name} plan`}>
            <h2>{COPY.plans[k].name}</h2>
            <p className="nt-dpp-help">{COPY.plans[k].line}</p>
            <dl className="nt-dpp-lines">
              <div>
                <dt>{r.monthsFinal}</dt>
                <dd>{months(p.months)}</dd>
              </div>
              <div>
                <dt>{r.totalInterest}</dt>
                <dd>{formatMoney(p.totalInterestCents)}</dd>
              </div>
              <div>
                <dt>{r.totalPaid}</dt>
                <dd>{formatMoney(p.totalPaidCents)}</dd>
              </div>
            </dl>
            <h3>{r.orderHeading}</h3>
            <ol className="nt-dpp-order">
              {p.order.map((s: { name: string; month: number }, i: number) => (
                <li key={i}>
                  {s.name}: {r.orderMonth} {s.month}
                </li>
              ))}
            </ol>
          </section>
        );
      })}

      <details className="nt-dpp-details">
        <summary>{COPY.more.summary}</summary>
        <div className="nt-dpp-details-body">
          <div className="nt-dpp-table-wrap">
            <table className="nt-dpp-table">
              <caption>{COPY.more.debtsHeading}</caption>
              <thead>
                <tr>
                  <th scope="col">{COPY.more.name}</th>
                  <th scope="col">{COPY.more.owe}</th>
                  <th scope="col">{COPY.more.rate}</th>
                  <th scope="col">{COPY.more.pay}</th>
                </tr>
              </thead>
              <tbody>
                {result.debts.map((d: { name: string; balanceCents: number; rateBps: number; minimumCents: number }, i: number) => (
                  <tr key={i}>
                    <th scope="row">{d.name}</th>
                    <td>{formatMoney(d.balanceCents)}</td>
                    <td>{formatRate(d.rateBps)}</td>
                    <td>{formatMoney(d.minimumCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="nt-dpp-help">
            {COPY.more.moneyEachMonth}: {formatMoney(result.monthlyMoneyCents)}
          </p>
          <p className="nt-dpp-subhead">{COPY.more.howHeading}</p>
          <ol>
            {COPY.more.how.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ol>
        </div>
      </details>

      <SavePrintSheet quiet title={COPY.save.title} onSave={save}>
        <p>{COPY.save.preview}</p>
      </SavePrintSheet>
    </>
  );
}

export default Page;
