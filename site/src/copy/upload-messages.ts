// One message table for every file mismatch. No tool writes its own text.
// Keyed by (detected kind, needed kind). A missing pair uses the generic template.
import { KIND_LABELS, type FileKind } from "../lib/detectFileType";

export type NeededKind = FileKind;

export type UploadMessage = {
  id: string;
  /** True when NT can read the file as it is. No problem to show. */
  accepted: boolean;
  /** Part 1: what NT found. */
  gave: string;
  /** Part 2: what this tool needs. */
  needs: string;
  /** Part 3: what that is, in one sentence. */
  explainer: string;
  /** One safe tap, preview first. */
  alternative?: { label: string; action: string; note?: string };
  /** Part 4: how to get it. */
  howTo: { text: string; href: string };
  /** Show "Try again". Only for empty and damaged files. */
  tryAgain: boolean;
  /** Show a password box that is used once and never kept. */
  askPassword: boolean;
};

export type MessageFlags = {
  encrypted?: boolean;
  damaged?: boolean;
  mismatch?: boolean;
  unknownLayout?: boolean;
  syncOn?: boolean;
};

export type MessageInput = {
  detected: FileKind;
  needed: NeededKind;
  name?: string;
  sizeBytes?: number;
  maxBytes?: number;
  flags?: MessageFlags;
};

/** Plain words for each kind, with the article. */
export const PLAIN_KINDS: Record<FileKind, string> = KIND_LABELS;

const EXPLAINERS: Partial<Record<FileKind, string>> = {
  csv: "A CSV is a simple spreadsheet file your bank can give you.",
  pdf: "A PDF is a file that looks the same on every screen.",
  xlsx: "An Excel spreadsheet is a grid of numbers and words.",
  docx: "A Word document is a file for letters and notes.",
  png: "A photo file is a picture from a camera.",
  jpeg: "A photo file is a picture from a camera.",
  heic: "An iPhone photo is a picture from an iPhone.",
  ofx: "A money-app file comes from a money app or your bank.",
  qfx: "A money-app file comes from a money app or your bank.",
  text: "A plain text file holds words and nothing else.",
};
const GENERIC_EXPLAINER = "That is the kind of file this step can read.";

const HELP = {
  bankCsv: { text: "How to download a CSV from your bank", href: "#/help/bank-csv" },
  savePdf: { text: "How to save a file as a PDF", href: "#/help/save-as-pdf" },
  getFile: { text: "How to get the right file", href: "#/help/get-the-file" },
  download: { text: "How to download it again", href: "#/help/download-again" },
  password: { text: "How to save a copy without a password", href: "#/help/remove-password" },
  computer: { text: "How to use NT on a computer", href: "#/help/use-on-computer" },
};

const NEEDED_TEXT = (needed: NeededKind) => PLAIN_KINDS[needed];
const explainerFor = (needed: NeededKind) => EXPLAINERS[needed] ?? GENERIC_EXPLAINER;

function howToFor(needed: NeededKind) {
  if (needed === "csv") return HELP.bankCsv;
  if (needed === "pdf") return HELP.savePdf;
  return HELP.getFile;
}

function base(id: string, needed: NeededKind, over: Partial<UploadMessage> & { gave: string }): UploadMessage {
  return {
    id,
    accepted: false,
    needs: `This tool needs ${NEEDED_TEXT(needed)}.`,
    explainer: explainerFor(needed),
    howTo: howToFor(needed),
    tryAgain: false,
    askPassword: false,
    ...over,
  };
}

type Ctx = { detected: FileKind; needed: NeededKind };
type Builder = (c: Ctx) => UploadMessage;

const READ_NOTE = "NT will show you what it found so you can check it.";

function readsDirectly(c: Ctx): UploadMessage {
  return base(`${c.detected}>${c.needed}`, c.needed, {
    accepted: true,
    gave: `This is ${PLAIN_KINDS[c.detected]}.`,
    needs: "NT can read it.",
    explainer: READ_NOTE,
  });
}

const TABLE: Record<string, Builder> = {};
const put = (d: FileKind, n: NeededKind, b: Builder) => {
  TABLE[`${d}>${n}`] = b;
};

