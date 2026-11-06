// unit-converter: step 1, then the answer screen after converting 12 inches.
import { walk, fill } from "./_steps.mjs";
export default async (page, capture) => {
  const empty = await capture();
  await walk(page, [[], [fill("Number", "12")]]);
  return [{ name: "empty", cap: empty }, { name: "answer", cap: await capture() }];
};
