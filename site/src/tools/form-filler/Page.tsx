import { useRef, useState } from "react";
import { CalmMessage } from "../../components/CalmMessage";
import { ResumePrompt } from "../../components/ResumePrompt";
import { UploadField } from "../../components/UploadField";
import { ScreenFrame } from "../../components/ScreenFrame";
import { ErrorNote, PrivacyNote, ResultCard, StartOver, StepLabel } from "../../components/calc";
import { useAutosave, writeSaved } from "../../lib/useAutosave";
import {
  CHOICES, CHOICE_WORDS, INFO_FIELDS, LINKS, NEVER_LINE, PAPERS, QUESTION_IDS, SSN_LINE, STATES, VITA_PHONE, YOU_DO,
  buildSheet, checkInfo, emptyData, parseSaved, pickWay, savedText, showDate,
} from "../../../../tools/form-filler/calc.mjs";
import { COPY } from "./copy";
import { keepInView, useKeyboardSpace } from "./useKeyboardSpace";
import "./Page.css";

const FLOW = "form-filler";

type Choice = "yes" | "no" | "unsure" | "";
type Data = {
  answers: Record<string, Choice>;
  info: Record<string, string>;
  papers: string[];
};

// Screens in order. Four questions, the result, the papers, eight info boxes, the review.
const RESULT = 4;
const PAPERS_AT = 5;
const INFO_AT = 6;
const REVIEW = INFO_AT + INFO_FIELDS.length;
const LAST = REVIEW;

const EMPTY = emptyData() as unknown as Data;
const START = JSON.stringify(EMPTY);

// Saved data could be old or damaged. Keep only what has the right shape.
function tidyData(v: unknown): Data {
  const d = emptyData() as unknown as Data;
  if (!v || typeof v !== "object") return d;
  const x = v as Partial<Data>;
  for (const q of QUESTION_IDS as string[]) {
    const c = x.answers?.[q];
    if (typeof c === "string" && (CHOICES as string[]).includes(c)) d.answers[q] = c as Choice;
  }
  for (const f of INFO_FIELDS as { id: string }[]) {
    const t = x.info?.[f.id];
    if (typeof t === "string") d.info[f.id] = t.slice(0, 200);
  }
  if (Array.isArray(x.papers)) d.papers = (PAPERS as { id: string }[]).map((p) => p.id).filter((id) => (x.papers as unknown[]).includes(id));
  return d;
}

const topStep = (screen: number) => (screen <= RESULT ? 0 : screen === PAPERS_AT ? 1 : screen < REVIEW ? 2 : 3);

type Notice =
  | { kind: "found"; data: Data }
  | { kind: "used"; before: Data }
  | { kind: "undone" }
  | { kind: "bad"; lines: string[] }
  | { kind: "notMine" };

async function readText(file: File): Promise<string> {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

async function saveFile(name: string, text: string, type: string): Promise<boolean> {
  try {
    const file = new File([text], name, { type });
    if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: name });
        return true;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return false; // the person closed the share sheet
      }
    }
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

