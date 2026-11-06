// loan-explainer: step 1 is the screen a person first sees; the answer screen is reviewed after walking the steps.
import { walk, fill, pick } from "./_steps.mjs";
export default async (page, capture) => {
  const empty = await capture();
  const steps = await walk(page, [[fill("Amount borrowed", "12000")], [fill("Yearly interest rate", "6.5")], [pick("3 years")]], capture);
  return [{ name: "empty", cap: empty }, ...steps, { name: "answer", cap: await capture() }];
};
