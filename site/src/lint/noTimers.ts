const BANNED: { name: string; re: RegExp }[] = [
  { name: "setTimeout", re: /\bsetTimeout\s*\(/ },
  { name: "setInterval", re: /\bsetInterval\s*\(/ },
  { name: "requestAnimationFrame", re: /\brequestAnimationFrame\s*\(/ },
  { name: "autoplay", re: /autoplay/i },
  { name: "alert", re: /(^|[^.\w])(window\.)?alert\s*\(/ },
  { name: "window.confirm", re: /\bwindow\.confirm\s*\(/ },
];

/** Returns the names of banned calls found in the source text. */
export function findBanned(source: string): string[] {
  return BANNED.filter((b) => b.re.test(source)).map((b) => b.name);
}
