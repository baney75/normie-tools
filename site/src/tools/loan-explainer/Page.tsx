import { CalmMessage } from "../../components/CalmMessage";
import { ErrorNote, MoneyField, NumberField, PercentField, ResultCard, StartOver } from "../../components/calc";
import { SavePrintSheet } from "../../components/SavePrintSheet";
import { ScreenFrame } from "../../components/ScreenFrame";
import { useAutosave } from "../../lib/useAutosave";
import { explainLoan, formatMoney } from "../../../../tools/loan-explainer/calc.mjs";
import { COPY } from "./copy";
import "./Page.css";

type Inputs = {
  amount: string;
  rate: string;
  term: string;
  termUnit: "months" | "years";
  fees: string;
  extra: string;
};

const EMPTY: Inputs = { amount: "", rate: "", term: "", termUnit: "months", fees: "", extra: "" };
const FIELD_NAMES = { amount: COPY.amount.label, rate: COPY.rate.label, term: COPY.term.label, fees: COPY.fees.label, extra: COPY.extra.label };

const months = (n: number) => `${n} ${n === 1 ? "month" : "months"}`;
const isBlank = (v: Inputs) => !v.amount.trim() && !v.rate.trim() && !v.term.trim() && !v.fees.trim() && !v.extra.trim();

