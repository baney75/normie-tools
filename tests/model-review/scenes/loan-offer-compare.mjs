// loan-offer-compare: step 1, every later question screen, then the answer screen after two real-looking offers for the same loan.
import { walk, fill } from "./_steps.mjs";
export default async (page, capture) => {
  const empty = await capture();
  const steps = await walk(page, [
    [fill("Offer 1: Amount borrowed", "12000"), fill("Offer 1: Yearly interest rate", "7.5")],
    [fill("Offer 1: How long is the loan?", "36"), fill("Offer 1: Upfront fees (optional)", "0")],
    [fill("Offer 2: Amount borrowed", "12000"), fill("Offer 2: Yearly interest rate", "6.9")],
    [fill("Offer 2: How long is the loan?", "36"), fill("Offer 2: Upfront fees (optional)", "400")],
  ], capture);
  return [{ name: "empty", cap: empty }, ...steps, { name: "answer", cap: await capture() }];
};