export function Page() {
  const flow = useAutosave<Data>(FLOW, EMPTY);
  const v = tidyData(flow.value);
  const screen = Math.min(Math.max(Math.trunc(flow.step) || 0, 0), LAST);
  const [tried, setTried] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [saveNote, setSaveNote] = useState<{ name: string; kind: "sheet" | "later" } | null>(null);
  const [showOpen, setShowOpen] = useState(false);
  const [backToReview, setBackToReview] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useKeyboardSpace(rootRef);

  // Write value and screen together. The hook writes one at a time, so write the pair last.
  const go = (n: number, d: Data = v) => {
    flow.setValue(d);
    flow.setStep(n);
    writeSaved(FLOW, n, d);
    setTried(false);
    setNotice(null);
    setSaveNote(null);
  };
  const setAnswer = (q: string, c: Choice) => flow.setValue({ ...v, answers: { ...v.answers, [q]: c } });
  const setInfo = (f: string, t: string) => flow.setValue({ ...v, info: { ...v.info, [f]: t } });
  const togglePaper = (id: string) =>
    flow.setValue({ ...v, papers: v.papers.includes(id) ? v.papers.filter((p) => p !== id) : [...v.papers, id] });

  const pristine = JSON.stringify(v) === START && flow.step === 0;
  if (flow.hasSaved && flow.saved && pristine) {
    const s = Math.min(Math.max(Math.trunc(flow.saved.step) || 0, 0), LAST);
    return (
      <ScreenFrame title={COPY.title} as="div" reserve="0">
        <ResumePrompt
          step={topStep(s)}
          total={COPY.steps.length}
          stepTitle={COPY.steps[topStep(s)]}
          onPickUp={flow.restore}
          onStartOver={flow.clear}
        />
      </ScreenFrame>
    );
  }

  const infoIndex = screen - INFO_AT;
  const field = infoIndex >= 0 && infoIndex < INFO_FIELDS.length ? (INFO_FIELDS[infoIndex] as { id: string; label: string }) : null;
  const check = field ? checkInfo(field.id, v.info[field.id]) : null;

  function next() {
    if (field && check) {
      if (!check.ok) {
        setTried(true);
        return;
      }
      const d = { ...v, info: { ...v.info, [field.id]: check.value } };
      go(backToReview ? REVIEW : screen + 1, d);
      setBackToReview(false);
      return;
    }
    if (backToReview && screen < REVIEW) {
      go(REVIEW);
      setBackToReview(false);
      return;
    }
    go(Math.min(screen + 1, LAST));
  }
  const back = () => {
    setBackToReview(false);
    go(Math.max(screen - 1, 0));
  };
  const edit = (to: number) => {
    setBackToReview(true);
    go(to);
  };

  async function useFile(file: File) {
    let text = "";
    try {
      text = await readText(file);
    } catch {
      setNotice({ kind: "bad", lines: ["This file could not be read."] });
      return;
    }
    const r = parseSaved(text) as { ok: boolean; data?: Data; problems?: { field: string; message: string }[] };
    if (r.ok && r.data) setNotice({ kind: "found", data: r.data });
    else if (r.problems?.[0]?.field === "file") setNotice({ kind: "notMine" });
    else setNotice({ kind: "bad", lines: (r.problems ?? []).map((p) => p.message) });
  }

  const way = pickWay(v.answers as never) as { way: string; name: string; lines: string[] };

  return (
    <ScreenFrame title={COPY.title} as="div" reserve="0">
      <div className="nt-ff" ref={rootRef} onFocus={(e) => keepInView(e.target)}>
        <StepLabel n={topStep(screen) + 1} of={COPY.steps.length}>{COPY.steps[topStep(screen)]}</StepLabel>
        <progress className="nt-ff-bar" aria-label="Progress" value={screen + 1} max={LAST + 1} />
        {screen === 0 ? <p className="nt-ff-intro">{COPY.intro}</p> : null}
        <PrivacyNote />
        {screen === 0 ? (
          <p className="nt-ff-line">
            {COPY.opensLine} {COPY.sources.label} <a href={LINKS.freeFilePage} rel="noreferrer">{COPY.sources.freeFile}</a>
          </p>
        ) : null}

        {notice ? <NoticeView notice={notice} onUse={(d) => { const before = v; go(REVIEW, d); setNotice({ kind: "used", before }); }} onKeep={() => setNotice(null)} onUndo={(before) => { go(screen, before); setNotice({ kind: "undone" }); }} /> : null}

        {screen < RESULT ? (
          <Question
            key={screen}
            id={(QUESTION_IDS as string[])[screen]}
            n={screen + 1}
            value={v.answers[(QUESTION_IDS as string[])[screen]]}
            onPick={(c) => setAnswer((QUESTION_IDS as string[])[screen], c)}
          />
        ) : null}

        {screen === RESULT ? (
          <section className="nt-ff-screen" aria-label={COPY.result.title}>
            <ResultCard label={COPY.result.label} answer={way.name} closing={false}>
              {way.lines.map((l) => <p key={l} className="nt-ff-line">{l}</p>)}
            </ResultCard>
            {way.way !== "past" ? (
              <p className="nt-ff-line">
                <a href={LINKS.freeFile} rel="noreferrer">{COPY.result.open}</a>
              </p>
            ) : null}
            <p className="nt-ff-line">
              {COPY.result.freeHelp}: <a href={LINKS.vita} rel="noreferrer">{COPY.result.findHelp}</a>. {COPY.result.call} {VITA_PHONE}.
            </p>
            <p className="nt-ff-line">{COPY.result.note}</p>
            <p className="nt-ff-source">
              {COPY.sources.label} <a href={LINKS.freeFilePage} rel="noreferrer">{COPY.sources.freeFile}</a>,{" "}
              <a href={LINKS.vita} rel="noreferrer">{COPY.sources.vita}</a>
            </p>
          </section>
        ) : null}

        {screen === PAPERS_AT ? (
          <section className="nt-ff-screen">
            <fieldset className="nt-ff-fieldset">
              <legend className="nt-ff-legend">{COPY.papers.legend}</legend>
              {(PAPERS as { id: string; label: string }[]).map((p, i) => {
                const hint = COPY.papers.hints[p.id];
                const hintLines = hint === undefined ? [] : Array.isArray(hint) ? hint : [hint];
                return (
                  <div key={p.id}>
                    <label className="nt-ff-check">
                      <input type="checkbox" autoFocus={i === 0} checked={v.papers.includes(p.id)} onChange={() => togglePaper(p.id)} />
                      <span>
                        {p.label}
                        {hintLines.map((h) => <span key={h} className="nt-ff-sub">{h}</span>)}
                      </span>
                    </label>
                    {p.id === "1099" ? (
                      <details className="nt-ff-open">
                        <summary>{COPY.papers.moreFormsSummary}</summary>
                        <ul className="nt-ff-list">
                          {COPY.papers.moreForms.map((f) => <li key={f}>{f}</li>)}
                        </ul>
                        <p className="nt-ff-source">
                          {COPY.sources.label} <a href={LINKS.freeFilePage} rel="noreferrer">{COPY.sources.freeFile}</a>
                        </p>
                      </details>
                    ) : null}
                  </div>
                );
              })}
            </fieldset>
            <p className="nt-ff-line">{COPY.papers.noAgi}</p>
            <p className="nt-ff-source">
              {COPY.sources.label} <a href={LINKS.freeFilePage} rel="noreferrer">{COPY.sources.freeFile}</a>
            </p>
          </section>
        ) : null}

        {field ? (
          <section className="nt-ff-screen" key={field.id}>
            <p className="nt-ff-count">{COPY.boxOf(infoIndex + 1, INFO_FIELDS.length)}</p>
            <InfoBox
              id={field.id}
              value={v.info[field.id]}
              error={tried && check && !check.ok ? check.message : undefined}
              onChange={(t) => setInfo(field.id, t)}
              onEnter={next}
            />
            {infoIndex === 0 ? <p className="nt-ff-line">{COPY.info.ssn}</p> : null}
            <p className="nt-ff-line">{COPY.skipHint} {COPY.info.why}</p>
          </section>
        ) : null}

        {screen === REVIEW ? (
          <Review
            v={v}
            way={way}
            saveNote={saveNote}
            onEdit={edit}
            onSaveSheet={async () => {
              const r = buildSheet(v) as { ok: boolean; text?: string };
              if (!r.ok || !r.text) return;
              if (await saveFile(COPY.review.sheetName, r.text, "text/plain")) setSaveNote({ name: COPY.review.sheetName, kind: "sheet" });
            }}
            onSaveLater={async () => {
              if (await saveFile(COPY.review.laterName, savedText(v), "application/json")) setSaveNote({ name: COPY.review.laterName, kind: "later" });
            }}
          />
        ) : null}

        <div className="nt-ff-actions">
          {screen < REVIEW ? (
            <button type="button" className="primary" onClick={next}>{COPY.next}</button>
          ) : null}
          {screen > 0 ? (
            <button type="button" onClick={back}>{COPY.back}</button>
          ) : null}
        </div>
        {screen < RESULT ? <p className="nt-ff-line">{COPY.nextHelp}</p> : null}

        {screen === 0 ? (
          <div className="nt-ff-open-box">
            <button type="button" aria-expanded={showOpen} onClick={() => setShowOpen(!showOpen)}>{COPY.open.summary}</button>
            {showOpen ? (
              <UploadField needed="text" label={COPY.open.label} maxBytes={1_000_000} onAccepted={(file) => void useFile(file)} />
            ) : null}
          </div>
        ) : null}

        {screen === REVIEW ? (
          <StartOver
            flowId={FLOW}
            value={v}
            empty={EMPTY}
            onChange={flow.setValue}
          />
        ) : null}

      </div>
    </ScreenFrame>
  );
}

