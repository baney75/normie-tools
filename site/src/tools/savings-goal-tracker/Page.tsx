import { CalmMessage } from "../../components/CalmMessage";
import { ErrorNote, Field, MoneyField, PercentField, PrivacyNote, ResultCard, StartOver } from "../../components/calc";
import { SavePrintSheet } from "../../components/SavePrintSheet";
import { ScreenFrame } from "../../components/ScreenFrame";
import { useAutosave } from "../../lib/useAutosave";
import { explainSavings, formatMoney } from "../../../../tools/savings-goal-tracker/calc.mjs";
import { COPY } from "./copy";
import "./Page.css";

type Inputs = {
  mode: "when" | "by";
  goal: string;
  saved: string;
  monthly: string;
  rate: string;
  start: string;
  target: string;
};

const EMPTY: Inputs = { mode: "when", goal: "", saved: "", monthly: "", rate: "", start: "", target: "" };
const FIELD_NAMES = {
  goal: COPY.goal.label,
  saved: COPY.saved.label,
  monthly: COPY.monthly.label,
  rate: COPY.rate.label,
  start: COPY.start.label,
  target: COPY.target.label,
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const months = (n: number) => plural(n, "month");
const isBlank = (v: Inputs) => !v.goal.trim() && !v.saved.trim() && !v.monthly.trim() && !v.rate.trim() && !v.start.trim() && !v.target.trim();

/** "2028-05" becomes "May 2028". */
function monthName(text: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(text);
  if (!m) return "";
  return `${COPY.monthNames[Number(m[2]) - 1]} ${Number(m[1])}`;
}

/** 18 becomes "1 year 6 months". Shown only for 12 months or more. */
function yearsAndMonths(n: number): string {
  const y = Math.floor(n / 12);
  const r = n % 12;
  return r === 0 ? plural(y, "year") : `${plural(y, "year")} ${plural(r, "month")}`;
}

export function Page() {
  const flow = useAutosave<Inputs>("savings-goal-tracker", EMPTY);
  const v = flow.value;
  const set = (patch: Partial<Inputs>) => flow.setValue({ ...v, ...patch });

  // Derived in render: no timers, no effects. The answer follows the typing.
  const result = explainSavings(v);
  const problems = result.ok ? [] : result.problems;
  const bad = (field: string) => problems.find((p: { field: string; kind: string }) => p.field === field && p.kind === "bad")?.message;
  const missing = problems.filter((p: { kind: string }) => p.kind === "missing").map((p: { field: keyof typeof FIELD_NAMES }) => FIELD_NAMES[p.field]);
  const blank = isBlank(v);
  const hasBad = problems.some((p: { kind: string }) => p.kind === "bad");

  return (
    <ScreenFrame title={COPY.title} as="div" reserve="0">
      <div className="nt-save">
        <p className="nt-save-intro">{COPY.intro}</p>
        <PrivacyNote />

        {flow.hasSaved && blank ? (
          <div className="nt-save-status">
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

        <form className="nt-save-form" onSubmit={(e) => e.preventDefault()} noValidate>
          <fieldset className="nt-save-units">
            <legend>{COPY.mode.legend}</legend>
            <div className="nt-save-unit-row">
              {(["when", "by"] as const).map((m) => (
                <label key={m} className="nt-save-unit">
                  <input type="radio" name="savings-mode" value={m} checked={v.mode === m} onChange={() => set({ mode: m })} />
                  {COPY.mode[m]}
                </label>
              ))}
            </div>
          </fieldset>
          <MoneyField
            label={COPY.goal.label}
            autoFocus
            hint={COPY.goal.hint}
            placeholder={COPY.goal.placeholder}
            value={v.goal}
            onChange={(t) => set({ goal: t })}
            error={bad("goal")}
          />
          <MoneyField
            label={COPY.saved.label}
            hint={COPY.saved.hint}
            placeholder={COPY.saved.placeholder}
            optional
            value={v.saved}
            onChange={(t) => set({ saved: t })}
            error={bad("saved")}
          />
          {v.mode === "when" ? (
            <MoneyField
              label={COPY.monthly.label}
              hint={COPY.monthly.hint}
              placeholder={COPY.monthly.placeholder}
              value={v.monthly}
              onChange={(t) => set({ monthly: t })}
              error={bad("monthly")}
            />
          ) : null}
          <PercentField
            label={COPY.rate.label}
            hint={COPY.rate.hint}
            placeholder={COPY.rate.placeholder}
            optional
            value={v.rate}
            onChange={(t) => set({ rate: t })}
            error={bad("rate")}
          />
          <Field
            label={COPY.start.label}
            hint={v.mode === "by" ? COPY.start.hint : COPY.start.hintOptional}
            placeholder={COPY.start.placeholder}
            optional={v.mode === "when"}
            inputMode="text"
            value={v.start}
            onChange={(t) => set({ start: t })}
            error={bad("start")}
          />
          {v.mode === "by" ? (
            <Field
              label={COPY.target.label}
              hint={COPY.target.hint}
              placeholder={COPY.target.placeholder}
              inputMode="text"
              value={v.target}
              onChange={(t) => set({ target: t })}
              error={bad("target")}
            />
          ) : null}
        </form>

        <StartOver flowId="savings-goal-tracker" value={flow.value} empty={EMPTY} onChange={flow.setValue} />

        <Answer result={result} mode={v.mode} />

        {!result.ok && !blank && missing.length > 0 && !hasBad ? (
          <p className="nt-save-status" role="status">
            {COPY.stillNeeded} {missing.join(", ")}.
          </p>
        ) : null}
        {!result.ok && !blank && hasBad ? <ErrorNote>{COPY.fixFirst}</ErrorNote> : null}

        <p className="nt-save-note">{COPY.notes.estimate}</p>
      </div>
    </ScreenFrame>
  );
}

type Good = Extract<ReturnType<typeof explainSavings>, { ok: true }>;

function Answer({ result: whole, mode }: { result: ReturnType<typeof explainSavings>; mode: "when" | "by" }) {
  if (!whole.ok) {
    return (
      <>
        <ResultCard label={mode === "by" ? COPY.by.label : COPY.when.label} waiting={COPY.waiting} />
        <SavePrintSheet quiet title={COPY.save.title} onSave={() => {}}>{null}</SavePrintSheet>
      </>
    );
  }
  return <Done result={whole} />;
}

function Done({ result }: { result: Good }) {
  const w = COPY.when;
  const b = COPY.by;
  let label: string;
  let answer: string;
  let help: string | null = null;
  let lines: [string, string][] = [];

  if (result.mode === "by") {
    label = b.label;
    if (result.status === "reached") {
      answer = b.reachedAnswer;
      help = b.reachedLine;
    } else {
      answer = formatMoney(result.monthlyNeededCents);
      help = b.line;
      lines = [
        [b.months, months(result.months)],
        [b.target, monthName(result.target)],
        [b.deposits, formatMoney(result.depositsCents)],
        [b.interest, formatMoney(result.interestEarnedCents)],
        [b.balance, formatMoney(result.finalBalanceCents)],
      ];
    }
  } else {
    label = w.label;
    if (result.status === "reached") {
      answer = w.reachedAnswer;
      help = w.reachedLine;
    } else if (result.status === "no-savings") {
      answer = w.noSavingsAnswer;
      help = w.noSavingsLine;
    } else if (result.status === "too-long") {
      answer = w.tooLongAnswer;
      help = w.tooLongLine;
    } else {
      const n = result.months ?? 0;
      answer = months(n);
      help = result.landing ? `${w.lands} ${monthName(result.landing)}.` : w.landsNone;
      lines = [
        ...(n >= 12 ? [[w.inYears, yearsAndMonths(n)] as [string, string]] : []),
        [w.deposits, formatMoney(result.depositsCents)],
        [w.interest, formatMoney(result.interestEarnedCents)],
        [w.balance, formatMoney(result.finalBalanceCents)],
      ];
    }
  }

  function save() {
    const text = [COPY.save.fileTitle, "", `${label}: ${answer}`, ...(help ? [help] : []), ...lines.map(([k, val]) => `${k}: ${val}`), "", COPY.notes.estimate, COPY.notes.rule, ""].join("\n");
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

  const noRate = result.status === "will-reach" || result.status === "needs";
  const note =
    noRate && result.interestEarnedCents === 0
      ? COPY.when.noInterest
      : noRate && result.finalBalanceCents > result.goalCents
        ? COPY.when.overGoal
        : null;
  const byYear = result.mode === "when" && result.status === "will-reach" ? result.byYear : [];

  return (
    <>
      <ResultCard label={label} answer={answer}>
        {help ? <p className="nt-save-help">{help}</p> : null}
        {note ? <p className="nt-save-help">{note}</p> : null}
        {lines.length > 0 ? (
          <dl className="nt-save-lines">
            {lines.map(([k, val]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{val}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </ResultCard>

      {byYear.length > 0 ? (
        <details className="nt-save-details">
          <summary>{COPY.more.summary}</summary>
          <div className="nt-save-details-body">
            <p className="nt-save-help">{COPY.notes.rule}</p>
            <div className="nt-save-table-wrap">
              <table className="nt-save-table">
                <caption>{COPY.more.tableHeading}</caption>
                <thead>
                  <tr>
                    <th scope="col">{COPY.more.year}</th>
                    <th scope="col">{COPY.more.added}</th>
                    <th scope="col">{COPY.more.interest}</th>
                    <th scope="col">{COPY.more.balance}</th>
                  </tr>
                </thead>
                <tbody>
                  {byYear.map((y: { year: number; depositsCents: number; interestCents: number; balanceCents: number }) => (
                    <tr key={y.year}>
                      <th scope="row">{y.year}</th>
                      <td>{formatMoney(y.depositsCents)}</td>
                      <td>{formatMoney(y.interestCents)}</td>
                      <td>{formatMoney(y.balanceCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      ) : null}

      <SavePrintSheet quiet title={COPY.save.title} onSave={save}>
        <p>{COPY.save.preview}</p>
      </SavePrintSheet>
    </>
  );
}

export default Page;
