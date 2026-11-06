// Words for link previews and search results: the page title, the description under it, and the sample answer drawn on each
// share picture. Plain words, grade 6, like the rest of the copy. The vite build reads this file to write one page per tool
// (site/share-head.ts), and scripts/gen-share.mjs reads it to draw the share pictures.
// Every sample answer is what the tool really shows for the sample numbers. site/e2e/share.spec.ts walks each tool to check.

export const SITE = {
  name: "NT",
  url: "https://dbaney.com/nt/",
  title: "NT: small tools for everyday things",
  description:
    "Free, private tools for everyday money questions: loan and mortgage payments, loan offers, student loans, a monthly budget and a unit converter. No sign up.",
  /** The big words on the main share picture. */
  headline: "Small tools for everyday things.",
  /** The line under them. */
  promise: "Free. No sign up. Your numbers stay on your phone.",
  image: "og/nt.png",
  imageAlt: "NT: small tools for everyday things. A phone shows a loan payment worked out in plain words.",
} as const;

export type ShareTool = {
  id: string;
  name: string;
  /** The question the tool answers. It is the big line on the share picture. */
  question: string;
  description: string;
  /** Words the answer card shows for the sample numbers in scripts/gen-share.mjs: its label, the answer, and one more line. */
  sample: { label: string; answer: string; basis: string };
};

export const SHARE_TOOLS: ShareTool[] = [
  {
    id: "loan-explainer",
    name: "Loan Explainer",
    question: "What will my loan cost?",
    description: "See your monthly payment, the total interest and what a loan costs in all. Free, no sign up, and your numbers stay on your phone.",
    sample: { label: "Monthly payment", answer: "$367.79", basis: "For $12,000 at 6.5% for 3 years." },
  },
  {
    id: "mortgage-payment-explainer",
    name: "Mortgage Payment Explainer",
    question: "What will my house payment be?",
    description: "See your monthly house payment from the price, the down payment, the rate and the loan length. Free, no sign up, and private.",
    sample: { label: "Total monthly payment", answer: "$1,516.96", basis: "For a $300,000 home, $60,000 down, at 6.5% for 30 years." },
  },
  {
    id: "student-loan-growth-and-payoff",
    name: "Student Loan Growth and Payoff",
    question: "When will my student loan be paid off?",
    description: "See when your student loan will be paid off and how much interest it adds. Free, no sign up, and your numbers stay on your phone.",
    sample: { label: "Paid off in", answer: "6 years, 7 months", basis: "For $20,000 at 5%." },
  },
  {
    id: "loan-offer-compare",
    name: "Loan Offer Compare",
    question: "Which loan offer costs less to borrow?",
    description: "Put two or three loan offers side by side and see which one costs less in interest and fees. Free, no sign up, and private.",
    sample: { label: "Costs less to borrow", answer: "Offer 1", basis: "$281.26 less in interest and fees." },
  },
  {
    id: "monthly-budget",
    name: "Monthly Budget",
    question: "Where does my money go each month?",
    description: "Add the money that comes in and the money that goes out, and see what is left each month. Free, no sign up, and private.",
    sample: { label: "Left over each month", answer: "$800.00", basis: "This is money in that is not spent." },
  },
  {
    id: "unit-converter",
    name: "Unit Converter",
    question: "Change cups, inches, pounds and more",
    description: "Change cups, inches, pounds, miles and more. One thing at a time, in plain words. Free, no sign up, and it works offline.",
    sample: { label: "Your answer", answer: "304.8 millimeters", basis: "A long answer is rounded to 6 digits." },
  },
];

/** The page address for one tool, like https://dbaney.com/nt/tools/loan-explainer/ */
export const toolUrl = (id: string) => `${SITE.url}tools/${id}/`;
export const toolImage = (id: string) => `og/${id}.png`;
