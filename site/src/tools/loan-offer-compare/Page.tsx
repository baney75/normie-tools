import { useState } from "react";
import { CalmMessage } from "../../components/CalmMessage";
import { ErrorNote, MoneyField, NumberField, PercentField, PrivacyNote, ResultCard, StartOver } from "../../components/calc";
import { SavePrintSheet } from "../../components/SavePrintSheet";
import { ScreenFrame } from "../../components/ScreenFrame";
import { useAutosave } from "../../lib/useAutosave";
import { compareOffers, formatMoney } from "../../../../tools/loan-offer-compare/calc.mjs";
import { COPY } from "./copy";
import "./Page.css";

type Offer = { amount: string; rate: string; term: string; termUnit: "months" | "years"; fees: string };
type Inputs = { offers: Offer[] };
type Problem = { offer: number | null; field: string; kind: string; message: string };

const BLANK_OFFER: Offer = { amount: "", rate: "", term: "", termUnit: "months", fees: "" };
const EMPTY: Inputs = { offers: [{ ...BLANK_OFFER }, { ...BLANK_OFFER }] };
const FIELD_NAMES: Record<string, string> = { amount: COPY.amount.label, rate: COPY.rate.label, term: COPY.term.label, fees: COPY.fees.label };

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
  const missing = problems.filter((p) => p.kind === "missing" && p.offer !== null).map((p) => `${name(p.offer as number)}: ${FIELD_NAMES[p.field]}`);
  const blank = offers.every(offerBlank);
  const hasBad = problems.some((p) => p.kind === "bad");

  return (
    <ScreenFrame title={COPY.title} as="div" reserve="0">
      <div className="nt-offers">
        <p className="nt-offers-intro">{COPY.intro}</p>
        <PrivacyNote />

        {flow.hasSaved && blank ? (
          <div className="nt-offers-status">
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

        <form className="nt-offers-form" onSubmit={(e) => e.preventDefault()} noValidate>
          {offers.map((o, i) => (
            <fieldset className="nt-offer" key={i}>
              <legend>{name(i)}</legend>
              <MoneyField
                autoFocus={i === 0}
                label={`${name(i)}: ${COPY.amount.label}`}
                hint={COPY.amount.hint}
                placeholder={COPY.amount.placeholder}
                value={o.amount}
                onChange={(t) => setOffer(i, { amount: t })}
                error={bad(i, "amount")}
              />
              <PercentField
                label={`${name(i)}: ${COPY.rate.label}`}
                hint={COPY.rate.hint}
                placeholder={COPY.rate.placeholder}
                value={o.rate}
                onChange={(t) => setOffer(i, { rate: t })}
                error={bad(i, "rate")}
              />
              <NumberField
                label={`${name(i)}: ${COPY.term.label}`}
                hint={COPY.term.hint}
                placeholder={COPY.term.placeholder}
                value={o.term}
                onChange={(t) => setOffer(i, { term: t })}
                error={bad(i, "term")}
              />
              <fieldset className="nt-offers-units">
                <legend>{COPY.term.unitLegend}</legend>
                <div className="nt-offers-unit-row">
                  {(["months", "years"] as const).map((u) => (
                    <label key={u} className="nt-offers-unit">
                      <input
                        type="radio"
                        name={`offer-${i}-term-unit`}
                        value={u}
                        aria-label={`${name(i)}: ${COPY.term[u]}`}
                        checked={o.termUnit === u}
                        onChange={() => setOffer(i, { termUnit: u })}
                      />
                      {COPY.term[u]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <MoneyField
                label={`${name(i)}: ${COPY.fees.label}`}
                hint={COPY.fees.hint}
                placeholder={COPY.fees.placeholder}
                optional
                value={o.fees}
                onChange={(t) => setOffer(i, { fees: t })}
                error={bad(i, "fees")}
              />
            </fieldset>
          ))}
          {offers.length < 3 ? (
            <div className="nt-offers-add">
              <button type="button" className="nt-offers-action" onClick={() => flow.setValue({ offers: [...offers, { ...BLANK_OFFER }] })}>
                {COPY.addThird}
              </button>
              <p className="nt-offers-hint">{COPY.addHint}</p>
              {canPutBack ? (
                <p className="nt-offers-hint" role="status">
                  {COPY.removedDone}{" "}
                  <button
                    type="button"
                    className="nt-offers-action"
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
                className="nt-offers-action"
                onClick={() => {
                  setRemoved(offers[2]);
                  flow.setValue({ offers: offers.slice(0, 2) });
                }}
              >
                {COPY.removeThird}
              </button>
              <p className="nt-offers-hint">{COPY.removeHint}</p>
            </div>
          )}
        </form>

        <Answer result={result.ok ? result : null} />

        {!result.ok && !blank && missing.length > 0 && !hasBad ? (
          <p className="nt-offers-status" role="status">
            {COPY.stillNeeded} {missing.join(", ")}.
          </p>
        ) : null}
        {!result.ok && !blank && hasBad ? <ErrorNote>{COPY.fixFirst}</ErrorNote> : null}

        <StartOver flowId="loan-offer-compare" value={flow.value} empty={EMPTY} onChange={flow.setValue} />

        <p className="nt-offers-note">{COPY.notes.estimate}</p>

        <details className="nt-offers-details">
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
      </div>
    </ScreenFrame>
  );
}

type Good = Extract<ReturnType<typeof compareOffers>, { ok: true }>;

function Answer({ result }: { result: Good | null }) {
  const r = COPY.result;
  const f = COPY.facts;
  const rows: [string, (o: Good["offers"][number]) => string][] = [
    [r.lengthLabel, (o) => months(o.months)],
    [r.totalPaid, (o) => formatMoney(o.totalPaidCents)],
    [r.totalInterest, (o) => formatMoney(o.totalInterestCents)],
    [r.fees, (o) => formatMoney(o.feesCents)],
    [r.cost, (o) => formatMoney(o.costOfBorrowingCents)],
  ];

  function save() {
    if (!result) return;
    const costNames = nameList(result.lowestCost.offers);
    const payNames = nameList(result.lowestPayment.offers);
    const lines = [COPY.save.fileTitle, "", `${f.lowestCost}: ${costNames}`, `${f.lowestPayment}: ${payNames}`, ""];
    result.offers.forEach((o, i) => {
      lines.push(name(i), `${r.paymentLabel}: ${formatMoney(o.monthlyPaymentCents)}`, ...rows.map(([k, get]) => `${k}: ${get(o)}`), "");
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

  const costNames = result ? nameList(result.lowestCost.offers) : "";
  const payNames = result ? nameList(result.lowestPayment.offers) : "";

  return (
    <div className="nt-offers-results">
      <ResultCard label={f.lowestCost} answer={result ? costNames : undefined} waiting={COPY.waiting}>
        {result ? <p className="nt-offers-help">{result.lowestCost.tie ? f.tieCost : f.oneCost}</p> : null}
      </ResultCard>
      {result ? (
        <>
          {!result.sameAmountAndLength ? <p className="nt-offers-status">{f.differ}</p> : null}

          {result.offers.map((o, i) => (
            <ResultCard key={i} label={`${name(i)}, ${r.paymentLabel}`} answer={formatMoney(o.monthlyPaymentCents)} closing={false}>
              <dl className="nt-offers-lines">
                {rows.map(([k, get]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{get(o)}</dd>
                  </div>
                ))}
              </dl>
            </ResultCard>
          ))}
          <p className="nt-offers-help">{r.costHelp}</p>
        </>
      ) : null}

      <SavePrintSheet quiet title={COPY.save.title} onSave={save}>
        {result ? (
          <p>{COPY.save.preview}</p>
        ) : null}
      </SavePrintSheet>

      {result ? (
        <details className="nt-offers-details">
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
                  {rows.map(([k, get]) => (
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
          </div>
        </details>
      ) : null}
    </div>
  );
}

export default Page;
