// student-loan-growth-and-payoff: step 1, then the answer screen after walking the steps.
import { walk, fill } from "./_steps.mjs";
export default async (page, capture) => {
  const empty = await capture();
  await walk(page, [[fill("Loan balance", "20000")], [fill("Yearly interest rate", "5")], [fill("Monthly payment (optional)", "300")]]);
  return [{ name: "empty", cap: empty }, { name: "answer", cap: await capture() }];
};
