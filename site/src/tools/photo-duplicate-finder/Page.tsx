import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PrivacyNote, ResultCard, StartOver, StepLabel } from "../../components/calc";
import { ScreenFrame } from "../../components/ScreenFrame";
import { UploadField } from "../../components/UploadField";
import { damaged, genericMessage, messageFor } from "../../copy/upload-messages";
import { detectFileType, type FileKind } from "../../lib/detectFileType";
import { findDuplicates, listText, planList, screenFiles } from "../../../../tools/photo-duplicate-finder/calc.mjs";
import { COPY } from "./copy";
import { readPhoto } from "./decode";
import "./Page.css";

type Photo = { id: string; key: string; name: string; size: number; sha256: string; dhash: string | null; url: string };
type Trouble = { id: string; name: string; gave: string; needs: string; explainer: string; text: string; href: string };
type Data = {
  photos: Photo[];
  notes: string[];
  troubles: Trouble[];
  keep: Record<string, string>;
  putBack: string[];
  view: 1 | 2 | 3;
  next: number;
};

const EMPTY: Data = { photos: [], notes: [], troubles: [], keep: {}, putBack: [], view: 1, next: 1 };
const PHOTO_KINDS = new Set<FileKind>(["jpeg", "png", "webp", "heic"]);
const ACCEPT = ".jpg,.jpeg,.png,.webp,.heic,image/jpeg,image/png,image/webp,image/heic";
const SHOW_TROUBLES = 3;


type Group = { id: string; kind: "exact" | "lookalike"; members: string[]; keepId: string };

