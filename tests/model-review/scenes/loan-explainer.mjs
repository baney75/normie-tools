// loan-explainer: step 1 is the screen a person first sees; the answer screen is reviewed after walking the steps.
import { walk, fill, pick } from "./_steps.mjs";
export default async (page, capture) => {
  const empty = await capture();
  await walk(page, [[fill("Amount borrowed", "12000")], [fill("Yearly interest rate", "6.5")], [pick("3 years")]]);
  return [{ name: "empty", cap: empty }, { name: "answer", cap: await capture() }];
};
