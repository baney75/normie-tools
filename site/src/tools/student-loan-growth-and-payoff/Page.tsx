import { useState } from "react";
import { ErrorNote, Field, MoneyField, NumberField, PercentField, ResultCard, Finish, StartOver, StepFlow } from "../../components/calc";
import { useAutosave } from "../../lib/useAutosave";
import { explainStudentLoan, formatMoney } from "../../../../tools/student-loan-growth-and-payoff/calc.mjs";
import { COPY } from "./copy";
import "./Page.css";

type Inputs = {
  balance: string;
  rate: string;
  waitMonths: string;
  capitalize: boolean;
  payment: string;
  start: string;
  years: string;
};

/** Money for a sentence: whole dollars drop the cents, like $12,000. */
const dollars = (cents: number) => formatMoney(cents).replace(/\.00$/, "");
const EMPTY: Inputs = { balance: "", rate: "", waitMonths: "", capitalize: false, payment: "", start: "", years: "" };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const years = (n: number) => plural(n, COPY.result.yearWord, COPY.result.yearsWord);
/** 98 months reads as "8 years, 2 months". */
const span = (n: number) => {
  const y = Math.floor(n / 12);
  const m = n % 12;
  if (y === 0) return plural(m, "month", "months");
  return m === 0 ? years(y) : `${years(y)}, ${plural(m, "month", "months")}`;
};
const isBlank = (v: Inputs) => !v.balance.trim() && !v.rate.trim() && !v.waitMonths.trim() && !v.payment.trim() && !v.start.trim() && !v.years.trim();

export function Page() {
  const flow = useAutosave<Inputs>("student-loan-growth-and-payoff", EMPTY);
  const v = flow.value;
  const set = (patch: Partial<Inputs>) => flow.setValue({ ...v, ...patch });
  const [moreOpen, setMoreOpen] = useState(false);

  // Derived in render: no timers, no effects. The answer follows the typing.
  const result = explainStudentLoan(v);
  const problems = result.ok ? [] : result.problems;
  const bad = (field: string) => problems.find((p) => p.field === field && p.kind === "bad")?.message;
  const blank = isBlank(v);
  // "More options" opens when the person opens it, or when one of its boxes has a red note.
  const hasBad = problems.some((p: { kind: string }) => p.kind === "bad");
  // A red note in an optional box. Those boxes live on the answer screen, inside "More options".
  const extraBad = Boolean(bad("waitMonths") || bad("start") || bad("years"));
  const showMore = moreOpen || extraBad;
  const good = result.ok ? result : null;

  const has = (field: string) => problems.some((p) => p.field === field);

  return (
    <StepFlow
      name={COPY.title}
      question={COPY.question}
      step={flow.step}
      onStep={flow.setStep}
      finishLabel={COPY.see}
      resume={
        flow.hasSaved && blank
          ? { ...COPY.resume, onYes: flow.restore, onNo: flow.clear }
          : null
      }
      steps={[
        {
          question: COPY.steps.balance,
          ready: !has("balance"),
          missing: COPY.steps.balanceMissing,
          content: <MoneyField label={COPY.balance.label} hint={COPY.balance.hint} value={v.balance} onChange={(t) => set({ balance: t })} error={bad("balance")} />,
        },
        {
          question: COPY.steps.rate,
          ready: !has("rate"),
          missing: COPY.steps.rateMissing,
          content: <PercentField label={COPY.rate.label} hint={COPY.rate.hint} value={v.rate} onChange={(t) => set({ rate: t })} error={bad("rate")} />,
        },
        {
          question: COPY.steps.payment,
          ready: !has("payment"),
          missing: COPY.steps.paymentMissing,
          content: <MoneyField label={COPY.payment.label} hint={COPY.payment.hint} optional value={v.payment} onChange={(t) => set({ payment: t })} error={bad("payment")} />,
        },
      ]}
      answer={<Answer result={good} rateZero={Number.parseFloat(v.rate) === 0} />}
      actions={good ? <Save result={good} /> : null}
      extras={
        <>
          {!result.ok && hasBad ? <ErrorNote>{COPY.fixFirst}</ErrorNote> : null}
          <StartOver
            flowId="student-loan-growth-and-payoff"
            value={flow.value}
            empty={EMPTY}
            onChange={flow.setValue}
            open={showMore}
            onOpen={setMoreOpen}
          >
            <NumberField label={COPY.wait.label} hint={COPY.wait.hint} unit={COPY.wait.unit} optional value={v.waitMonths} onChange={(t) => { setMoreOpen(true); set({ waitMonths: t }); }} error={bad("waitMonths")} />
            <div className="nt-slg-toggle">
              <input id="nt-slg-capitalize" type="checkbox" aria-describedby="nt-slg-capitalize-hint" checked={v.capitalize} onChange={(e) => { setMoreOpen(true); set({ capitalize: e.target.checked }); }} />
              <span className="nt-slg-toggle-text">
                <label htmlFor="nt-slg-capitalize">{COPY.toggle.label}</label>
                <span id="nt-slg-capitalize-hint" className="nt-slg-toggle-hint">{COPY.toggle.hint}</span>
              </span>
            </div>
            <Field label={COPY.start.label} hint={COPY.start.hint} optional inputMode="text" value={v.start} onChange={(t) => { setMoreOpen(true); set({ start: t }); }} error={bad("start")} />
            <NumberField label={COPY.years.label} hint={COPY.years.hint} optional value={v.years} onChange={(t) => { setMoreOpen(true); set({ years: t }); }} error={bad("years")} />
          </StartOver>
        </>
      }
      below={<Details result={good} />}
    />
  );
}

