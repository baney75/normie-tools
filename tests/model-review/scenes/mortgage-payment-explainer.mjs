// mortgage-payment-explainer: step 1, every later question screen, then the answer screen after walking the steps.
import { walk, fill, pick } from "./_steps.mjs";
export default async (page, capture) => {
  const empty = await capture();
  const steps = await walk(page, [[fill("Home price", "300000")], [fill("Down payment", "60000")], [fill("Yearly interest rate", "6.5")], [pick("30 years")]], capture);
  return [{ name: "empty", cap: empty }, ...steps, { name: "answer", cap: await capture() }];
};