function NoticeView({ notice, onUse, onKeep, onUndo }: {
  notice: Notice;
  onUse: (d: Data) => void;
  onKeep: () => void;
  onUndo: (before: Data) => void;
}) {
  const o = COPY.open;
  if (notice.kind === "found") {
    const d = notice.data;
    const name = [d.info.firstName, d.info.lastName].filter(Boolean).join(" ");
    const count = QUESTION_IDS.filter((q: string) => d.answers[q] !== "").length;
    return (
      <CalmMessage tone="info" title={o.foundTitle} actions={[{ label: o.use, onClick: () => onUse(d) }, { label: o.keep, onClick: onKeep }]}>
        <p>{name ? `${name}. ` : ""}{`${count} of ${QUESTION_IDS.length} questions answered.`}</p>
        <p>{o.foundBody}</p>
      </CalmMessage>
    );
  }
  if (notice.kind === "used") {
    return (
      <CalmMessage tone="done" title={o.usedTitle} actions={[{ label: o.undo, onClick: () => onUndo(notice.before) }]}>
        {o.usedBody}
      </CalmMessage>
    );
  }
  if (notice.kind === "undone") return <CalmMessage tone="done" title={o.undoneTitle} />;
  if (notice.kind === "notMine") {
    return (
      <CalmMessage tone="problem" title={o.problemTitle}>
        <p>{o.notMine}</p>
        <p>{o.problemBody}</p>
      </CalmMessage>
    );
  }
  return (
    <CalmMessage tone="problem" title={o.problemTitle}>
      {notice.lines.map((l) => <p key={l}>{l}</p>)}
      <p>{o.problemBody}</p>
    </CalmMessage>
  );
}

