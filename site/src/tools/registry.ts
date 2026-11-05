import { lazy, type ComponentType, type LazyExoticComponent } from "react";

// Tool id -> its page, loaded only when the person opens that tool.
// To add a tool: build site/src/tools/<id>/Page.tsx (default export) and add one line here.
export const REGISTRY: Record<string, LazyExoticComponent<ComponentType>> = {
  "loan-explainer": lazy(() => import("./loan-explainer/Page")),
  "loan-offer-compare": lazy(() => import("./loan-offer-compare/Page")),
  "mortgage-payment-explainer": lazy(() => import("./mortgage-payment-explainer/Page")),
  "student-loan-growth-and-payoff": lazy(() => import("./student-loan-growth-and-payoff/Page")),
  "debt-payoff-planner": lazy(() => import("./debt-payoff-planner/Page")),
  "monthly-budget": lazy(() => import("./monthly-budget/Page")),
  "savings-goal-tracker": lazy(() => import("./savings-goal-tracker/Page")),
  "unit-converter": lazy(() => import("./unit-converter/Page")),
  "form-filler": lazy(() => import("./form-filler/Page")),
  "morning-briefing": lazy(() => import("./morning-briefing/Page")),
  "photo-duplicate-finder": lazy(() => import("./photo-duplicate-finder/Page")),
  "save-me-money": lazy(() => import("./save-me-money/Page")),
  "tax-filing-helper": lazy(() => import("./tax-filing-helper/Page")),
};

export function pageFor(id: string): LazyExoticComponent<ComponentType> | undefined {
  return Object.prototype.hasOwnProperty.call(REGISTRY, id) ? REGISTRY[id] : undefined;
}
