// Every person-facing word on the Tax Filing Helper page. Plain words, grade 6.
// It is a practice on a made-up site. It never files, sends or gives tax advice.
// Facts come from plan/v5-work/form-filler-free-file.md and plan/PLATFORM-SOURCES.md. Page.test.tsx checks this file.
export const SOURCE_URL = "https://www.irs.gov/filing/irs-free-file-do-your-taxes-for-free";
export const START_URL = "https://www.irs.gov/freefile";

export const COPY = {
  title: "Tax Filing Helper",
  banner: "Practice only. Use the made-up answers shown. Nothing is filed.",
  intro: "Practice copying answers into a free tax site.",
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
    legend: "Pick one way to practice, then press Next.",
    guided: {
      name: "Guided Free File",
      lines: ["Easier. Simple questions, one at a time. Free if you made $95,000 or less last season."],
    },
    fillable: {
      name: "Free File Fillable Forms",
      lines: ["More work. You type into online copies of IRS forms. Free at any income."],
    },
    closed: "Free File opens again in January 2027. This practice works now.",
    start: "Always start at IRS.gov/freefile, not a company's own site.",
    sourceLabel: "Source: IRS Free File page",
  },
  who: {
    heading: "Who does what",
    note: "On the real site, you do your jobs yourself. This practice does its jobs for you.",
    helperHead: "This practice does",
    youHead: "You do",
    rows: [
      ["Shows a made-up answer sheet", "Make your Free File account"],
      ["Shows one practice screen at a time", "Check every number on the review page"],
      ["Checks what you typed against the sheet", "Sign with last year's income number or a 5-digit code"],
      ["Warns you about extra charges and fake sites", "Press Submit"],
      ["Stops at the review page", "Pay any tax you owe, yourself"],
    ],
    never: "This practice never presses Submit, signs for you, pays anything, or picks a paid add-on. It never asks for your Free File password.",
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
    hint: "The boxes start empty. Type the sample answers shown. They are made up.",
    undo: "Back goes to the screen before. Your typing stays.",
  },
  review: {
    heading: "The practice review page",
    resultLabel: "Practice check",
    youPicked: "You picked",
    notPicked: "You did not pick a way yet.",
    stop: "You stop here. The real filing is on IRS.gov when Free File opens. You can keep a copy of this check.",
    submit: "You press Submit yourself, on the free filing site you pick on IRS.gov.",
    tableCaption: "Your answers next to what you typed",
    sheetHead: "Answer sheet",
    typedHead: "You typed",
    fieldHead: "Box",
    resultHead: "Result",
    match: "Matches",
    different: "Different",
    missing: "Not typed",
    nothingTyped: "(nothing)",
    watch: {
      heading: "Watch out for these",
      extras: "Extra charges. Free File companies can't sell you extras on a free return, such as:",
      extraItems: [
        "add-on services",
        "hidden fees",
        "refund loans (money lent against your refund)",
        "audit protection (paid help if the IRS checks you)",
      ],
      extrasEnd: "A company may still charge for a state return. If any screen asks for a card number, stop.",
      items: [
        "Fake or look-alike sites. Only use the IRS.gov link. Don't click tax links in texts, emails or ads.",
        "Anyone asking for money to get your refund faster. That is not part of Free File.",
      ],
        sourceLabel: "Source: IRS Free File page",
    },
  },
  save: {
    title: "Save or print your check",
    fileTitle: "Tax Filing Helper practice check",
    fileName: "tax-filing-practice-check.txt",
  },
  note: "This is a practice with made-up answers. It is not tax advice.",
} as const;