export function Page() {
  const flow = useAutosave<Inputs>("loan-explainer", EMPTY);
  const v = flow.value;
  const set = (patch: Partial<Inputs>) => flow.setValue({ ...v, ...patch });

  // Derived in render: no timers, no effects. The answer follows the typing.
  const result = explainLoan(v);
  const problems = result.ok ? [] : result.problems;
  const bad = (field: string) => problems.find((p: { field: string; kind: string }) => p.field === field && p.kind === "bad")?.message;
  const missing = problems.filter((p: { kind: string }) => p.kind === "missing").map((p: { field: keyof typeof FIELD_NAMES }) => FIELD_NAMES[p.field]);
  const blank = isBlank(v);
  const hasBad = problems.some((p: { kind: string }) => p.kind === "bad");

  return (
    <ScreenFrame title={COPY.title} as="div" reserve="0">
      <div className="nt-loan">
        <p className="nt-loan-intro">{COPY.intro}</p>

        {flow.hasSaved && blank ? (
          <div className="nt-loan-status">
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

        <form className="nt-loan-form" onSubmit={(e) => e.preventDefault()} noValidate>
          <MoneyField
            label={COPY.amount.label}
            hint={COPY.amount.hint}
            placeholder={COPY.amount.placeholder}
            value={v.amount}
            onChange={(t) => set({ amount: t })}
            error={bad("amount")}
          />
          <PercentField
            label={COPY.rate.label}
            hint={COPY.rate.hint}
            placeholder={COPY.rate.placeholder}
            value={v.rate}
            onChange={(t) => set({ rate: t })}
            error={bad("rate")}
          />
          <NumberField
            label={COPY.term.label}
            hint={COPY.term.hint}
            placeholder={COPY.term.placeholder}
            value={v.term}
            onChange={(t) => set({ term: t })}
            error={bad("term")}
          />
          <fieldset className="nt-loan-units">
            <legend>{COPY.term.unitLegend}</legend>
            <div className="nt-loan-unit-row">
              {(["months", "years"] as const).map((u) => (
                <label key={u} className="nt-loan-unit">
                  <input
                    type="radio"
                    name="loan-term-unit"
                    value={u}
                    checked={v.termUnit === u}
                    onChange={() => set({ termUnit: u })}
                  />
                  {COPY.term[u]}
                </label>
              ))}
            </div>
          </fieldset>
          <MoneyField
            label={COPY.fees.label}
            hint={COPY.fees.hint}
            placeholder={COPY.fees.placeholder}
            optional
            value={v.fees}
            onChange={(t) => set({ fees: t })}
            error={bad("fees")}
          />
          <MoneyField
            label={COPY.extra.label}
            hint={COPY.extra.hint}
            placeholder={COPY.extra.placeholder}
            optional
            value={v.extra}
            onChange={(t) => set({ extra: t })}
            error={bad("extra")}
          />
        </form>

        <StartOver flowId="loan-explainer" value={flow.value} empty={EMPTY} onChange={flow.setValue} />

        {result.ok ? <Answer result={result} /> : null}

        {!result.ok && blank ? <p className="nt-loan-status">{COPY.empty}</p> : null}
        {!result.ok && !blank && missing.length > 0 && !hasBad ? (
          <p className="nt-loan-status" role="status">
            {COPY.stillNeeded} {missing.join(", ")}.
          </p>
        ) : null}
        {!result.ok && !blank && hasBad ? (
          <ErrorNote>{COPY.fixFirst}</ErrorNote>
        ) : null}

        <p className="nt-loan-note">{COPY.notes.estimate}</p>
        <p className="nt-loan-note">{COPY.notes.apr}</p>

        <details className="nt-loan-details">
          <summary>{COPY.key.summary}</summary>
          <div className="nt-loan-details-body">
            <dl className="nt-loan-key">
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

type Good = Extract<ReturnType<typeof explainLoan>, { ok: true }>;

function Answer({ result }: { result: Good }) {
  const r = COPY.result;
  const e = result.extra;
  const lines: [string, string][] = [
    [COPY.result.lengthLabel, months(result.months)],
    [r.totalPaid, formatMoney(result.totalPaidCents)],
    [r.totalInterest, formatMoney(result.totalInterestCents)],
    [r.fees, formatMoney(result.feesCents)],
    [r.cost, formatMoney(result.costOfBorrowingCents)],
  ];

  function save() {
    const text = [COPY.save.title, "", `${r.paymentLabel}: ${formatMoney(result.monthlyPaymentCents)}`, ...lines.map(([k, val]) => `${k}: ${val}`), ...(e ? [`${COPY.extraBox.heading}`, `${COPY.extraBox.monthsSaved}: ${e.monthsSaved}`, `${COPY.extraBox.interestSaved}: ${formatMoney(e.interestSaved)}`] : []), "", COPY.notes.estimate, COPY.notes.apr, ""].join("\n");
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
      <ResultCard label={r.paymentLabel} answer={formatMoney(result.monthlyPaymentCents)}>
        <p className="nt-loan-help">{r.paymentLine}</p>
        <dl className="nt-loan-lines">
          {lines.map(([k, val]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{val}</dd>
            </div>
          ))}
        </dl>
        <p className="nt-loan-help">{r.cost}: {r.costHelp}</p>
      </ResultCard>

      {e ? (
        <section className="nt-loan-extra" aria-label={COPY.extraBox.heading}>
          <h2>{COPY.extraBox.heading}</h2>
          {e.monthsSaved > 0 || e.interestSaved > 0 ? (
            <dl className="nt-loan-lines">
              <div><dt>{COPY.extraBox.payment}</dt><dd>{formatMoney(e.monthlyPaymentCents)}</dd></div>
              <div><dt>{COPY.extraBox.done}</dt><dd>{months(e.months)}</dd></div>
              <div><dt>{COPY.extraBox.monthsSaved}</dt><dd>{e.monthsSaved}</dd></div>
              <div><dt>{COPY.extraBox.interestSaved}</dt><dd>{formatMoney(e.interestSaved)}</dd></div>
            </dl>
          ) : (
            <p>{COPY.extraBox.none}</p>
          )}
        </section>
      ) : null}

      <details className="nt-loan-details">
        <summary>{COPY.more.summary}</summary>
        <div className="nt-loan-details-body">
          <div className="nt-loan-table-wrap">
            <table className="nt-loan-table">
              <caption>{COPY.more.tableHeading}</caption>
              <thead>
                <tr>
                  <th scope="col">{COPY.more.year}</th>
                  <th scope="col">{COPY.more.paid}</th>
                  <th scope="col">{COPY.more.interest}</th>
                  <th scope="col">{COPY.more.down}</th>
                  <th scope="col">{COPY.more.owe}</th>
                </tr>
              </thead>
              <tbody>
                {result.byYear.map((y) => (
                  <tr key={y.year}>
                    <th scope="row">{y.year}</th>
                    <td>{formatMoney(y.paidCents)}</td>
                    <td>{formatMoney(y.interestCents)}</td>
                    <td>{formatMoney(y.principalCents)}</td>
                    <td>{formatMoney(y.balanceCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="nt-loan-help">{COPY.more.tableNote}</p>
        </div>
      </details>

      <details className="nt-loan-details">
        <summary>{COPY.save.summary}</summary>
        <div className="nt-loan-details-body">
          <SavePrintSheet title={COPY.save.title} onSave={save}>
            <p>{r.paymentLabel}: {formatMoney(result.monthlyPaymentCents)}</p>
            {lines.map(([k, val]) => <p key={k}>{k}: {val}</p>)}
            <p>{COPY.notes.estimate}</p>
          </SavePrintSheet>
        </div>
      </details>
    </>
  );
}

export default Page;
