import { describe, expect, it } from "vitest";
import { COPY as loan } from "./loan-explainer/copy";
import { COPY as offer } from "./loan-offer-compare/copy";
import { COPY as mortgage } from "./mortgage-payment-explainer/copy";
import { COPY as student } from "./student-loan-growth-and-payoff/copy";
import { COPY as debt } from "./debt-payoff-planner/copy";
import { COPY as budget } from "./monthly-budget/copy";
import { COPY as savings } from "./savings-goal-tracker/copy";
import { COPY as units } from "./unit-converter/copy";

function placeholders(n: unknown, out: string[] = []): string[] {
  if (n && typeof n === "object") {
    for (const [k, v] of Object.entries(n)) {
      if (k === "placeholder" && typeof v === "string") out.push(v);
      else placeholders(v, out);
    }
  }
  return out;
}

describe("shipped calculators", () => {
  it("leave number boxes empty: no placeholder holds a digit", () => {
    for (const copy of [loan, offer, mortgage, student, debt, budget, savings, units]) {
      for (const p of placeholders(copy)) expect(p, p).not.toMatch(/\d/);
    }
  });
});
