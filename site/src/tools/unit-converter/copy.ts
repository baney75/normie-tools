// Every person-facing word on the Unit Converter page. Plain words, grade 6.
// It never gives advice. Page.test.tsx checks this file.
export const COPY = {
  title: "Unit Converter",
  question: "Change cups, inches, pounds and more",
  see: "See my answer",
  steps: {
    number: "Type the number",
    numberMissing: "Type a number first.",
  },
  waiting: "Type a number to see your answer.",
  kind: { label: "What are you measuring?" },
  from: { label: "From" },
  to: { label: "To" },
  value: { label: "Number" },
  swap: "Swap",
  fixFirst: "Fix the note above to see your answer.",
  resume: {
    title: "Use your last numbers?",
    body: "You typed numbers here before. They are saved on this phone or computer.",
    yes: "Use them",
    no: "No thanks",
  },
  result: {
    label: "Your answer",
    shown: "A long answer is rounded to 6 digits.",
  },
  more: {
    summary: "Show the facts used",
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
    sources: "Where the facts come from: a 1959 agreement between countries sets the inch and the pound. A US government book on weights and measures sets the US gallon. An international units brochure sets the kelvin.",
    rounding: "The math keeps every digit. Only the answer is rounded to 6 digits, with 5 going up.",
  },
  save: {
    title: "Answer to keep",
    fileName: "unit-answer.txt",
    preview: "Your answer, in one line.",
  },
  notes: {
    estimate: "The answer is rounded to 6 digits. Check the exact facts above if you need more.",
  },
  back: "Back to home",
} as const;
