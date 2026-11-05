import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearSaved, readSaved, useAutosave, writeSaved } from "./useAutosave";

afterEach(() => vi.restoreAllMocks());

describe("helpers", () => {
  it("round trips", () => {
    expect(writeSaved("f", 2, { a: 1 })).toBe(true);
    const got = readSaved<{ a: number }>("f");
    expect(got?.v).toBe(1);
    expect(got?.step).toBe(2);
    expect(got?.value).toEqual({ a: 1 });
    expect(new Date(got!.at).toISOString()).toBe(got!.at);
    clearSaved("f");
    expect(readSaved("f")).toBeNull();
  });

  it("ignores corrupt json and wrong version", () => {
    localStorage.setItem("nt:flow:f", "{nope");
    expect(readSaved("f")).toBeNull();
    localStorage.setItem("nt:flow:f", JSON.stringify({ v: 2, step: 1, value: 1, at: "x" }));
    expect(readSaved("f")).toBeNull();
    localStorage.setItem("nt:flow:f", "null");
    expect(readSaved("f")).toBeNull();
  });

  it("does not throw when storage throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(writeSaved("f", 0, 1)).toBe(false);
    expect(readSaved("f")).toBeNull();
    expect(() => clearSaved("f")).not.toThrow();
  });
});

describe("useAutosave", () => {
  it("saves synchronously on every change, with no network", () => {
    const f = vi.fn();
    const x = vi.fn();
    vi.stubGlobal("fetch", f);
    vi.stubGlobal("XMLHttpRequest", x);
    const { result } = renderHook(() => useAutosave("flow", { n: 0 }));
    expect(result.current.hasSaved).toBe(false);
    act(() => result.current.setValue({ n: 5 }));
    expect(readSaved<{ n: number }>("flow")?.value).toEqual({ n: 5 });
    act(() => result.current.setStep(3));
    expect(readSaved("flow")?.step).toBe(3);
    expect(readSaved<{ n: number }>("flow")?.value).toEqual({ n: 5 });
    expect(result.current.savedAt).toBeTypeOf("string");
    expect(f).not.toHaveBeenCalled();
    expect(x).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("keeps working in memory when storage throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const { result } = renderHook(() => useAutosave("flow", "a"));
    act(() => result.current.setValue("b"));
    expect(result.current.value).toBe("b");
    act(() => result.current.setStep(2));
    expect(result.current.step).toBe(2);
  });

  it("ignores corrupt saved data", () => {
    localStorage.setItem("nt:flow:flow", "{bad");
    const { result } = renderHook(() => useAutosave("flow", "a"));
    expect(result.current.hasSaved).toBe(false);
  });

  it("does not auto apply; restore applies; hasSaved stays true until then", () => {
    writeSaved("flow", 3, "old");
    const { result } = renderHook(() => useAutosave("flow", "fresh"));
    expect(result.current.hasSaved).toBe(true);
    expect(result.current.value).toBe("fresh");
    expect(result.current.step).toBe(0);
    expect(result.current.hasSaved).toBe(true);
    act(() => result.current.restore());
    expect(result.current.value).toBe("old");
    expect(result.current.step).toBe(3);
    expect(result.current.hasSaved).toBe(false);
  });

  it("clear removes the saved flow", () => {
    writeSaved("flow", 1, "old");
    const { result } = renderHook(() => useAutosave("flow", "fresh"));
    act(() => result.current.clear());
    expect(result.current.hasSaved).toBe(false);
    expect(readSaved("flow")).toBeNull();
    expect(result.current.value).toBe("fresh");
  });
});
