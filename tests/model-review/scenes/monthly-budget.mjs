// monthly-budget: step 1, then the answer screen after real-looking numbers.
import { walk, fill } from "./_steps.mjs";
export default async (page, capture) => {
  const empty = await capture();
  await walk(page, [
    [fill("Pay, per month", "3000")],
    [fill("Rent or mortgage, per month", "1200"), fill("Food, per month", "450"), fill("Bills, per month", "300"), fill("Transport, per month", "250"), fill("Other, per month", "100")],
  ]);
  return [{ name: "empty", cap: empty }, { name: "answer", cap: await capture() }];
};
