import { useState, type ReactNode } from "react";
import { Chips, ErrorNote, MoneyField, NumberField, PercentField, ResultCard, Finish, StartOver, StepFlow } from "../../components/calc";
import { useAutosave } from "../../lib/useAutosave";
import { compareOffers, formatMoney } from "../../../../tools/loan-offer-compare/calc.mjs";
import { COPY } from "./copy";
import "./Page.css";

type Offer = { amount: string; rate: string; term: string; termUnit: "months" | "years"; fees: string };
type Inputs = { offers: Offer[] };
type Problem = { offer: number | null; field: string; kind: string; message: string };

const BLANK_OFFER: Offer = { amount: "", rate: "", term: "", termUnit: "months", fees: "" };
const EMPTY: Inputs = { offers: [{ ...BLANK_OFFER }, { ...BLANK_OFFER }] };

const name = (i: number) => `${COPY.offerName} ${i + 1}`;
const months = (n: number) => `${n} ${n === 1 ? "month" : "months"}`;
const nameList = (idx: number[]) => idx.map(name).join(idx.length === 2 ? " and " : ", ").replace(/, (Offer \d)$/, " and $1");
const offerBlank = (o: Offer) => !o.amount.trim() && !o.rate.trim() && !o.term.trim() && !o.fees.trim();