// PDF where a CSV is needed.
put("pdf", "csv", (c) =>
  base("pdf>csv", c.needed, {
    gave: "This is a PDF bank statement.",
    needs: "This tool works best with a CSV.",
    explainer: "A CSV is a simple spreadsheet file from your bank.",
    alternative: {
      label: "Read my PDF statement instead",
      action: "read-pdf-statement",
      note: "NT will show you every line it found so you can check it.",
    },
  }),
);

// Photos where a document is needed.
for (const photo of ["jpeg", "png", "heic"] as const) {
  for (const need of ["pdf", "csv", "docx", "xlsx"] as const) {
    put(photo, need, (c) =>
      base(`${photo}>${need}`, c.needed, {
        gave: "This is a photo.",
        needs: "This tool needs the document as a PDF or a file from the website.",
        explainer: explainerFor(c.needed),
        alternative: {
          label: "Read the photo",
          action: "read-photo",
          note: "NT will show you what it read so you can check it.",
        },
      }),
    );
  }
}

// Files NT reads directly where a CSV is needed.
for (const k of ["xlsx", "qfx", "ofx", "csv", "text"] as const) put(k, "csv", readsDirectly);
for (const k of ["docx", "pptx", "legacy-office"] as const) {
  put(k, "csv", (c) => base(`${k}>csv`, c.needed, { gave: `This is ${PLAIN_KINDS[k]}.` }));
}

// Office files where a PDF is needed.
for (const k of ["docx", "xlsx", "pptx", "legacy-office"] as const) {
  put(k, "pdf", (c) =>
    base(`${k}>pdf`, c.needed, {
      gave: `This is ${PLAIN_KINDS[k]}.`,
      alternative: {
        label: "Turn it into a PDF",
        action: "convert-to-pdf",
        note: "NT will show you the PDF so you can check it.",
      },
    }),
  );
}

// Same kind: nothing to say.
for (const k of Object.keys(PLAIN_KINDS) as FileKind[]) {
  if (k === "empty" || k === "unknown") continue;
  put(k, k, readsDirectly);
}

export const MESSAGE_TABLE = TABLE;

/** True when NT can use this file as it is for the tool. */
export function canReadDirectly(detected: FileKind, needed: NeededKind): boolean {
  const b = TABLE[`${detected}>${needed}`];
  return b ? b({ detected, needed }).accepted : false;
}

