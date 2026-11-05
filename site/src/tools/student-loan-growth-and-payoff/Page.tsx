import { CalmMessage } from "../../components/CalmMessage";
import { ErrorNote, Field, MoneyField, NumberField, PercentField, ResultCard, StartOver } from "../../components/calc";
import { SavePrintSheet } from "../../components/SavePrintSheet";
import { ScreenFrame } from "../../components/ScreenFrame";
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

const EMPTY: Inputs = { balance: "", rate: "", waitMonths: "", capitalize: false, payment: "", start: "", years: "" };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const years = (n: number) => plural(n, COPY.result.yearWord, COPY.result.yearsWord);
const isBlank = (v: Inputs) => !v.balance.trim() && !v.rate.trim() && !v.waitMonths.trim() && !v.payment.trim() && !v.start.trim() && !v.years.trim();

export function Page() {
  const flow = useAutosave<Inputs>("student-loan-growth-and-payoff", EMPTY);
  const v = flow.value;
  const set = (patch: Partial<Inputs>) => flow.setValue({ ...v, ...patch });

  // Derived in render: no timers, no effects. The answer follows the typing.
  const result = explainStudentLoan(v);
  const problems = result.ok ? [] : result.problems;
  const bad = (field: string) => problems.find((p) => p.field === field && p.kind === "bad")?.message;
  const missing = problems.filter((p) => p.kind === "missing").map((p) => (p.field === "balance" ? COPY.balance.label : COPY.rate.label));
  const blank = isBlank(v);
  const hasBad = problems.some((p) => p.kind === "bad");

  return (
    <ScreenFrame title={COPY.title} as="div" reserve="0">
      <div className="nt-slg">
        <p className="nt-slg-intro">{COPY.intro}</p>

        {flow.hasSaved && blank ? (
          <div className="nt-slg-status">
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

        <form className="nt-slg-form" onSubmit={(e) => e.preventDefault()} noValidate>
          <MoneyField label={COPY.balance.label} hint={COPY.balance.hint} placeholder={COPY.balance.placeholder} value={v.balance} onChange={(t) => set({ balance: t })} error={bad("balance")} />
          <PercentField label={COPY.rate.label} hint={COPY.rate.hint} placeholder={COPY.rate.placeholder} value={v.rate} onChange={(t) => set({ rate: t })} error={bad("rate")} />
          <NumberField label={COPY.wait.label} hint={COPY.wait.hint} placeholder={COPY.wait.placeholder} unit={COPY.wait.unit} optional value={v.waitMonths} onChange={(t) => set({ waitMonths: t })} error={bad("waitMonths")} />
          <label className="nt-slg-toggle">
            <input type="checkbox" checked={v.capitalize} onChange={(e) => set({ capitalize: e.target.checked })} />
            <span className="nt-slg-toggle-text">
              {COPY.toggle.label}
              <span className="nt-slg-toggle-hint">{COPY.toggle.hint}</span>
            </span>
          </label>
          <MoneyField label={COPY.payment.label} hint={COPY.payment.hint} placeholder={COPY.payment.placeholder} optional value={v.payment} onChange={(t) => set({ payment: t })} error={bad("payment")} />
          <Field label={COPY.start.label} hint={COPY.start.hint} placeholder={COPY.start.placeholder} optional inputMode="text" value={v.start} onChange={(t) => set({ start: t })} error={bad("start")} />
          <NumberField label={COPY.years.label} hint={COPY.years.hint} placeholder={COPY.years.placeholder} optional value={v.years} onChange={(t) => set({ years: t })} error={bad("years")} />
        </form>

        <StartOver flowId="student-loan-growth-and-payoff" value={flow.value} empty={EMPTY} onChange={flow.setValue} />

        {result.ok ? <Answer result={result} /> : null}

        {!result.ok && blank ? <p className="nt-slg-status">{COPY.empty}</p> : null}
        {!result.ok && !blank && missing.length > 0 && !hasBad ? (
          <p className="nt-slg-status" role="status">
            {COPY.stillNeeded} {missing.join(", ")}.
          </p>
        ) : null}
        {!result.ok && !blank && hasBad ? <ErrorNote>{COPY.fixFirst}</ErrorNote> : null}

        <p className="nt-slg-note">{COPY.notes.estimate}</p>
        <p className="nt-slg-note">{COPY.notes.noAdvice}</p>

        <details className="nt-slg-details">
          <summary>{COPY.how.summary}</summary>
          <div className="nt-slg-details-body">
            <ul className="nt-slg-how">
              {COPY.how.items.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </details>
      </div>
    </ScreenFrame>
  );
}

type Good = Extract<ReturnType<typeof explainStudentLoan>, { ok: true }>;

function Answer({ result }: { result: Good }) {
  const r = COPY.result;
  const pay = result.payoff;
  const min = result.minPayment;
  const lines: [string, string][] = [[r.unpaid, formatMoney(result.unpaidInterestCents)]];
  if (pay) {
    lines.push([r.months, String(pay.months)], [r.totalInterest, formatMoney(pay.totalInterestCents)]);
    if (pay.payoffDate) lines.push([r.payoffMonth, pay.payoffDate.label]);
  }
  if (min) lines.push([`${r.minPayment} ${years(min.years)}`, formatMoney(min.paymentCents)]);

  function save() {
    const text = [COPY.save.title, "", `${r.balanceLabel}: ${formatMoney(result.balanceAtStartCents)}`, ...lines.map(([k, val]) => `${k}: ${val}`), "", COPY.notes.estimate, ""].join("\n");
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
      <ResultCard label={r.balanceLabel} answer={formatMoney(result.balanceAtStartCents)}>
        <p className="nt-slg-help">{r.balanceLine}</p>
        <dl className="nt-slg-lines">
          {lines.map(([k, val]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{val}</dd>
            </div>
          ))}
        </dl>
        {min ? <p className="nt-slg-help">{r.minPaymentHelp}</p> : null}
      </ResultCard>

      {pay ? (
        <details className="nt-slg-details">
          <summary>{COPY.more.summary}</summary>
          <div className="nt-slg-details-body">
            <h2>{COPY.more.tableHeading}</h2>
            <p className="nt-slg-help">{COPY.more.tableNote}</p>
            {pay.byYear.map((y: { year: number; paidCents: number; interestCents: number; principalCents: number; balanceCents: number }) => (
              <details key={y.year} className="nt-slg-year">
                <summary>
                  <span>{COPY.more.yearSummary} {y.year}</span>
                  <span>{formatMoney(y.balanceCents)} {COPY.more.stillOwe}</span>
                </summary>
                <dl className="nt-slg-lines">
                  <div><dt>{COPY.more.paid}</dt><dd>{formatMoney(y.paidCents)}</dd></div>
                  <div><dt>{COPY.more.interest}</dt><dd>{formatMoney(y.interestCents)}</dd></div>
                  <div><dt>{COPY.more.down}</dt><dd>{formatMoney(y.principalCents)}</dd></div>
                  <div><dt>{COPY.more.owe}</dt><dd>{formatMoney(y.balanceCents)}</dd></div>
                </dl>
              </details>
            ))}
          </div>
        </details>
      ) : null}

      <details className="nt-slg-details">
        <summary>{COPY.save.summary}</summary>
        <div className="nt-slg-details-body">
          <SavePrintSheet title={COPY.save.title} onSave={save}>
            <p>{r.balanceLabel}: {formatMoney(result.balanceAtStartCents)}</p>
            {lines.map(([k, val]) => <p key={k}>{k}: {val}</p>)}
            <p>{COPY.notes.estimate}</p>
          </SavePrintSheet>
        </div>
      </details>
    </>
  );
}

export default Page;
