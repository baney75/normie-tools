// Every person-facing word on the Unit Converter page. Plain words, grade 6.
// It never gives advice. Page.test.tsx checks this file.
export const COPY = {
  title: "Unit Converter",
  intro: "Pick what you are measuring. Type a number. See it in another measure.",
  empty: "Type a number in the box. Your answer shows up below.",
  kind: { label: "What are you measuring?" },
  from: { label: "Change from" },
  to: { label: "Change to" },
  value: { label: "Number", hint: "Like 12 or 3.5. Commas are fine.", placeholder: "12" },
  swap: "Swap the two",
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
    heading: "Exact facts behind the answers",
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
    sources: "These come from the 1959 agreement on the inch and the pound, the NIST handbook for the US gallon, and the SI brochure for the kelvin.",
    rounding: "The math keeps every digit. Only the answer is rounded, to 6 digits, with 5 going up.",
  },
  save: {
    summary: "Save or print",
    title: "Answer to keep",
    fileName: "unit-answer.txt",
  },
  notes: {
    estimate: "The answer is rounded to 6 digits. Check the exact facts above if you need more.",
  },
  back: "Back to home",
} as const;
