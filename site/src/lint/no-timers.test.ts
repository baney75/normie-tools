import { describe, expect, it } from "vitest";
import { findBanned } from "./noTimers";

const files = import.meta.glob("../**/*.{ts,tsx}", { query: "?raw", eager: true, import: "default" }) as Record<string, string>;

describe("findBanned", () => {
  it("finds each banned thing", () => {
    expect(findBanned("setTimeout(() => 1, 5)")).toEqual(["setTimeout"]);
    expect(findBanned("setInterval (f, 1)")).toEqual(["setInterval"]);
    expect(findBanned("requestAnimationFrame(f)")).toEqual(["requestAnimationFrame"]);
    expect(findBanned('<video autoPlay />')).toEqual(["autoplay"]);
    expect(findBanned("alert('x')")).toEqual(["alert"]);
    expect(findBanned("window.alert('x')")).toEqual(["alert"]);
    expect(findBanned("window.confirm('x')")).toEqual(["window.confirm"]);
  });

  it("leaves clean code alone", () => {
    expect(findBanned("const x = 1; onAlert(x); showAlert(2); const a = <p role='status' />;")).toEqual([]);
    expect(findBanned("clearTimeout is not a call here")).toEqual([]);
  });
});

describe("source files", () => {
  const sources = Object.entries(files).filter(([p]) => !/\.test\.tsx?$/.test(p) && !p.endsWith("/noTimers.ts"));

  it("finds source files to scan", () => {
    expect(sources.length).toBeGreaterThan(0);
  });

  it.each(sources)("%s has no timers, autoplay, alert or window.confirm", (path, text) => {
    expect({ path, found: findBanned(text) }).toEqual({ path, found: [] });
  });
});
