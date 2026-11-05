import { useState } from "react";
import { CalmMessage } from "../../components/CalmMessage";
import { Chips, ErrorNote, MoneyField, NumberField, PercentField, ResultCard, Finish, SeeAnswer, StartOver, ToolLayout } from "../../components/calc";
import { useAutosave } from "../../lib/useAutosave";
import { explainMortgage, formatMoney } from "../../../../tools/mortgage-payment-explainer/calc.mjs";
import { COPY } from "./copy";
import "./Page.css";

type Inputs = {
  price: string;
  down: string;
  rate: string;
  term: string;
  tax: string;
  insurance: string;
  hoa: string;
  pmi: string;
};

const EMPTY: Inputs = { price: "", down: "", rate: "", term: "", tax: "", insurance: "", hoa: "", pmi: "" };
const FIELD_NAMES = { price: COPY.price.label, down: COPY.down.label, rate: COPY.rate.label, term: COPY.term.label };
const QUICK: readonly string[] = COPY.term.quick;

const years = (n: number) => `${n} ${n === 1 ? "year" : "years"}`;
const isBlank = (v: Inputs) => Object.values(v).every((t) => !t.trim());
const hasExtras = (v: Inputs) => [v.tax, v.insurance, v.hoa, v.pmi].some((t) => t.trim() !== "");

type Problem = { field: string; kind: string; message: string };

