// mortgage-payment-explainer: step 1, then the answer screen after walking the steps.
import { walk, fill, pick } from "./_steps.mjs";
export default async (page, capture) => {
  const empty = await capture();
  await walk(page, [[fill("Home price", "300000")], [fill("Down payment", "60000")], [fill("Yearly interest rate", "6.5")], [pick("30 years")]]);
  return [{ name: "empty", cap: empty }, { name: "answer", cap: await capture() }];
};