function Question({ id, n, value, onPick }: { id: string; n: number; value: Choice; onPick: (c: Choice) => void }) {
  const q = (COPY.questions as Record<string, { title: string; hint: string }>)[id];
  const hid = `nt-ff-q-${id}`;
  return (
    <section className="nt-ff-screen">
      <p className="nt-ff-count">{COPY.questionOf(n, QUESTION_IDS.length)}</p>
      <h2 className="nt-ff-legend" id={hid}>{q.title}</h2>
      <p className="nt-ff-line">{q.hint}</p>
      <fieldset className="nt-ff-fieldset" aria-labelledby={hid}>
        {(CHOICES as string[]).map((c, i) => (
          <label key={c} className="nt-ff-choice">
            <input
              type="radio"
              name={`q-${id}`}
              autoFocus={i === 0}
              checked={value === c}
              onChange={() => onPick(c as Choice)}
            />
            <span>{(COPY.choices as Record<string, string>)[c]}</span>
          </label>
        ))}
      </fieldset>
      <p className="nt-ff-source">
        {COPY.sources.label} <a href={LINKS.freeFilePage} rel="noreferrer">{COPY.sources.freeFile}</a>
      </p>
    </section>
  );
}

function InfoBox({ id, value, error, onChange, onEnter }: { id: string; value: string; error?: string; onChange: (t: string) => void; onEnter: () => void }) {
  const f = (COPY.info.fields as Record<string, { label: string; hint: string; autoComplete: string; inputMode: "text" | "numeric" | "tel" }>)[id];
  const boxId = `nt-ff-${id}`;
  const errId = `${boxId}-err`;
  const hintId = `${boxId}-hint`;
  const common = {
    id: boxId,
    className: "nt-ff-input",
    autoComplete: f.autoComplete,
    autoFocus: true,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": [f.hint ? hintId : "", error ? errId : ""].filter(Boolean).join(" ") || undefined,
  } as const;
  return (
    <div className="nt-ff-field">
      <label className="nt-ff-label" htmlFor={boxId}>{f.label}</label>
      {f.hint ? <span className="nt-ff-hint" id={hintId}>{f.hint}</span> : null}
      {id === "state" ? (
        <select {...common} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">{COPY.info.pickState}</option>
          {(STATES as string[]).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      ) : (
        <input
          {...common}
          type={id === "birthDate" ? "date" : id === "phone" ? "tel" : "text"}
          inputMode={f.inputMode}
          autoCapitalize={id === "firstName" || id === "lastName" || id === "street" || id === "city" ? "words" : "off"}
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onEnter(); } }}
        />
      )}
      {error ? <ErrorNote id={errId}>{error}</ErrorNote> : null}
    </div>
  );
}

