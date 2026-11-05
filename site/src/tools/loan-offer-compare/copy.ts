// Every person-facing word on the Loan Offer Compare page. Plain words, grade 6.
// It states facts about the numbers typed. It never says which loan to take.
// It never works out an APR. Page.test.tsx checks this file.
export const COPY = {
  title: "Loan Offer Compare",
  intro: "Type the numbers from two loan offers. See them side by side.",
  empty: "Start with the amount, the yearly interest rate, and how long each loan lasts. Your answer shows up below.",
  offerName: "Offer",
  amount: { label: "Amount borrowed", hint: "The money you get, before any interest.", placeholder: "12,000" },
  rate: { label: "Yearly interest rate", hint: "A percent, like 6.5. Type 0 if there is none.", placeholder: "6.5" },
  term: {
    label: "How long is the loan?",
    hint: "A whole number.",
    placeholder: "36",
    unitLegend: "Count in",
    months: "Months",
    years: "Years",
  },
  fees: { label: "Upfront fees", hint: "Fees you pay at the start. Leave it empty if none.", placeholder: "0" },
  addThird: "Add a third offer",
  removeThird: "Remove the third offer",
  stillNeeded: "Still needed:",
  fixFirst: "Fix the note above to see your answer.",
  resume: {
    title: "Use your last numbers?",
    body: "You typed numbers here before. They were saved on your phone or computer.",
    yes: "Use them",
    no: "Start fresh",
  },
  facts: {
    lowestCost: "Lowest cost of borrowing",
    lowestPayment: "Lowest monthly payment",
    tieCost: "These offers tie on cost of borrowing.",
    tiePayment: "These offers tie on monthly payment.",
    oneCost: "This offer has the lowest cost of borrowing.",
    onePayment: "This offer has the lowest monthly payment.",
    differ: "These offers differ in amount or length. Their totals are for different loans.",
  },
  result: {
    paymentLabel: "monthly payment",
    paymentLine: "Each month for the whole loan.",
    lengthLabel: "Loan length",
    totalPaid: "Total paid",
    totalInterest: "Total interest",
    fees: "Upfront fees",
    cost: "Cost of borrowing",
    costHelp: "Interest plus upfront fees.",
  },
  more: {
    summary: "Show more",
    tableHeading: "All offers in one table",
    row: "What we compare",
  },
  key: {
    summary: "What the words mean",
    items: [
      { term: "Amount borrowed", means: "The money you get from the lender, before any interest." },
      { term: "Interest rate", means: "The yearly price of the loan, as a percent of what you owe." },
      { term: "Cost of borrowing", means: "All the interest you pay, plus the fees you pay at the start." },
    ],
  },
  save: {
    summary: "Save or print",
    title: "Your loan offers",
    fileName: "loan-offers.txt",
  },
  notes: {
    estimate: "This is an estimate from the numbers you typed. Your lender statement is the final word. This page helps you understand the numbers.",
    apr: "APR is the yearly cost of the loan, counting some fees. Your lender statement shows it. This tool does not work it out.",
    facts: "Lowest is a fact about the numbers on the page, not advice.",
  },
  back: "Back to home",
} as const;
