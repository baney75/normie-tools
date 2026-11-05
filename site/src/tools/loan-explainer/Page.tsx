import { useState } from "react";
import { CalmMessage } from "../../components/CalmMessage";
import { Chips, ErrorNote, MoneyField, NumberField, PercentField, ResultCard, Finish, SeeAnswer, StartOver, ToolLayout } from "../../components/calc";
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
const QUICK_YEARS = ["2", "3", "4", "5"];

const months = (n: number) => `${n} ${n === 1 ? "month" : "months"}`;
const span = (n: number) => (n % 12 === 0 ? (n === 12 ? "1 year" : `${n / 12} years`) : months(n));
const isBlank = (v: Inputs) => !v.amount.trim() && !v.rate.trim() && !v.term.trim() && !v.fees.trim() && !v.extra.trim();

export function Page() {
  const flow = useAutosave<Inputs>("loan-explainer", EMPTY);
  const v = flow.value;
  const set = (patch: Partial<Inputs>) => flow.setValue({ ...v, ...patch });
  const [otherOpen, setOtherOpen] = useState(false);
  // True when the length came from a chip tap, so choosing Other may clear it. A typed length is never erased.
  const [fromChip, setFromChip] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // Derived in render: no timers, no effects. The answer follows the typing.
  const result = explainLoan(v);
  const problems = result.ok ? [] : result.problems;
  const bad = (field: string) => problems.find((p: { field: string; kind: string }) => p.field === field && p.kind === "bad")?.message;
  const missing = problems.filter((p: { kind: string }) => p.kind === "missing").map((p: { field: keyof typeof FIELD_NAMES }) => FIELD_NAMES[p.field]);
  const blank = isBlank(v);
  const hasBad = problems.some((p: { kind: string }) => p.kind === "bad");

  const quick = v.termUnit === "years" && QUICK_YEARS.includes(v.term.trim()) ? v.term.trim() : "";
  const showOther = otherOpen || (!quick && v.term.trim() !== "");
  const termChoice = quick || (showOther ? "other" : "");
  const pickTerm = (choice: string) => {
    if (choice === "other") {
      setOtherOpen(true);
      if (quick && fromChip) set({ term: "", termUnit: "months" });
    } else {
      setOtherOpen(false);
      setFromChip(true);
      set({ term: choice, termUnit: "years" });
    }
  };
  const showMore = moreOpen || v.fees.trim() !== "" || v.extra.trim() !== "";

  return (
    <ToolLayout
      name={COPY.title}
      question={COPY.question}
      answer={result.ok ? <Answer result={result} /> : <ResultCard label={COPY.result.paymentLabel} waiting={COPY.waiting} />}
      actions={result.ok ? <Save result={result} /> : null}
      below={result.ok ? <Details result={result} /> : <Words />}
    >
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
        <MoneyField label={COPY.amount.label} hint={COPY.amount.hint} value={v.amount} onChange={(t) => set({ amount: t })} error={bad("amount")} />
        <PercentField label={COPY.rate.label} hint={COPY.rate.hint} value={v.rate} onChange={(t) => set({ rate: t })} error={bad("rate")} />
        <Chips
          legend={COPY.term.label}
          options={[...QUICK_YEARS.map((y) => ({ value: y, label: COPY.term.years(Number(y)) })), { value: "other", label: COPY.term.other }]}
          value={termChoice}
          onChange={pickTerm}
        />
        {showOther ? (
          <>
            <NumberField label={COPY.term.otherLabel} value={v.term} onChange={(t) => { setFromChip(false); set({ term: t }); }} error={bad("term")} />
            <Chips
              legend={COPY.term.unitLegend}
              options={[
                { value: "months", label: COPY.term.months },
                { value: "years", label: COPY.term.yearsWord },
              ]}
              value={v.termUnit}
              onChange={(u) => set({ termUnit: u as Inputs["termUnit"] })}
            />
          </>
        ) : null}

        {showMore ? (
          <>
            <MoneyField label={COPY.fees.label} hint={COPY.fees.hint} optional value={v.fees} onChange={(t) => { setMoreOpen(true); set({ fees: t }); }} error={bad("fees")} />
            <MoneyField label={COPY.extra.label} hint={COPY.extra.hint} optional value={v.extra} onChange={(t) => { setMoreOpen(true); set({ extra: t }); }} error={bad("extra")} />
          </>
        ) : null}
        {showMore && (v.fees.trim() || v.extra.trim()) ? null : (
          <button type="button" className="nt-more-btn" aria-expanded={showMore} onClick={() => setMoreOpen(!showMore)}>
            {showMore ? COPY.lessButton : COPY.moreButton}
          </button>
        )}
      </form>

      {!result.ok && !blank && missing.length > 0 && !hasBad ? (
        <p className="nt-loan-status" role="status">
          {COPY.stillNeeded} {missing.join(", ")}.
        </p>
      ) : null}
      {!result.ok && !blank && hasBad ? <ErrorNote>{COPY.fixFirst}</ErrorNote> : null}

      <SeeAnswer label={COPY.see} main={!result.ok} />
      <StartOver flowId="loan-explainer" value={flow.value} empty={EMPTY} onChange={flow.setValue} />
    </ToolLayout>
  );
}

