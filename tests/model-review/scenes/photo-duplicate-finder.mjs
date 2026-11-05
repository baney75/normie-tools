// Photo Duplicate Finder: pick 2 identical and 1 different tiny PNGs, see the group, check the list.
import zlib from "node:zlib";

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const t = Buffer.concat([Buffer.from(type), data]);
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(t));
  return Buffer.concat([len, t, sum]);
};
// 32x32 grey picture. pixel(x, y) gives 0..255.
function png(pixel) {
  const w = 32, rows = [];
  for (let y = 0; y < w; y++) { const r = Buffer.alloc(w + 1); for (let x = 0; x < w; x++) r[x + 1] = pixel(x, y); rows.push(r); }
  const head = Buffer.alloc(13); head.writeUInt32BE(w, 0); head.writeUInt32BE(w, 4); head[8] = 8; head[9] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", head), chunk("IDAT", zlib.deflateSync(Buffer.concat(rows))), chunk("IEND", Buffer.alloc(0))]);
}

export default async (page, capture) => {
  const start = await capture();
  const left = png((x) => x * 8);
  const other = png((x, y) => (x < 16 === y < 16 ? 240 : 10));
  const file = (name, buffer) => ({ name, mimeType: "image/png", buffer });
  await page.locator('input[type="file"]').setInputFiles([file("beach-1.png", left), file("beach-2.png", left), file("garden.png", other)]);
  await page.getByText("Photos picked").waitFor();
  await page.locator("main").getByText("3", { exact: true }).first().waitFor();
  await page.waitForTimeout(150);
  const picked = await capture();
  await page.getByRole("button", { name: "Look for copies" }).click();
  await page.getByText("Group 1 of").first().waitFor();
  await page.getByRole("button", { name: "Review my list" }).click();
  await page.getByText("Files on your list").waitFor();
  await page.waitForTimeout(150);
  return [{ name: "start", cap: start }, { name: "picked", cap: picked }, { name: "list", cap: await capture() }];
};
