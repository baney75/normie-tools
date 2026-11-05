import { CalmMessage } from "../../components/CalmMessage";
import { ErrorNote, Field, MoneyField, NumberField, PercentField, PrivacyNote, ResultCard, StartOver } from "../../components/calc";
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
        <PrivacyNote />

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
          <MoneyField label={COPY.balance.label} hint={COPY.balance.hint} placeholder={COPY.balance.placeholder} autoFocus value={v.balance} onChange={(t) => set({ balance: t })} error={bad("balance")} />
          <PercentField label={COPY.rate.label} hint={COPY.rate.hint} placeholder={COPY.rate.placeholder} value={v.rate} onChange={(t) => set({ rate: t })} error={bad("rate")} />
          <NumberField label={COPY.wait.label} hint={COPY.wait.hint} placeholder={COPY.wait.placeholder} unit={COPY.wait.unit} optional value={v.waitMonths} onChange={(t) => set({ waitMonths: t })} error={bad("waitMonths")} />
          <div className="nt-slg-toggle">
            <input id="nt-slg-capitalize" type="checkbox" aria-describedby="nt-slg-capitalize-hint" checked={v.capitalize} onChange={(e) => set({ capitalize: e.target.checked })} />
            <span className="nt-slg-toggle-text">
              <label htmlFor="nt-slg-capitalize">{COPY.toggle.label}</label>
              <span id="nt-slg-capitalize-hint" className="nt-slg-toggle-hint">{COPY.toggle.hint}</span>
            </span>
          </div>
          <MoneyField label={COPY.payment.label} hint={COPY.payment.hint} placeholder={COPY.payment.placeholder} optional value={v.payment} onChange={(t) => set({ payment: t })} error={bad("payment")} />
          <Field label={COPY.start.label} hint={COPY.start.hint} placeholder={COPY.start.placeholder} optional inputMode="text" value={v.start} onChange={(t) => set({ start: t })} error={bad("start")} />
          <NumberField label={COPY.years.label} hint={COPY.years.hint} placeholder={COPY.years.placeholder} optional value={v.years} onChange={(t) => set({ years: t })} error={bad("years")} />
        </form>

        <StartOver flowId="student-loan-growth-and-payoff" value={flow.value} empty={EMPTY} onChange={flow.setValue} />

        <Answer result={result.ok ? result : null} rateZero={Number.parseFloat(v.rate) === 0} />

        {!result.ok && !blank && missing.length > 0 && !hasBad ? (
          <p className="nt-slg-status" role="status">
            {COPY.stillNeeded} {missing.join(", ")}.
          </p>
        ) : null}
        {!result.ok && !blank && hasBad ? <ErrorNote>{COPY.fixFirst}</ErrorNote> : null}

        <p className="nt-slg-note">{COPY.notes.estimate}</p>

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

function Answer({ result, rateZero }: { result: Good | null; rateZero: boolean }) {
  const r = COPY.result;
  const pay = result?.payoff;
  const min = result?.minPayment;
  const lines: [string, string][] = result ? [[r.unpaid, formatMoney(result.unpaidInterestCents)]] : [];
  if (result && pay) {
    lines.push([r.months, String(pay.months)], [r.totalInterest, formatMoney(pay.totalInterestCents)]);
    if (pay.payoffDate) lines.push([r.payoffMonth, pay.payoffDate.label]);
  }
  if (min) lines.push([`${r.minPayment} ${years(min.years)}`, formatMoney(min.paymentCents)]);

  function save() {
    if (!result) return;
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
      <ResultCard label={r.balanceLabel} answer={result ? formatMoney(result.balanceAtStartCents) : undefined} waiting={COPY.waiting}>
        <p className="nt-slg-help">{pay?.payoffDate ? `${r.leadPayoff} ${pay.payoffDate.label}.` : r.balanceLine}</p>
        <dl className="nt-slg-lines">
          {lines.slice(0, 1).map(([k, val]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{val}</dd>
            </div>
          ))}
        </dl>
        {result && result.unpaidInterestCents === 0 ? <p className="nt-slg-help">{rateZero ? r.noRate : r.noGrowth}</p> : null}
        <dl className="nt-slg-lines">
          {lines.slice(1).map(([k, val]) => (
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
          </div>
        </details>
      ) : null}

      <SavePrintSheet quiet title={COPY.save.summary} onSave={save}>
        {result ? <p>{COPY.save.preview}</p> : null}
      </SavePrintSheet>
    </>
  );
}

export default Page;