export function formatSize(sizeBytes: number): string {
  const gb = sizeBytes / 1e9;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = sizeBytes / 1e6;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

export function tooBig(needed: NeededKind, sizeBytes: number, syncOn = false): UploadMessage {
  return base("too-big", needed, {
    gave: `This file is too big to work on this phone (${formatSize(sizeBytes)}).`,
    needs: "Try it on a computer or in the NT App.",
    explainer: "Big files need more room than a phone has.",
    alternative: syncOn ? { label: "Send to my computer", action: "send-to-computer" } : undefined,
    howTo: HELP.computer,
  });
}

export function empty(needed: NeededKind): UploadMessage {
  return base("empty", needed, {
    gave: "This file is empty.",
    needs: "It has nothing inside.",
    explainer: "Try downloading it again.",
    howTo: HELP.download,
    tryAgain: true,
  });
}

export function damaged(needed: NeededKind): UploadMessage {
  return base("damaged", needed, {
    gave: "This file looks damaged, so NT can't open it.",
    needs: "Try downloading it again from where you got it.",
    explainer: "A fresh copy often fixes this.",
    howTo: HELP.download,
    tryAgain: true,
  });
}

export function locked(needed: NeededKind): UploadMessage {
  return base("locked", needed, {
    gave: "This file is locked with a password.",
    needs: "Open it with its password and save a copy without one.",
    explainer: "Or type the password here. NT won't keep it.",
    howTo: HELP.password,
    askPassword: true,
  });
}

export function unknownType(needed: NeededKind): UploadMessage {
  return base("unknown", needed, {
    gave: "NT can't tell what kind of file this is.",
    explainer: explainerFor(needed),
  });
}

export function unknownLayout(needed: NeededKind): UploadMessage {
  return base("csv-unknown-layout", needed, {
    gave: "This is a CSV, but NT doesn't know this bank's layout yet.",
    needs: "Show NT which column is the date, the description, and the amount.",
    explainer: "NT will remember your picks next time.",
    alternative: { label: "Pick the columns", action: "pick-columns" },
    howTo: HELP.bankCsv,
  });
}

const DOCS: Record<string, { plain: string; what: string }> = {
  "w-2": { plain: "a W-2", what: "the form from an employer" },
  "1099": { plain: "a 1099", what: "the form for other income like gig work" },
  "1099-nec": { plain: "a 1099-NEC", what: "the form for work you did for pay" },
  "1099-k": { plain: "a 1099-K", what: "the form for card and app payments" },
  "bank-statement": { plain: "a bank statement", what: "the monthly list from your bank" },
};

const WRONG_DOC_ALTERNATIVES: Record<string, { label: string; action: string }> = {
  "w-2>1099": { label: "Use this W-2 in the wages step instead", action: "use-in-wages-step" },
};

export function wrongDocument(detectedDoc: string, neededDoc: string): UploadMessage {
  const d = DOCS[detectedDoc.toLowerCase()] ?? { plain: detectedDoc, what: "a different form" };
  const n = DOCS[neededDoc.toLowerCase()] ?? { plain: neededDoc, what: "a different form" };
  const alt = WRONG_DOC_ALTERNATIVES[`${detectedDoc.toLowerCase()}>${neededDoc.toLowerCase()}`];
  return {
    id: `wrong-document:${detectedDoc}>${neededDoc}`,
    accepted: false,
    gave: `This is ${d.plain}, ${d.what}.`,
    needs: `This step needs ${n.plain}, ${n.what}.`,
    explainer: `Look for mail or email marked ${n.plain.replace(/^an? /, "")}.`,
    alternative: alt,
    howTo: HELP.getFile,
    tryAgain: false,
    askPassword: false,
  };
}

function extOf(name?: string): string | undefined {
  const m = name ? /\.([A-Za-z0-9]+)$/.exec(name.trim()) : null;
  return m ? `.${m[1].toLowerCase()}` : undefined;
}

export function genericMessage(detected: FileKind, needed: NeededKind): UploadMessage {
  return base(`generic:${detected}>${needed}`, needed, {
    gave: `This is ${PLAIN_KINDS[detected]}.`,
    explainer: explainerFor(needed),
  });
}

export function messageFor(input: MessageInput): UploadMessage {
  const { detected, needed, name, sizeBytes, maxBytes } = input;
  const flags = input.flags ?? {};

  if (detected === "empty") return empty(needed);
  if (sizeBytes !== undefined && maxBytes !== undefined && sizeBytes > maxBytes) {
    return tooBig(needed, sizeBytes, flags.syncOn);
  }
  if (flags.encrypted) return locked(needed);
  if (flags.damaged) return damaged(needed);
  if (detected === "unknown") return unknownType(needed);

  if (detected === needed && needed === "csv" && flags.unknownLayout) return unknownLayout(needed);

  const entry = TABLE[`${detected}>${needed}`];
  const found = entry ? entry({ detected, needed }) : genericMessage(detected, needed);
  if (found.accepted) return found;

  const ext = extOf(name);
  if (flags.mismatch && ext) {
    return {
      ...found,
      id: `mismatch:${found.id}`,
      gave: `This file is named ${ext}, but it is really ${PLAIN_KINDS[detected]} inside.`,
    };
  }
  return found;
}

/** Every message NT can show, for tests and the copy check. */
export function allMessages(): UploadMessage[] {
  const out: UploadMessage[] = [];
  for (const [key, build] of Object.entries(TABLE)) {
    const [d, n] = key.split(">") as [FileKind, NeededKind];
    out.push(build({ detected: d, needed: n }));
  }
  out.push(
    empty("csv"),
    damaged("csv"),
    locked("pdf"),
    tooBig("pdf", 2_100_000_000, true),
    unknownType("csv"),
    unknownLayout("csv"),
    wrongDocument("w-2", "1099"),
    genericMessage("gif", "csv"),
    messageFor({ detected: "pdf", needed: "csv", name: "statement.csv", flags: { mismatch: true } }),
  );
  return out;
}
