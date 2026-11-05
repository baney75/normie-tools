# How the Unit Converter works

Every unit is an exact fraction of one base unit. The script keeps whole-number fractions the whole way, so no float adds error. The only rounding is the last step: the answer is rounded half up to 6 significant digits.

## Exact definitions

Length (base: meter)

- 1 inch = 25.4 millimeters (the international inch, 1959).
- 1 foot = 12 inches. 1 yard = 3 feet. 1 mile = 5,280 feet = 1,609.344 meters.
- 1 centimeter = 10 millimeters. 1 meter = 1,000 millimeters. 1 kilometer = 1,000 meters.

Weight (base: kilogram)

- 1 pound = 0.45359237 kilograms (the international pound, 1959).
- 1 ounce = 1/16 pound. 1 gram = 1/1,000 kilogram.

Volume (base: liter)

- 1 US gallon = 231 cubic inches = 3.785411784 liters.
- 1 quart = 1/4 gallon. 1 pint = 1/8 gallon. 1 cup = 1/16 gallon. 1 US fluid ounce = 1/128 gallon.
- 1 tablespoon = 1/256 gallon. 1 teaspoon = 1/768 gallon (so 1 tablespoon = 3 teaspoons).
- 1 milliliter = 1/1,000 liter.

Speed (base: meter per second)

- 1 mile per hour = 1,609.344 meters per 3,600 seconds.
- 1 kilometer per hour = 1,000 meters per 3,600 seconds.

Temperature (through kelvin)

- 0 degrees Celsius = 273.15 kelvins. A change of 1 degree Celsius is a change of 1 kelvin.
- Fahrenheit = Celsius times 9/5 + 32. Celsius = (Fahrenheit - 32) times 5/9.
- Nothing is colder than 0 kelvins (-273.15 degrees Celsius, -459.67 degrees Fahrenheit).

## Rounding

6 significant digits, half up, once, at the end. Zeros before the first digit do not count. Examples: 1.609344 becomes 1.60934. 1,234,567 becomes 1,234,570. 0.000000621371 keeps its 6 digits: 6.21371 followed by the zeros in front.

## Sources

- International yard and pound agreement, 1959 (1 yard = 0.9144 meter, 1 pound = 0.45359237 kilogram).
- NIST Handbook 44, Appendix C: US gallon = 231 cubic inches, and the exact liquid measure parts.
- SI Brochure, 9th edition: the kelvin and the Celsius scale (0 degrees C = 273.15 K).

## Limits

The number may have up to 12 digits before the dot and 9 after. Length, weight, volume and speed need zero or more. Only temperature may be negative, down to absolute zero. This does not cover area, British (imperial) units, or other kinds of ounce. The word "ounce" means the weight ounce, and "US fluid ounce" means the volume one.
