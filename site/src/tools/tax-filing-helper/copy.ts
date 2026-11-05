// Every person-facing word on the Tax Filing Helper page. Plain words, grade 6.
// It is a practice on a made-up site. It never files, sends or gives tax advice.
// Facts come from plan/v5-work/form-filler-free-file.md and plan/PLATFORM-SOURCES.md. Page.test.tsx checks this file.
export const SOURCE_URL = "https://www.irs.gov/filing/irs-free-file-do-your-taxes-for-free";
export const START_URL = "https://www.irs.gov/freefile";

export const COPY = {
  title: "Tax Filing Helper",
  banner: "Practice site. Nothing here is real. Nothing is filed.",
  intro: "Practice copying answers into a free tax site, one screen at a time.",
  stepNames: ["Pick your way", "Your answer sheet", "Copy the answers in", "Check your answers"],
  back: "Back",
  next: "Next",
  nextScreen: "Next screen",
  toReview: "Next: the practice review page",
  resume: {
    title: "Pick up where you stopped?",
    body: "You were here before. Your practice was saved on your phone or computer.",
    yes: "Pick up",
    no: "Start fresh",
  },
  pick: {
    legend: "Which free way do you want to practice?",
    guided: {
      name: "Guided Free File",
      lines: [
        "Simple questions, one at a time. The software does the math.",
        "Free if you made $95,000 or less last season. Each company sets its own extra rules.",
        "Some companies do your state return for free. Some charge.",
      ],
    },
    fillable: {
      name: "Free File Fillable Forms",
      lines: [
        "Online copies of the IRS forms. You type into the boxes.",
        "Only some of the math is done for you.",
        "Works at any income. It does not do state taxes.",
      ],
    },
    closed: "Free File is closed right now. It opens again on IRS.gov in January 2027. Check IRS.gov for the income limit and the list of companies.",
    start: "Always start at IRS.gov. If you go straight to a tax company's own website, you won't get the free deal.",
    sourceLabel: "Source: IRS Free File, on IRS.gov",
  },
  who: {
    heading: "Who does what",
    note: "This is our plan. This practice shows only the answer sheet and the check.",
    helperHead: "NT does",
    youHead: "You do",
    rows: [
      ["Reads your papers and does the math", "Make your Free File account"],
      ["Makes the checklist and the screen-by-screen answer sheet", "Check every number on the review page"],
      ["Gives you the official IRS.gov link", "Sign with last year's income number or your 5-digit signing number"],
      ["Warns you about extra charges and fake sites", "Press Submit"],
      ["Saves your confirmation for you", "Pay any tax you owe, yourself"],
    ],
    never: "NT never presses Submit, signs for you, pays anything, or picks a paid add-on. It never asks for your Free File password.",
    sourceLabel: "Source: IRS Free File, on IRS.gov",
  },
  sheet: {
    heading: "Your answer sheet",
    lead: "These answers are made up. The person is Sample Person.",
    madeUp: "No real name, number or account is used here.",
    screenWord: "Practice screen",
  },
  copyIn: {
    heading: "Practice screen",
    of: "of",
    typeThis: "Type this",
    hint: "Type it in the practice box. A mix-up here changes nothing real.",
    undo: "Back goes to the screen before. Your typing stays.",
  },
  review: {
    heading: "The practice review page",
    resultLabel: "Practice check",
    youPicked: "You picked",
    notPicked: "You did not pick a way yet.",
    stop: "This is where you stop. You press Submit yourself, on the real IRS partner site.",
    tableCaption: "Your answers next to what you typed",
    sheetHead: "Answer sheet",
    typedHead: "You typed",
    fieldHead: "Box",
    resultHead: "Result",
    match: "Matches",
    different: "Different",
    missing: "Not typed",
    nothingTyped: "(nothing)",
    openReal: "Go to IRS.gov/freefile",
    openRealHelp: "That is the real site. It is closed now. Check IRS.gov for when it opens.",
    watch: {
      heading: "Watch out for these",
      items: [
        "Extra charges. Free File companies can't sell you extras on a free return. That includes add-on services, hidden fees, refund loans and audit protection. A company may still charge for a state return. If any screen asks for a card number, stop.",
        "Fake or look-alike sites. Only use the IRS.gov link. Don't click tax links in texts, emails or ads.",
        "Anyone asking for money to get your refund faster. That is not part of Free File.",
      ],
      sourceLabel: "Source: IRS Free File, on IRS.gov",
    },
  },
  save: {
    title: "Save or print your check",
    fileTitle: "Tax Filing Helper practice check",
    fileName: "tax-filing-practice-check.txt",
  },
  note: "This is a practice with made-up answers. It is not tax advice.",
} as const;