export function Page() {
  const flow = useAutosave<Inputs>("loan-offer-compare", EMPTY);
  const offers = Array.isArray(flow.value.offers) && flow.value.offers.length >= 2 ? flow.value.offers : EMPTY.offers;
  const [removed, setRemoved] = useState<Offer | null>(null);
  const canPutBack = removed !== null && offers.length < 3;
  const setOffer = (i: number, patch: Partial<Offer>) =>
    flow.setValue({ offers: offers.map((o, k) => (k === i ? { ...o, ...patch } : o)) });

  // Derived in render: no timers, no effects. The answer follows the typing.
  const result = compareOffers({ offers });
  const problems: Problem[] = result.ok ? [] : result.problems;
  const bad = (i: number, field: string) => problems.find((p) => p.offer === i && p.field === field && p.kind === "bad")?.message;
  const blank = offers.every(offerBlank);
  const good = result.ok ? result : null;

  const fieldOk = (i: number, fields: string[]) => !problems.some((p) => p.offer === i && fields.includes(p.field));
  const amountRate = (o: Offer, i: number) => (
    <fieldset className="nt-offer-step">
      <legend className="nt-sr-only">{name(i)}</legend>
      {/* Where to find both numbers, like the hints on every other tool's boxes. Readers worried they would guess the rate. */}
      <p className="nt-field-hint">{COPY.amountRateHint}</p>
      <MoneyField hiddenPrefix={`${name(i)}:`} label={COPY.amount.label}
        value={o.amount} onChange={(t) => setOffer(i, { amount: t })} error={bad(i, "amount")} />
      <PercentField hiddenPrefix={`${name(i)}:`} label={COPY.rate.label}
        value={o.rate} onChange={(t) => setOffer(i, { rate: t })} error={bad(i, "rate")} />
    </fieldset>
  );
  const lengthFees = (o: Offer, i: number) => (
    <fieldset className="nt-offer-step">
      <legend className="nt-sr-only">{name(i)}</legend>
      <NumberField hiddenPrefix={`${name(i)}:`} label={COPY.term.label}
        value={o.term} onChange={(t) => setOffer(i, { term: t })} error={bad(i, "term")} />
      <Chips
        legend={`${name(i)}: ${COPY.term.unitLegend}`}
        hideLegend
        options={[
          { value: "months", label: COPY.term.months },
          { value: "years", label: COPY.term.years },
        ]}
        value={o.termUnit}
        onChange={(u) => setOffer(i, { termUnit: u as Offer["termUnit"] })}
      />
      <MoneyField hiddenPrefix={`${name(i)}:`} label={COPY.fees.label} optional
        value={o.fees} onChange={(t) => setOffer(i, { fees: t })} error={bad(i, "fees")} />
    </fieldset>
  );

  const [moreOpen, setMoreOpen] = useState(false);
  // The third offer's steps keep a way back to the two-offer answer, so "Add a third offer" tapped by mistake is not a dead end.
  const dropThird = () => {
    setRemoved(offers[2]);
    flow.setValue({ offers: offers.slice(0, 2) });
    flow.setStep(4);
  };
  const withWayOut = (i: number, content: ReactNode) =>
    i < 2 ? content : (
      <>
        {content}
        <button type="button" className="nt-more-btn" onClick={dropThird}>
          {COPY.removeThird}
        </button>
      </>
    );

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
      steps={offers.flatMap((o, i) => [
        { question: COPY.steps.amountRate[i], ready: fieldOk(i, ["amount", "rate"]), missing: COPY.steps.amountRateMissing, content: withWayOut(i, amountRate(o, i)) },
        { question: COPY.steps.lengthFees[i], ready: fieldOk(i, ["term", "fees"]), missing: COPY.steps.lengthFeesMissing, content: withWayOut(i, lengthFees(o, i)) },
      ])}
      answer={<Answer result={good} />}
      actions={good ? <Save result={good} /> : null}
      extras={
        <>
          {!result.ok && problems.some((p) => p.kind === "bad") ? <ErrorNote>{COPY.fixFirst}</ErrorNote> : null}
          {/* A third offer is an extra like any other tool's optional boxes, so it waits in "More options". It opens by itself
              while "Put it back" is on offer. */}
          <StartOver
            flowId="loan-offer-compare"
            value={flow.value}
            empty={EMPTY}
            onChange={flow.setValue}
            open={moreOpen || canPutBack}
            onOpen={setMoreOpen}
          >
            {offers.length < 3 ? (
              <div className="nt-offers-add">
                <button
                  type="button"
                  className="nt-more-btn"
                  onClick={() => {
                    flow.setValue({ offers: [...offers, { ...BLANK_OFFER }] });
                    flow.setStep(4);
                  }}
                >
                  {COPY.addThird}
                </button>
                {canPutBack ? (
                  <p className="nt-offers-hint" role="status">
                    {COPY.removedDone}{" "}
                    <button
                      type="button"
                      className="nt-more-btn"
                      onClick={() => {
                        flow.setValue({ offers: [...offers, removed as Offer] });
                        setRemoved(null);
                      }}
                    >
                      {COPY.putBack}
                    </button>
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="nt-offers-add">
                <button
                  type="button"
                  className="nt-more-btn"
                  onClick={() => {
                    setRemoved(offers[2]);
                    flow.setValue({ offers: offers.slice(0, 2) });
                  }}
                >
                  {COPY.removeThird}
                </button>
              </div>
            )}
          </StartOver>
        </>
      }
      below={<Details result={good} />}
    />
  );
}

type Good = Extract<ReturnType<typeof compareOffers>, { ok: true }>;
type OfferResult = Good["offers"][number];

const ROWS: [string, (o: OfferResult) => string][] = [
  [COPY.result.lengthLabel, (o) => months(o.months)],
  [COPY.result.totalPaid, (o) => formatMoney(o.totalPaidCents)],
  [COPY.result.totalInterest, (o) => formatMoney(o.totalInterestCents)],
  [COPY.result.fees, (o) => formatMoney(o.feesCents)],
  [COPY.result.cost, (o) => formatMoney(o.costOfBorrowingCents)],
];

/** The facts in plain money: how much less the cheaper offer costs in all, and, when another offer is lower each month, by how much. */
function savedLine(result: Good): string {
  const f = COPY.facts;
  if (result.lowestCost.tie) return f.tieCost;
  const best = result.lowestCost.offers[0];
  const others = result.offers.map((o, i) => ({ i, cost: o.costOfBorrowingCents })).filter((x) => x.i !== best);
  const next = others.reduce((a, b) => (b.cost < a.cost ? b : a));
  const gap = formatMoney(next.cost - result.offers[best].costOfBorrowingCents);
  const inAll =
    result.offers.length === 2
      ? `${name(best)} ${f.lessThan} ${gap} ${f.lessInAll}`
      : `${name(best)} ${f.lessThan} ${gap} ${f.lessInAllThan} ${f.nextLowest}.`;
  const cheapMonth = result.lowestPayment.offers[0];
  if (result.lowestPayment.tie || result.lowestPayment.offers.includes(best)) return inAll;
  const monthGap = formatMoney(result.offers[best].monthlyPaymentCents - result.offers[cheapMonth].monthlyPaymentCents);
  return `${inAll} ${name(cheapMonth)} ${f.lessThan} ${monthGap} ${f.lessEachMonth}`;
}

function Answer({ result }: { result: Good | null }) {
  const f = COPY.facts;
  return (
    <ResultCard label={f.lowestCost} answer={result ? nameList(result.lowestCost.offers) : undefined} waiting={COPY.waiting}>
      {result ? (
        <>
          <p>{savedLine(result)}</p>
          {!result.sameAmountAndLength ? <p>{f.differ}</p> : null}
          <dl>
            {result.offers.map((o, i) => (
              <div key={`all-${i}`}>
                <dt>{name(i)}, {f.inAll}</dt>
                <dd>
                  {formatMoney(o.costOfBorrowingCents)}{" "}
                  <span className="nt-offers-month">
                    {formatMoney(o.monthlyPaymentCents)} {f.aMonth}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}
    </ResultCard>
  );
}

function Save({ result }: { result: Good }) {
  const f = COPY.facts;
  const r = COPY.result;
  function save() {
    const lines = [COPY.save.fileTitle, "", `${f.lowestCost}: ${nameList(result.lowestCost.offers)}`, `${f.lowestPayment}: ${nameList(result.lowestPayment.offers)}`, ""];
    result.offers.forEach((o, i) => {
      lines.push(name(i), `${r.paymentLabel}: ${formatMoney(o.monthlyPaymentCents)}`, ...ROWS.map(([k, get]) => `${k}: ${get(o)}`), "");
    });
    lines.push(COPY.notes.estimate, COPY.notes.facts, "");
    try {
      const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain" }));
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
  const f = COPY.facts;
  const r = COPY.result;
  const costNames = result ? nameList(result.lowestCost.offers) : "";
  const payNames = result ? nameList(result.lowestPayment.offers) : "";
  return (
    <>
      {result ? (
        <details>
          <summary>{COPY.more.summary}</summary>
          <div className="nt-offers-details-body">
            <p className="nt-offers-help">{result.lowestPayment.tie ? f.tiePayment : `${f.payLine} ${payNames}`}</p>
            {costNames !== payNames ? <p className="nt-offers-help">{f.split}</p> : null}
            <div className="nt-offers-table-wrap">
              <table className="nt-offers-table">
                <caption>{COPY.more.tableHeading}</caption>
                <thead>
                  <tr>
                    <th scope="col">{COPY.more.row}</th>
                    {result.offers.map((_, i) => (
                      <th scope="col" key={i}>{name(i)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">{r.paymentLabel}</th>
                    {result.offers.map((o, i) => (
                      <td key={i}>{formatMoney(o.monthlyPaymentCents)}</td>
                    ))}
                  </tr>
                  {ROWS.map(([k, get]) => (
                    <tr key={k}>
                      <th scope="row">{k}</th>
                      {result.offers.map((o, i) => (
                        <td key={i}>{get(o)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="nt-offers-help">{r.costHelp}</p>
          </div>
        </details>
      ) : null}
      <details>
        <summary>{COPY.key.summary}</summary>
        <div className="nt-offers-details-body">
          <dl className="nt-offers-key">
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
