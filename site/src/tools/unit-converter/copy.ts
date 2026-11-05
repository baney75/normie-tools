// Every person-facing word on the Unit Converter page. Plain words, grade 6.
// It never gives advice. Page.test.tsx checks this file.
export const COPY = {
  title: "Unit Converter",
  intro: "Pick what you are measuring. Type a number. See it in another measure.",
  step1: "Pick units and type a number",
  step2: "Step 2 of 2: Read your answer",
  waiting: "Your answer shows here",
  empty: "Type a number in the box. Your answer shows up below.",
  kind: { label: "What are you measuring?" },
  from: { label: "Change from" },
  to: { label: "Change to" },
  value: { label: "Number", hint: "Like 12 or 3.5. Commas are fine.", placeholder: "12" },
  swap: "Swap the two",
  swapped: "Swapped. Tap Swap again to undo.",
  stillNeeded: "Still needed:",
  fixFirst: "Fix the note above to see your answer.",
  resume: {
    title: "Use your last numbers?",
    body: "You typed numbers here before. They were saved on your phone or computer.",
    yes: "Use them",
    no: "Start fresh",
  },
  result: {
    label: "Your answer",
    shown: "Shown to 6 digits.",
  },
  more: {
    summary: "Show more",
    items: [
      "1 inch is exactly 25.4 millimeters.",
      "1 foot is 12 inches. 1 yard is 3 feet. 1 mile is 5,280 feet.",
      "1 pound is exactly 0.45359237 kilograms. 1 ounce is one sixteenth of a pound.",
      "1 US gallon is exactly 3.785411784 liters.",
      "1 quart is one fourth of a gallon. 1 pint is one eighth. 1 cup is one sixteenth.",
      "1 US fluid ounce is one 128th of a gallon. 1 tablespoon is one 256th. 1 teaspoon is one 768th.",
      "0 degrees Celsius is 273.15 kelvins. Fahrenheit is Celsius times 9/5, plus 32.",
      "1 mile per hour is 1.609344 kilometers per hour.",
    ],
    sources: "Where the facts come from: the inch and pound use the 1959 agreement between countries. The US gallon uses a US government weights and measures book (NIST Handbook 44). The kelvin uses the international units brochure.",
    rounding: "The math keeps every digit. Only the answer is rounded, to 6 digits, with 5 going up.",
  },
  save: {
    summary: "Keep your answer if you want",
    title: "Answer to keep",
    fileName: "unit-answer.txt",
    preview: "Your answer above, on paper or saved on this phone or computer.",
  },
  notes: {
    estimate: "The answer is rounded to 6 digits. Check the exact facts above if you need more.",
  },
  back: "Back to home",
} as const;
