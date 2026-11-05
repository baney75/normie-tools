export type Size = { name: string; width: number; height: number };

// The device matrix from docs/design-from-research.md. Names double as screenshot file names.
export const VIEWPORTS: Size[] = [
  { name: "iphone-se", width: 375, height: 667 },
  { name: "iphone-15", width: 393, height: 852 },
  { name: "iphone-15-pro-max", width: 430, height: 932 },
  { name: "ipad-mini", width: 744, height: 1133 },
  { name: "ipad-air-portrait", width: 820, height: 1180 },
  { name: "ipad-air-landscape", width: 1180, height: 820 },
  { name: "split-view-third", width: 320, height: 820 },
  { name: "desktop-1280", width: 1280, height: 800 },
  { name: "desktop-1920", width: 1920, height: 1080 },
];

export const PHONE: Size = { name: "phone-390", width: 390, height: 844 };
