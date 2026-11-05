// Finds what a file really is by looking at its bytes. The name is only a hint.

export type FileKind =
  | "pdf"
  | "png"
  | "jpeg"
  | "heic"
  | "gif"
  | "webp"
  | "zip"
  | "docx"
  | "xlsx"
  | "pptx"
  | "legacy-office"
  | "ofx"
  | "qfx"
  | "csv"
  | "text"
  | "empty"
  | "unknown";

export type Detected = {
  kind: FileKind;
  /** Plain words for the kind, as in "an Excel spreadsheet". */
  label: string;
  /** The kind the file name suggests, when it suggests one. */
  hintFromName?: FileKind;
  /** True when the name suggests a different kind than the bytes show. */
  mismatch: boolean;
  encrypted: boolean;
  damaged: boolean;
};

export type BlobLike = Blob & { name?: string };

export const KIND_LABELS: Record<FileKind, string> = {
  pdf: "a PDF",
  png: "a photo",
  jpeg: "a photo",
  heic: "an iPhone photo",
  gif: "a picture",
  webp: "a picture",
  zip: "a zipped folder",
  docx: "a Word document",
  xlsx: "an Excel spreadsheet",
  pptx: "a slide show",
  "legacy-office": "an older Office document",
  ofx: "a money-app file",
  qfx: "a money-app file (QFX)",
  csv: "a CSV",
  text: "a plain text file",
  empty: "an empty file",
  unknown: "a file NT does not know",
};

const HEAD_BYTES = 65536;
const TAIL_BYTES = 1024;
const ZIP_TAIL_BYTES = 65536 + 22;

const EXT_KIND: Record<string, FileKind> = {
  pdf: "pdf",
  png: "png",
  jpg: "jpeg",
  jpeg: "jpeg",
  heic: "heic",
  heif: "heic",
  gif: "gif",
  webp: "webp",
  zip: "zip",
  docx: "docx",
  xlsx: "xlsx",
  pptx: "pptx",
  doc: "legacy-office",
  xls: "legacy-office",
  ppt: "legacy-office",
  ofx: "ofx",
  qfx: "qfx",
  csv: "csv",
  txt: "text",
};

function readBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === "function") {
    return blob.arrayBuffer().then((b) => new Uint8Array(b));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

function ascii(bytes: Uint8Array, start = 0, end = bytes.length): string {
  let s = "";
  const stop = Math.min(end, bytes.length);
  for (let i = start; i < stop; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

function utf16le(text: string): string {
  let s = "";
  for (const ch of text) s += ch + "\u0000";
  return s;
}

function startsWith(bytes: Uint8Array, sig: number[], at = 0): boolean {
  if (bytes.length < at + sig.length) return false;
  return sig.every((b, i) => bytes[at + i] === b);
}

function extensionOf(name?: string): string | undefined {
  if (!name) return undefined;
  const m = /\.([A-Za-z0-9]+)$/.exec(name.trim());
  return m ? m[1].toLowerCase() : undefined;
}

function looksLikeText(bytes: Uint8Array): boolean {
  if (bytes.length === 0) return false;
  let ok = 0;
  for (const b of bytes) {
    if (b === 9 || b === 10 || b === 13 || (b >= 32 && b < 127) || b >= 128) ok++;
    else if (b === 0) return false;
  }
  return ok / bytes.length >= 0.95;
}

function countOutsideQuotes(line: string, delim: string): number {
  let inQuote = false;
  let n = 0;
  for (const ch of line) {
    if (ch === '"') inQuote = !inQuote;
    else if (ch === delim && !inQuote) n++;
  }
  return n;
}

function sniffCsv(text: string): boolean {
  const lines = text
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "")
    .slice(0, 6);
  if (lines.length < 2) return false;
  for (const delim of [",", ";", "\t"]) {
    const counts = lines.map((l) => countOutsideQuotes(l, delim));
    const first = counts[0];
    if (first < 1) continue;
    // The last line may be cut off, so judge on all but a possibly partial tail.
    const body = counts.slice(0, Math.max(2, counts.length - 1));
    if (!body.every((c) => c === first)) continue;
    const header = lines[0].split(delim);
    const hasWord = header.some((h) => /[A-Za-z]/.test(h));
    if (hasWord) return true;
  }
  return false;
}

function kindFromExt(ext?: string): FileKind | undefined {
  return ext ? EXT_KIND[ext] : undefined;
}

function isMismatch(hint: FileKind | undefined, kind: FileKind): boolean {
  if (!hint) return false;
  if (kind === "empty" || kind === "unknown") return false;
  if (hint === kind) return false;
  const pair = (a: FileKind, b: FileKind) =>
    (hint === a && kind === b) || (hint === b && kind === a);
  if (pair("ofx", "qfx")) return false;
  if (pair("csv", "text")) return false;
  if (hint === "text" && kind === "csv") return false;
  if (hint === "zip" && ["docx", "xlsx", "pptx"].includes(kind)) return false;
  if (["docx", "xlsx", "pptx"].includes(hint) && kind === "zip") return false;
  if (hint === "csv" && kind === "ofx") return false;
  return true;
}

type Core = { kind: FileKind; encrypted: boolean; damaged: boolean };

function detectCore(head: Uint8Array, tail: Uint8Array, size: number, ext?: string): Core {
  const out: Core = { kind: "unknown", encrypted: false, damaged: false };
  if (size === 0) return { ...out, kind: "empty" };

  if (startsWith(head, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    out.kind = "pdf";
    out.encrypted = ascii(head).includes("/Encrypt") || ascii(tail).includes("/Encrypt");
    out.damaged = !ascii(tail).includes("%%EOF");
    return out;
  }
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    out.kind = "png";
    out.damaged = !ascii(tail).includes("IEND");
    return out;
  }
  if (startsWith(head, [0xff, 0xd8, 0xff])) {
    out.kind = "jpeg";
    out.damaged = !(tail.length >= 2 && tail[tail.length - 2] === 0xff && tail[tail.length - 1] === 0xd9);
    return out;
  }
  if (ascii(head, 4, 8) === "ftyp") {
    const brand = ascii(head, 8, 12);
    if (["heic", "heix", "mif1", "hevc", "heim", "heis", "msf1"].includes(brand)) {
      out.kind = "heic";
      return out;
    }
  }
  if (ascii(head, 0, 6) === "GIF87a" || ascii(head, 0, 6) === "GIF89a") {
    out.kind = "gif";
    return out;
  }
  if (ascii(head, 0, 4) === "RIFF" && ascii(head, 8, 12) === "WEBP") {
    out.kind = "webp";
    return out;
  }
  if (startsWith(head, [0x50, 0x4b, 0x03, 0x04])) {
    const headText = ascii(head);
    const flags = head.length > 7 ? head[6] | (head[7] << 8) : 0;
    const ooxml = headText.includes("[Content_Types].xml");
    out.damaged = !ascii(tail).includes("PK\u0005\u0006");
    if (ooxml && headText.includes("word/")) out.kind = "docx";
    else if (ooxml && headText.includes("xl/")) out.kind = "xlsx";
    else if (ooxml && headText.includes("ppt/")) out.kind = "pptx";
    else out.kind = "zip";
    if (out.kind === "zip") out.encrypted = (flags & 1) === 1;
    return out;
  }
  if (startsWith(head, [0xd0, 0xcf, 0x11, 0xe0])) {
    out.kind = "legacy-office";
    const text = ascii(head);
    out.encrypted = text.includes("EncryptionInfo") || text.includes(utf16le("EncryptionInfo"));
    return out;
  }
  if (looksLikeText(head)) {
    const text = new TextDecoder("utf-8").decode(head.slice(0, 2048));
    if (text.includes("OFXHEADER") || text.includes("<OFX>")) {
      out.kind = ext === "qfx" ? "qfx" : "ofx";
      return out;
    }
    const full = new TextDecoder("utf-8").decode(head);
    out.kind = sniffCsv(full) ? "csv" : "text";
    return out;
  }
  return out;
}

export async function detectFileType(file: BlobLike): Promise<Detected> {
  const size = file.size;
  const ext = extensionOf(file.name);
  const hintFromName = kindFromExt(ext);
  const head = size === 0 ? new Uint8Array(0) : await readBytes(file.slice(0, HEAD_BYTES));
  const first4 = ascii(head, 0, 4);
  const tailLen = first4.startsWith("PK") ? ZIP_TAIL_BYTES : TAIL_BYTES;
  const tail = size === 0 ? head : await readBytes(file.slice(Math.max(0, size - tailLen)));
  const core = detectCore(head, tail, size, ext);
  const result: Detected = {
    kind: core.kind,
    label: KIND_LABELS[core.kind],
    mismatch: isMismatch(hintFromName, core.kind),
    encrypted: core.encrypted,
    damaged: core.damaged,
  };
  if (hintFromName) result.hintFromName = hintFromName;
  return result;
}
