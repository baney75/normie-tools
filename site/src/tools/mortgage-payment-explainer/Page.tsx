import { CalmMessage } from "../../components/CalmMessage";
import { ErrorNote, MoneyField, NumberField, PercentField, PrivacyNote, ResultCard, StartOver } from "../../components/calc";
import { SavePrintSheet } from "../../components/SavePrintSheet";
import { ScreenFrame } from "../../components/ScreenFrame";
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

const years = (n: number) => `${n} ${n === 1 ? "year" : "years"}`;
const isBlank = (v: Inputs) => Object.values(v).every((t) => !t.trim());

type Problem = { field: string; kind: string; message: string };

export function Page() {
  const flow = useAutosave<Inputs>("mortgage-payment-explainer", EMPTY);
  const v = flow.value;
  const set = (patch: Partial<Inputs>) => flow.setValue({ ...v, ...patch });

  // Derived in render: no timers, no effects. The answer follows the typing.
  const result = explainMortgage(v);
  const problems: Problem[] = result.ok ? [] : result.problems;
  const bad = (field: string) => problems.find((p) => p.field === field && p.kind === "bad")?.message;
  const missing = problems
    .filter((p) => p.kind === "missing")
    .map((p) => FIELD_NAMES[p.field as keyof typeof FIELD_NAMES]);
  const blank = isBlank(v);
  const hasBad = problems.some((p) => p.kind === "bad");

  return (
    <ScreenFrame title={COPY.title} as="div" reserve="0">
      <div className="nt-mort">
        <p className="nt-mort-intro">{COPY.intro}</p>
        <PrivacyNote />

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
          <MoneyField autoFocus label={COPY.price.label} hint={COPY.price.hint}
            value={v.price} onChange={(t) => set({ price: t })} error={bad("price")} />
          <MoneyField label={COPY.down.label} hint={COPY.down.hint}
            value={v.down} onChange={(t) => set({ down: t })} error={bad("down")} />
          <PercentField label={COPY.rate.label} hint={COPY.rate.hint}
            value={v.rate} onChange={(t) => set({ rate: t })} error={bad("rate")} />
          <NumberField label={COPY.term.label} hint={COPY.term.hint}
            value={v.term} onChange={(t) => set({ term: t })} error={bad("term")} />
          <fieldset className="nt-mort-quick">
            <legend>{COPY.term.quickLegend}</legend>
            <div className="nt-mort-quick-row">
              {COPY.term.quick.map((n) => (
                <button key={n} type="button" className="nt-mort-pick" aria-pressed={v.term.trim() === n}
                  onClick={() => set({ term: n })}>
                  {n} {COPY.term.quickSuffix}
                </button>
              ))}
            </div>
          </fieldset>
          <MoneyField label={COPY.tax.label} hint={COPY.tax.hint} optional
            value={v.tax} onChange={(t) => set({ tax: t })} error={bad("tax")} />
          <MoneyField label={COPY.insurance.label} hint={COPY.insurance.hint} optional
            value={v.insurance} onChange={(t) => set({ insurance: t })} error={bad("insurance")} />
          <MoneyField label={COPY.hoa.label} hint={COPY.hoa.hint} optional
            value={v.hoa} onChange={(t) => set({ hoa: t })} error={bad("hoa")} />
          <MoneyField label={COPY.pmi.label} hint={COPY.pmi.hint} optional
            value={v.pmi} onChange={(t) => set({ pmi: t })} error={bad("pmi")} />
        </form>

        <Answer result={result.ok ? result : null} />

        {!result.ok && !blank && missing.length > 0 && !hasBad ? (
          <p className="nt-mort-status" role="status">
            {COPY.stillNeeded} {missing.join(", ")}.
          </p>
        ) : null}
        {!result.ok && !blank && hasBad ? <ErrorNote>{COPY.fixFirst}</ErrorNote> : null}

        <StartOver flowId="mortgage-payment-explainer" value={flow.value} empty={EMPTY} onChange={flow.setValue} />

        <p className="nt-mort-note">{COPY.notes.estimate}</p>

        <details className="nt-mort-details">
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
      </div>
    </ScreenFrame>
  );
}

type Good = Extract<ReturnType<typeof explainMortgage>, { ok: true }>;

function Answer({ result }: { result: Good | null }) {
  const r = COPY.result;
  const parts: [string, string][] = result
    ? [
        [r.pi, formatMoney(result.piCents)],
        [r.tax, formatMoney(result.taxMonthCents)],
        [r.insurance, formatMoney(result.insuranceMonthCents)],
        [r.hoa, formatMoney(result.hoaCents)],
        [r.pmi, formatMoney(result.pmiCents)],
      ]
    : [];
  const lines: [string, string][] = result
    ? [
        [r.loan, formatMoney(result.loanCents)],
        [r.lengthLabel, years(result.months / 12)],
        [r.totalInterest, formatMoney(result.totalInterestCents)],
      ]
    : [];
  const first: [string, string][] = result
    ? [
        [COPY.first.interest, formatMoney(result.firstInterestCents)],
        [COPY.first.principal, formatMoney(result.firstPrincipalCents)],
      ]
    : [];

  function save() {
    if (!result) return;
    const text = [
      COPY.save.fileTitle, "",
      `${r.totalLabel}: ${formatMoney(result.totalMonthlyCents)}`,
      ...parts.map(([k, val]) => `${k}: ${val}`),
      ...lines.map(([k, val]) => `${k}: ${val}`),
      COPY.first.heading,
      ...first.map(([k, val]) => `${k}: ${val}`),
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
    <>
      <ResultCard
        label={r.totalLabel}
        answer={result ? formatMoney(result.totalMonthlyCents) : undefined}
        waiting={COPY.waiting}
      >
        <p className="nt-mort-help">{r.totalLine}</p>
        <dl className="nt-mort-lines">
          {parts.map(([k, val]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{val}</dd>
            </div>
          ))}
        </dl>
        <dl className="nt-mort-lines">
          {lines.map(([k, val]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{val}</dd>
            </div>
          ))}
        </dl>
      </ResultCard>

      {result ? (
        <section className="nt-mort-first" aria-label={COPY.first.heading}>
          <h2>{COPY.first.heading}</h2>
          <p className="nt-mort-help">{COPY.first.line}</p>
          <dl className="nt-mort-lines">
            {first.map(([k, val]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{val}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <SavePrintSheet quiet title={COPY.save.title} onSave={save}>
        {result ? (
          <p>{COPY.save.preview}</p>
        ) : null}
      </SavePrintSheet>

      {result ? (
        <details className="nt-mort-details">
          <summary>{COPY.more.summary}</summary>
          <div className="nt-mort-details-body">
            <p className="nt-mort-help">{COPY.more.loanWork}</p>
            <p className="nt-mort-help">{COPY.more.how}</p>
          </div>
        </details>
      ) : null}
    </>
  );
}

export default Page;