type Good = Extract<ReturnType<typeof explainLoan>, { ok: true }>;

function Answer({ result }: { result: Good }) {
  const r = COPY.result;
  // With an extra payment that finishes the loan sooner, the card shows that schedule, so it never
  // disagrees with the extra-payment section below.
  const e = result.extra && (result.extra.monthsSaved > 0 || result.extra.interestSaved > 0) ? result.extra : null;
  const paid = e ? e.totalPaidCents : result.totalPaidCents;
  const interest = e ? e.totalInterestCents : result.totalInterestCents;
  const months = e ? e.months : result.months;
  const fees = result.feesCents > 0 ? `, ${r.plus} ${formatMoney(result.feesCents)} ${r.inFees}` : "";
  return (
    <ResultCard label={r.paymentLabel} answer={formatMoney(result.monthlyPaymentCents)}>
      <p>
        {r.payBack} {formatMoney(paid)} {r.inAll}
        {fees}.{e ? ` ${r.withExtra}` : ""}
      </p>
      <dl>
        <div>
          <dt>{r.totalInterest}</dt>
          <dd>{formatMoney(interest)}</dd>
        </div>
        <div>
          <dt>{r.paidOff}</dt>
          <dd>{span(months)}</dd>
        </div>
      </dl>
    </ResultCard>
  );
}

function lines(result: Good): [string, string][] {
  const r = COPY.result;
  return [
    [r.lengthLabel, months(result.months)],
    [r.totalPaid, formatMoney(result.totalPaidCents)],
    [r.totalInterest, formatMoney(result.totalInterestCents)],
    [r.fees, formatMoney(result.feesCents)],
    [r.cost, formatMoney(result.costOfBorrowingCents)],
  ];
}

function Save({ result }: { result: Good }) {
  const r = COPY.result;
  const e = result.extra;
  function save() {
    const text = [COPY.save.title, "", `${r.paymentLabel}: ${formatMoney(result.monthlyPaymentCents)}`, ...lines(result).map(([k, val]) => `${k}: ${val}`), ...(e ? [`${COPY.extraBox.heading}`, `${COPY.extraBox.monthsSaved}: ${e.monthsSaved}`, `${COPY.extraBox.interestSaved}: ${formatMoney(e.interestSaved)}`] : []), "", COPY.notes.estimate, ""].join("\n");
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

function Details({ result }: { result: Good }) {
  const r = COPY.result;
  const e = result.extra;
  return (
    <>
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

      <details>
        <summary>{COPY.more.summary}</summary>
        <div className="nt-loan-details-body">
          <dl className="nt-loan-lines" aria-label={COPY.more.summary}>
            {lines(result).map(([k, val]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{val}</dd>
              </div>
            ))}
          </dl>
          <p className="nt-loan-help">{r.cost}: {r.costHelp}</p>
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
      <Words />
    </>
  );
}

function Words() {
  return (
    <>
      <details>
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
      <p className="nt-note">{COPY.notes.estimate}</p>
    </>
  );
}

export default Page;
