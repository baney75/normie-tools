// The only part that touches the picture itself. It reads the bytes and a tiny gray grid.
// Nothing leaves this device. Tests replace this file with a stand-in.
import { dHashFromGray, grayFromRgba, GRID_H, GRID_W, sha256Hex } from "../../../../tools/photo-duplicate-finder/calc.mjs";

export type Read = { sha256: string; dhash: string | null; opened: boolean };

async function bytesOf(file: Blob): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === "function") return new Uint8Array(await file.arrayBuffer());
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(new Uint8Array(r.result as ArrayBuffer));
    r.onerror = () => reject(r.error);
    r.readAsArrayBuffer(file);
  });
}

/** The 9 by 8 gray grid, or null when this web page cannot open the picture. */
async function grayGrid(file: Blob): Promise<number[] | null> {
  try {
    if (typeof createImageBitmap !== "function") return null;
    const bmp = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = GRID_W;
    canvas.height = GRID_H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, 0, 0, GRID_W, GRID_H);
    if (typeof bmp.close === "function") bmp.close();
    return grayFromRgba(ctx.getImageData(0, 0, GRID_W, GRID_H).data);
  } catch {
    return null;
  }
}

export async function readPhoto(file: Blob): Promise<Read> {
  const sha256 = await sha256Hex(await bytesOf(file));
  const gray = await grayGrid(file);
  const dhash = gray ? dHashFromGray(gray) : null;
  return { sha256, dhash, opened: dhash !== null };
}
