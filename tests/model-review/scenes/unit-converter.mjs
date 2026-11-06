// unit-converter: step 1, every later question screen, then the answer screen after converting 12 inches.
import { walk, fill } from "./_steps.mjs";
export default async (page, capture) => {
  const empty = await capture();
  const steps = await walk(page, [[], [fill("Number", "12")]], capture);
  return [{ name: "empty", cap: empty }, ...steps, { name: "answer", cap: await capture() }];
};