export function Page() {
  const [data, setData] = useState<Data>(EMPTY);
  const [left, setLeft] = useState(0);
  const [saved, setSaved] = useState(false);
  const dataRef = useRef<Data>(EMPTY);
  const urls = useRef<string[]>([]);
  const alive = useRef(true);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const zone = useRef<HTMLDivElement>(null);

  const update = useCallback((fn: (d: Data) => Data) => {
    dataRef.current = fn(dataRef.current);
    setData(dataRef.current);
  }, []);
  const replace = useCallback((d: Data) => update(() => d), [update]);

  // Photo links live only while this page is open. They are let go when it closes.
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      for (const u of urls.current) {
        try {
          URL.revokeObjectURL(u);
        } catch {
          /* nothing to let go */
        }
      }
      urls.current = [];
    };
  }, []);

  const addFiles = useCallback(
    async (files: File[]) => {
      const screened = screenFiles(files.map((f) => ({ name: f.name, size: f.size })), dataRef.current.photos.length);
      const notes = screened.skipped.map((s: { message: string }) => s.message);
      const troubles: Trouble[] = [];
      const fresh: Photo[] = [];
      let already = 0;
      setLeft(screened.accepted.length);
      let n = 0;
      for (const index of screened.accepted) {
        const file = files[index];
        n++;
        const key = `${file.name}|${file.size}|${file.lastModified}`;
        if (dataRef.current.photos.some((p) => p.key === key) || fresh.some((p) => p.key === key)) {
          already++;
          continue;
        }
        const found = await detectFileType(file);
        const needed: FileKind = PHOTO_KINDS.has(found.kind) ? found.kind : "jpeg";
        const msg = messageFor({
          detected: found.kind,
          needed,
          name: file.name,
          sizeBytes: file.size,
          flags: { encrypted: found.encrypted, damaged: found.damaged, mismatch: found.mismatch },
        });
        let trouble: Trouble | null = null;
        if (!msg.accepted) {
          trouble = { id: `t${n}-${file.name}`, name: file.name, gave: msg.gave, needs: msg.needs, explainer: msg.explainer, text: msg.howTo.text, href: msg.howTo.href };
        }
        let read: Awaited<ReturnType<typeof readPhoto>> | null = null;
        if (!trouble) {
          try {
            read = await readPhoto(file);
          } catch {
            read = null;
          }
          if (!read || !read.opened) {
            const base = found.kind === "heic" ? genericMessage("heic", "jpeg") : damaged(needed);
            trouble =
              found.kind === "heic"
                ? { id: `t${n}-${file.name}`, name: file.name, gave: COPY.cantOpen.gave(file.name), needs: COPY.cantOpen.needs, explainer: COPY.cantOpen.explainer, text: base.howTo.text, href: base.howTo.href }
                : { id: `t${n}-${file.name}`, name: file.name, gave: COPY.cantOpen.damaged(file.name), needs: base.needs, explainer: base.explainer, text: base.howTo.text, href: base.howTo.href };
          }
        }
        if (trouble || !read) {
          if (trouble) troubles.push(trouble);
        } else {
          let url = "";
          try {
            url = URL.createObjectURL(file);
            urls.current.push(url);
          } catch {
            url = "";
          }
          fresh.push({ id: `p${dataRef.current.next + fresh.length}`, key, name: file.name, size: file.size, sha256: read.sha256, dhash: read.dhash, url });
        }
        if (!alive.current) return;
        setLeft(screened.accepted.length - n);
      }
      if (!alive.current) return;
      if (already > 0) notes.push(COPY.already(already));
      update((d) => ({ ...d, photos: [...d.photos, ...fresh], next: d.next + fresh.length, notes, troubles }));
      setLeft(0);
    },
    [update],
  );

  const pick = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      chain.current = chain.current.then(() => addFiles(files)).catch(() => undefined);
    },
    [addFiles],
  );

  // The shared picker takes one file at a time. Here it takes many, and every file goes through the same message table.
  useEffect(() => {
    const el = zone.current;
    const input = el?.querySelector<HTMLInputElement>('input[type="file"]');
    if (!el || !input) return;
    input.multiple = true;
    input.accept = ACCEPT;
    input.focus();
    const onChange = (e: Event) => {
      if (e.target !== input) return;
      e.stopPropagation();
      pick(Array.from(input.files ?? []));
      input.value = "";
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      pick(Array.from(e.dataTransfer?.files ?? []));
    };
    el.addEventListener("change", onChange, true);
    el.addEventListener("drop", onDrop, true);
    return () => {
      el.removeEventListener("change", onChange, true);
      el.removeEventListener("drop", onDrop, true);
    };
  }, [pick, data.view]);

  const chooseFiles = () => zone.current?.querySelector<HTMLInputElement>('input[type="file"]')?.click();

  const infos = useMemo(() => data.photos.map(({ id, name, size, sha256, dhash }) => ({ id, name, size, sha256, dhash })), [data.photos]);
  const found = useMemo(() => findDuplicates(infos), [infos]);
  const groups: Group[] = found.ok ? found.groups : [];
  const plan = useMemo(() => planList(groups, infos, { keep: data.keep, putBack: data.putBack }), [groups, infos, data.keep, data.putBack]);
  const byId = new Map(data.photos.map((p) => [p.id, p]));

  const go = (view: 1 | 2 | 3) => {
    setSaved(false);
    update((d) => ({ ...d, view }));
  };

  function save() {
    const text = listText(plan);
    try {
      const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = COPY.review.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* The list is also on the screen. */
    }
    setSaved(true);
  }

  const exactCount = found.ok ? found.counts.exactGroups : 0;
  const alikeCount = found.ok ? found.counts.lookAlikeGroups : 0;

  return (
    <ScreenFrame title={COPY.title} as="div" reserve="0">
      <div className="nt-pdf">
        <p className="nt-pdf-intro">{COPY.intro}</p>
        <PrivacyNote what="Photos" />

        {data.view === 1 ? (
          <>
            <StepLabel n={1} of={3}>{COPY.steps.one}</StepLabel>
            <div ref={zone}>
              <UploadField needed="jpeg" label={COPY.pick.label} onAccepted={() => undefined} />
            </div>
            <p className="nt-pdf-help">{COPY.pick.hint}</p>
            {data.photos.length > 0 ? (
              <section className="nt-pdf-picked" aria-label={COPY.pick.picked}>
                <p className="nt-pdf-trouble-head">{COPY.pick.picked}</p>
                <ul>
                  {data.photos.slice(0, 10).map((p) => (
                    <li key={p.id}>{p.name}</li>
                  ))}
                </ul>
                {data.photos.length > 10 ? <p className="nt-pdf-help">{COPY.pick.andMore(data.photos.length - 10)}</p> : null}
              </section>
            ) : null}
            {left > 0 ? <p role="status" className="nt-pdf-status">{`${COPY.pick.wait}: ${left} ${COPY.pick.left}`}</p> : null}
            <Troubles notes={data.notes} troubles={data.troubles} />
            <ResultCard
              label={COPY.pick.count}
              waiting={COPY.pick.waiting(data.photos.length)}
              closing={false}
              answer={data.photos.length > 1 ? String(data.photos.length) : undefined}
            >
            </ResultCard>
            <div className="nt-pdf-actions">
              <button type="button" className="primary nt-pdf-primary" onClick={() => (data.photos.length < 2 ? chooseFiles() : left > 0 ? undefined : go(2))}>
                {data.photos.length < 2 ? COPY.pick.choose : COPY.pick.next}
              </button>
            </div>
          </>
        ) : null}

        {data.view === 2 ? (
          <>
            <StepLabel n={2} of={3}>{COPY.steps.two}</StepLabel>
            <ResultCard
              label={COPY.groups.label}
              waiting={COPY.groups.waiting}
              closing={false}
              answer={groups.length > 0 ? String(groups.length) : undefined}
            >
              <p className="nt-pdf-help">{COPY.groups.summary(exactCount, alikeCount)}</p>
            </ResultCard>
            {groups.length === 0 ? <p className="nt-pdf-status">{COPY.groups.none}</p> : null}
            {groups.map((g, gi) => {
              const back = data.putBack.includes(g.id);
              const chosen = data.keep[g.id] && g.members.includes(data.keep[g.id]) ? data.keep[g.id] : g.keepId;
              const exact = g.kind === "exact";
              const titleId = `nt-pdf-${g.id}`;
              return (
                <section key={g.id} className="nt-pdf-group" aria-labelledby={titleId}>
                  <h2 id={titleId}>{`Group ${gi + 1} of ${groups.length}: ${exact ? COPY.groups.exactTitle : COPY.groups.alikeTitle}`}</h2>
                  <p className="nt-pdf-help">{exact ? COPY.groups.exactHelp : COPY.groups.alikeHelp}</p>
                  <ul className="nt-pdf-members">
                    {g.members.map((id) => {
                      const p = byId.get(id);
                      if (!p) return null;
                      const mine = id === chosen;
                      return (
                        <li key={id}>
                          <label className="nt-pdf-member">
                            <input
                              type="radio"
                              name={g.id}
                              checked={mine}
                              onChange={() => update((d) => ({ ...d, keep: { ...d.keep, [g.id]: id } }))}
                            />
                            {p.url ? <img className="nt-pdf-thumb" src={p.url} alt="" /> : null}
                            <span className="nt-pdf-name">
                              <span>{`${COPY.groups.keepOne} ${p.name}`}</span>
                              {back ? null : <span className={mine ? "nt-pdf-tag" : "nt-pdf-tag nt-pdf-tag-mark"}>{mine ? COPY.groups.kept : COPY.groups.marked}</span>}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  {back ? (
                    <p className="nt-pdf-help">
                      {COPY.groups.putBackHelp}{" "}
                      <button type="button" className="nt-pdf-btn" onClick={() => update((d) => ({ ...d, putBack: d.putBack.filter((x) => x !== g.id) }))}>
                        {COPY.groups.markAgain}
                      </button>
                    </p>
                  ) : (
                    <button type="button" className="nt-pdf-btn" onClick={() => update((d) => ({ ...d, putBack: [...d.putBack, g.id] }))}>
                      {COPY.groups.putBack}
                    </button>
                  )}
                </section>
              );
            })}
            <p className="nt-pdf-help">{COPY.groups.note}</p>
            {alikeCount > 0 ? <p className="nt-pdf-help">{COPY.groups.estimate}</p> : null}
            {found.ok && found.ignored.length > 0 ? <p className="nt-pdf-help">{COPY.groups.ignored}</p> : null}
            <div className="nt-pdf-actions">
              {groups.length === 0 ? (
                <button type="button" className="primary nt-pdf-primary" onClick={() => go(1)}>
                  {COPY.groups.pickMore}
                </button>
              ) : (
                <>
                  <button type="button" className="primary nt-pdf-primary" onClick={() => go(3)}>
                    {COPY.groups.next}
                  </button>
                  <button type="button" className="nt-pdf-btn" onClick={() => go(1)}>
                    {COPY.groups.back}
                  </button>
                </>
              )}
            </div>
          </>
        ) : null}

        {data.view === 3 ? (
          <>
            <StepLabel n={3} of={3}>{COPY.steps.three}</StepLabel>
            <p className="nt-pdf-what">{COPY.review.what}</p>
            <ResultCard
              label={COPY.review.label}
              waiting={COPY.review.empty}
              closing={false}
              answer={plan.count > 0 ? COPY.review.count(plan.count) : undefined}
            >
            </ResultCard>
            {plan.count > 0 ? (
              <section className="nt-pdf-list" aria-labelledby="nt-pdf-list-h">
                <h2 id="nt-pdf-list-h">{COPY.review.listHeading}</h2>
                <p className="nt-pdf-help">{COPY.review.preview}</p>
                <ul>
                  {plan.rows.map((r: { id: string; name: string; size: number }) => (
                    <li key={r.id}>{r.name}</li>
                  ))}
                </ul>
              </section>
            ) : null}
            {plan.count > 0 ? <p className="nt-pdf-help">{`${COPY.review.saveHelp} ${COPY.review.undo}`}</p> : null}
            {saved ? <p role="status" className="nt-pdf-status">{COPY.review.saved}</p> : null}
            <div className="nt-pdf-actions">
              {plan.count === 0 ? (
                <button type="button" className="primary nt-pdf-primary" onClick={() => go(2)}>
                  {COPY.review.back}
                </button>
              ) : (
                <>
                  <button type="button" className="primary nt-pdf-primary" onClick={save}>
                    {COPY.review.save}
                  </button>
                  <button type="button" className="nt-pdf-btn" onClick={() => go(2)}>
                    {COPY.review.back}
                  </button>
                </>
              )}
            </div>
          </>
        ) : null}

        <details className="nt-pdf-details">
          <summary>{COPY.more.summary}</summary>
          <div className="nt-pdf-details-body">
            <p>{COPY.more.how}</p>
            <p>{COPY.more.pick}</p>
          </div>
        </details>

        <StartOver flowId="photo-duplicate-finder" value={data} empty={EMPTY} onChange={replace} />
      </div>
    </ScreenFrame>
  );
}

function Troubles({ notes, troubles }: { notes: string[]; troubles: Trouble[] }) {
  if (notes.length === 0 && troubles.length === 0) return null;
  const shown = troubles.slice(0, SHOW_TROUBLES);
  const more = troubles.length - shown.length;
  return (
    <div role="status" className="nt-pdf-trouble">
      {notes.length > 0 ? <p className="nt-pdf-trouble-head">{COPY.skipNote}</p> : null}
      {notes.map((t) => (
        <p key={t}>{t}</p>
      ))}
      {shown.map((t) => (
        <div key={t.id} className="nt-pdf-trouble-item">
          <p className="nt-pdf-trouble-gave">{t.gave}</p>
          <p>{t.needs}</p>
          <p>{t.explainer}</p>
          <p>
            <a href={t.href}>{t.text}</a>
          </p>
        </div>
      ))}
      {more > 0 ? <p>{COPY.moreProblems(more)}</p> : null}
    </div>
  );
}

export default Page;