type Good = Extract<ReturnType<typeof explainStudentLoan>, { ok: true }>;

function lines(result: Good): [string, string][] {
  const r = COPY.result;
  const pay = result.payoff;
  const min = result.minPayment;
  const out: [string, string][] = [[r.balanceLabel, formatMoney(result.balanceAtStartCents)], [r.unpaid, formatMoney(result.unpaidInterestCents)]];
  if (pay) {
    out.push([r.months, String(pay.months)], [r.totalInterest, formatMoney(pay.totalInterestCents)]);
    if (pay.payoffDate) out.push([r.payoffMonth, pay.payoffDate.label]);
  }
  if (min) out.push([`${r.minPayment} ${years(min.years)}`, formatMoney(min.paymentCents)]);
  return out;
}

function Answer({ result, rateZero }: { result: Good | null; rateZero: boolean }) {
  const r = COPY.result;
  const pay = result?.payoff;
  const min = result?.minPayment;
  if (result && pay) {
    return (
      <ResultCard label={r.paidOffLabel} answer={span(pay.months)}>
        <p className="nt-result-basis">{r.basisFor} {dollars(result.principalCents)} {r.basisAt} {result.rateBps / 100}%.</p>
        <p>
          {r.paying} {formatMoney(result.paymentCents ?? 0)} {r.aMonth}
          {pay.payoffDate ? ` ${r.leadPayoff} ${pay.payoffDate.label}.` : ""}
        </p>
        <dl>
          <div>
            <dt>{r.totalInterest}</dt>
            <dd>{formatMoney(pay.totalInterestCents)}</dd>
          </div>
          {result.unpaidInterestCents > 0 ? (
            <div>
              <dt>{r.balanceLabel}</dt>
              <dd>{formatMoney(result.balanceAtStartCents)}</dd>
            </div>
          ) : min ? (
            <div>
              <dt>{r.minPayment} {years(min.years)}</dt>
              <dd>{formatMoney(min.paymentCents)}</dd>
            </div>
          ) : null}
        </dl>
      </ResultCard>
    );
  }
  return (
    <ResultCard label={r.balanceLabel} answer={result ? formatMoney(result.balanceAtStartCents) : undefined} waiting={COPY.waiting}>
      {result ? (
        <>
          <p className="nt-result-basis">{r.basisFor} {dollars(result.principalCents)} {r.basisAt} {result.rateBps / 100}%.</p>
          <p>{result.unpaidInterestCents === 0 ? (rateZero ? r.noRate : r.noGrowth) : r.balanceLine}</p>
          <dl>
            <div>
              <dt>{r.unpaid}</dt>
              <dd>{formatMoney(result.unpaidInterestCents)}</dd>
            </div>
            {min ? (
              <div>
                <dt>{r.minPayment} {years(min.years)}</dt>
                <dd>{formatMoney(min.paymentCents)}</dd>
              </div>
            ) : null}
          </dl>
        </>
      ) : null}
    </ResultCard>
  );
}

function Save({ result }: { result: Good }) {
  function save() {
    const text = [COPY.save.title, "", ...lines(result).map(([k, val]) => `${k}: ${val}`), "", COPY.notes.estimate, ""].join("\n");
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

function Details({ result }: { result: Good | null }) {
  const pay = result?.payoff;
  return (
    <>
      {result ? (
        <details>
          <summary>{COPY.more.summary}</summary>
          <div className="nt-slg-details-body">
            <dl className="nt-slg-lines">
              {lines(result).map(([k, val]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{val}</dd>
                </div>
              ))}
            </dl>
            {result.minPayment ? <p className="nt-slg-help">{COPY.result.minPaymentHelp}</p> : null}
            {pay ? (
              <>
                <p className="nt-slg-help">{COPY.more.tableNote}</p>
                {pay.byYear.map((y: { year: number; paidCents: number; interestCents: number; principalCents: number; balanceCents: number }) => (
                  <section key={y.year} className="nt-slg-year" aria-label={`${COPY.more.yearSummary} ${y.year}`}>
                    <p className="nt-slg-year-title">{COPY.more.yearSummary} {y.year}</p>
                    <dl className="nt-slg-lines">
                      <div><dt>{COPY.more.paid}</dt><dd>{formatMoney(y.paidCents)}</dd></div>
                      <div><dt>{COPY.more.interest}</dt><dd>{formatMoney(y.interestCents)}</dd></div>
                      <div><dt>{COPY.more.down}</dt><dd>{formatMoney(y.principalCents)}</dd></div>
                      <div><dt>{COPY.more.owe}</dt><dd>{formatMoney(y.balanceCents)}</dd></div>
                    </dl>
                  </section>
                ))}
              </>
            ) : null}
          </div>
        </details>
      ) : null}
      <details>
        <summary>{COPY.how.summary}</summary>
        <div className="nt-slg-details-body">
          <ul className="nt-slg-how">
            {COPY.how.items.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </details>
      <p className="nt-note">{COPY.notes.estimate}</p>
    </>
  );
}

export default Page;