function Review({ v, way, saveNote, onEdit, onSaveSheet, onSaveLater }: {
  v: Data;
  way: { name: string; lines: string[] };
  saveNote: { name: string; kind: "sheet" | "later" } | null;
  onEdit: (to: number) => void;
  onSaveSheet: () => void;
  onSaveLater: () => void;
}) {
  const r = COPY.review;
  const [showLater, setShowLater] = useState(false);
  const sheet = buildSheet(v) as { ok: boolean; text?: string; problems?: { field: string; message: string }[] };
  const problems = sheet.ok ? [] : sheet.problems ?? [];
  const infoAt = (id: string) => INFO_AT + (INFO_FIELDS as { id: string }[]).findIndex((f) => f.id === id);
  const edit = (to: number, what: string) => (
    <a
      className="nt-ff-edit"
      href="#/tools/form-filler"
      aria-label={`${r.edit} ${what}`}
      onClick={(e) => { e.preventDefault(); onEdit(to); }}
    >
      {r.edit}
    </a>
  );
  return (
    <section className="nt-ff-screen" aria-label={r.title}>
      <h2 className="nt-ff-h">{r.title}</h2>
      <p className="nt-ff-line">{r.intro}</p>
      <p className="nt-ff-line">{r.sheetFor}</p>

      {problems.length > 0 ? (
        <div className="nt-ff-problems">
          {problems.map((p) => (
            <ErrorNote key={`${p.field}-${p.message}`}>{p.message}</ErrorNote>
          ))}
        </div>
      ) : null}

      <dl className="nt-ff-rows">
        <div className="nt-ff-row">
          <dt>{r.wayRow}</dt>
          <dd>{way.name}</dd>
        </div>
      </dl>
      <p className="nt-ff-line">
        {way.lines[0]} {COPY.sources.label} <a href={LINKS.freeFilePage} rel="noreferrer">{COPY.sources.freeFile}</a>
      </p>

      <h3 className="nt-ff-h3">{r.yourAnswers}</h3>
      <dl className="nt-ff-rows">
        {(QUESTION_IDS as string[]).map((q, i) => {
          const short = (COPY.questions as Record<string, { short: string }>)[q].short;
          return (
            <div className="nt-ff-row" key={q}>
              <dt>{short}</dt>
              <dd>{q === "open" && v.answers[q] === "no" ? r.openNo : (CHOICE_WORDS as Record<string, string>)[v.answers[q]]}</dd>
              {edit(i, short)}
            </div>
          );
        })}
      </dl>

      <h3 className="nt-ff-h3">{r.yourInfo}</h3>
      <dl className="nt-ff-rows">
        {(INFO_FIELDS as { id: string; label: string }[]).map((f) => {
          const t = v.info[f.id];
          const ok = checkInfo(f.id, t);
          const shown = !ok.ok ? t : ok.value === "" ? r.empty : f.id === "birthDate" ? showDate(ok.value) : ok.value;
          return (
            <div className="nt-ff-row" key={f.id}>
              <dt>{f.label}</dt>
              <dd>{shown}</dd>
              {edit(infoAt(f.id), f.label)}
            </div>
          );
        })}
        <div className="nt-ff-row">
          <dt>{r.papersRow}</dt>
          <dd>{r.papersOf(v.papers.length, PAPERS.length)}</dd>
          {edit(PAPERS_AT, r.papersRow)}
        </div>
      </dl>
      <p className="nt-ff-line">{SSN_LINE}</p>

      <h3 className="nt-ff-h3">{r.youDo}</h3>
      <ul className="nt-ff-list">
        {(YOU_DO as string[]).map((l) => <li key={l}>{l}</li>)}
      </ul>
      <p className="nt-ff-line">{NEVER_LINE}</p>
      <p className="nt-ff-source">
        {COPY.sources.label} <a href={LINKS.freeFilePage} rel="noreferrer">{COPY.sources.freeFile}</a>
      </p>

      {sheet.ok && sheet.text ? (
        <details className="nt-ff-open">
          <summary>{r.sheetSummary}</summary>
          <pre className="nt-ff-pre">{sheet.text}</pre>
        </details>
      ) : null}

      <div className="nt-ff-save">
        <button type="button" className="primary" disabled={!sheet.ok} onClick={onSaveSheet}>{r.saveSheet}</button>
      </div>
      <p className="nt-ff-line">{r.previewLine}</p>
      <div className="nt-ff-open-box">
        <button type="button" aria-expanded={showLater} onClick={() => setShowLater(!showLater)}>{r.laterSummary}</button>
        {showLater ? (
          <>
            <p className="nt-ff-line">{r.laterHelp}</p>
            <p className="nt-ff-line">{r.fileStays}</p>
            <div className="nt-ff-save">
              <button type="button" disabled={!sheet.ok} onClick={onSaveLater}>{r.saveLater}</button>
            </div>
          </>
        ) : null}
      </div>
      <div role="status">
        {saveNote ? (
          <p className="nt-ff-line">
            {r.saved(saveNote.name)} {saveNote.kind === "sheet" ? r.nextAfterSheet : r.nextAfterLater}
            {saveNote.kind === "sheet" ? (
              <>
                {" "}
                <a href={LINKS.freeFile} rel="noreferrer">{r.openIrs}</a>
              </>
            ) : null}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export default Page;