export function Page() {
  const flow = useAutosave<Inputs>("mortgage-payment-explainer", EMPTY);
  const v = flow.value;
  const set = (patch: Partial<Inputs>) => flow.setValue({ ...v, ...patch });
  const [otherOpen, setOtherOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // Derived in render: no timers, no effects. The answer follows the typing.
  const result = explainMortgage(v);
  const problems: Problem[] = result.ok ? [] : result.problems;
  const bad = (field: string) => problems.find((p) => p.field === field && p.kind === "bad")?.message;
  const missing = problems
    .filter((p) => p.kind === "missing")
    .map((p) => FIELD_NAMES[p.field as keyof typeof FIELD_NAMES]);
  const blank = isBlank(v);
  const hasBad = problems.some((p) => p.kind === "bad");

  const quick = QUICK.includes(v.term.trim()) ? v.term.trim() : "";
  const showOther = otherOpen || (!quick && v.term.trim() !== "");
  const pickTerm = (choice: string) => {
    if (choice === "other") {
      setOtherOpen(true);
      if (quick) set({ term: "" });
    } else {
      setOtherOpen(false);
      set({ term: choice });
    }
  };
  const showMore = moreOpen || hasExtras(v);

  return (
    <ToolLayout
      name={COPY.title}
      question={COPY.question}
      answer={<Answer result={result.ok ? result : null} />}
      actions={result.ok ? <Save result={result} /> : null}
      below={<Details result={result.ok ? result : null} />}
    >
      {flow.hasSaved && blank ? (
        <div className="nt-mort-status">
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

      <form className="nt-mort-form" onSubmit={(e) => e.preventDefault()} noValidate>
        <MoneyField label={COPY.price.label} hint={COPY.price.hint}
          value={v.price} onChange={(t) => set({ price: t })} error={bad("price")} />
        <MoneyField label={COPY.down.label} hint={COPY.down.hint}
          value={v.down} onChange={(t) => set({ down: t })} error={bad("down")} />
        <PercentField label={COPY.rate.label} hint={COPY.rate.hint}
          value={v.rate} onChange={(t) => set({ rate: t })} error={bad("rate")} />
        <Chips
          legend={COPY.term.label}
          options={[...QUICK.map((n) => ({ value: n, label: `${n} ${COPY.term.quickSuffix}` })), { value: "other", label: COPY.term.other }]}
          value={quick || (showOther ? "other" : "")}
          onChange={pickTerm}
        />
        {showOther ? (
          <NumberField label={COPY.term.otherLabel}
            value={v.term} onChange={(t) => set({ term: t })} error={bad("term")} />
        ) : null}

        {showMore ? (
          <>
            <MoneyField label={COPY.tax.label} hint={COPY.tax.hint} optional
              value={v.tax} onChange={(t) => { setMoreOpen(true); set({ tax: t }); }} error={bad("tax")} />
            <MoneyField label={COPY.insurance.label} hint={COPY.insurance.hint} optional
              value={v.insurance} onChange={(t) => { setMoreOpen(true); set({ insurance: t }); }} error={bad("insurance")} />
            <MoneyField label={COPY.hoa.label} hint={COPY.hoa.hint} optional
              value={v.hoa} onChange={(t) => { setMoreOpen(true); set({ hoa: t }); }} error={bad("hoa")} />
            <MoneyField label={COPY.pmi.label} hint={COPY.pmi.hint} optional
              value={v.pmi} onChange={(t) => { setMoreOpen(true); set({ pmi: t }); }} error={bad("pmi")} />
          </>
        ) : null}
        {hasExtras(v) ? null : (
          <button type="button" className="nt-more-btn" aria-expanded={showMore} onClick={() => setMoreOpen(!showMore)}>
            {showMore ? COPY.lessButton : COPY.moreButton}
          </button>
        )}
      </form>

      {!result.ok && !blank && missing.length > 0 && !hasBad ? (
        <p className="nt-mort-status" role="status">
          {COPY.stillNeeded} {missing.join(", ")}.
        </p>
      ) : null}
      {!result.ok && !blank && hasBad ? <ErrorNote>{COPY.fixFirst}</ErrorNote> : null}

      <SeeAnswer label={COPY.see} main={!result.ok} />
      <StartOver flowId="mortgage-payment-explainer" value={flow.value} empty={EMPTY} onChange={flow.setValue} />
    </ToolLayout>
  );
}

type Good = Extract<ReturnType<typeof explainMortgage>, { ok: true }>;

function parts(result: Good): [string, string][] {
  const r = COPY.result;
  return [
    [r.pi, formatMoney(result.piCents)],
    [r.tax, formatMoney(result.taxMonthCents)],
    [r.insurance, formatMoney(result.insuranceMonthCents)],
    [r.hoa, formatMoney(result.hoaCents)],
    [r.pmi, formatMoney(result.pmiCents)],
  ];
}

function lines(result: Good): [string, string][] {
  const r = COPY.result;
  return [
    [r.loan, formatMoney(result.loanCents)],
    [r.lengthLabel, years(result.months / 12)],
    [r.totalInterest, formatMoney(result.totalInterestCents)],
  ];
}

function first(result: Good): [string, string][] {
  return [
    [COPY.first.interest, formatMoney(result.firstInterestCents)],
    [COPY.first.principal, formatMoney(result.firstPrincipalCents)],
  ];
}

function Answer({ result }: { result: Good | null }) {
  const r = COPY.result;
  return (
    <ResultCard label={r.totalLabel} answer={result ? formatMoney(result.totalMonthlyCents) : undefined} waiting={COPY.waiting}>
      {result ? (
        <>
          <p>{r.totalLine}</p>
          <dl>
            <div>
              <dt>{r.loan}</dt>
              <dd>{formatMoney(result.loanCents)}</dd>
            </div>
            <div>
              <dt>{r.lengthLabel}</dt>
              <dd>{years(result.months / 12)}</dd>
            </div>
          </dl>
        </>
      ) : null}
    </ResultCard>
  );
}

function Save({ result }: { result: Good }) {
  const r = COPY.result;
  function save() {
    const text = [
      COPY.save.fileTitle, "",
      `${r.totalLabel}: ${formatMoney(result.totalMonthlyCents)}`,
      ...parts(result).map(([k, val]) => `${k}: ${val}`),
      ...lines(result).map(([k, val]) => `${k}: ${val}`),
      COPY.first.heading,
      ...first(result).map(([k, val]) => `${k}: ${val}`),
      "", COPY.notes.estimate, COPY.notes.changes, "",
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
    <Finish onSave={save}>
      <p>{COPY.save.preview}</p>
    </Finish>
  );
}

function Details({ result }: { result: Good | null }) {
  return (
    <>
      {result ? (
        <details>
          <summary>{COPY.more.summary}</summary>
          <div className="nt-mort-details-body">
            <h2 className="nt-mort-sub">{COPY.result.partsHeading}</h2>
            <dl className="nt-mort-lines">
              {parts(result).map(([k, val]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{val}</dd>
                </div>
              ))}
            </dl>
            <dl className="nt-mort-lines">
              {lines(result).map(([k, val]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{val}</dd>
                </div>
              ))}
            </dl>
            <section aria-label={COPY.first.heading}>
              <h2 className="nt-mort-sub">{COPY.first.heading}</h2>
              <p className="nt-mort-help">{COPY.first.line}</p>
              <dl className="nt-mort-lines">
                {first(result).map(([k, val]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{val}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <p className="nt-mort-help">{COPY.more.loanWork}</p>
            <p className="nt-mort-help">{COPY.more.how}</p>
          </div>
        </details>
      ) : null}
      <details>
        <summary>{COPY.key.summary}</summary>
        <div className="nt-mort-details-body">
          <dl className="nt-mort-key">
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
