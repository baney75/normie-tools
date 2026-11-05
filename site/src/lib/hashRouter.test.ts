import { act, renderHook } from "@testing-library/react";
import { href, parseHash, pathFromHash, useHashRoute } from "./hashRouter";

describe("hashRouter", () => {
  it("defaults to home", () => {
    expect(pathFromHash("")).toBe("/");
    expect(parseHash("#/")).toEqual({ name: "home" });
  });
  it("parses known paths", () => {
    expect(parseHash("#/agents")).toEqual({ name: "agents" });
    expect(parseHash("#/install")).toEqual({ name: "install" });
    expect(parseHash("#/research")).toEqual({ name: "research" });
    expect(parseHash("#/tools/big-print")).toEqual({ name: "tool", id: "big-print" });
    expect(parseHash("#/agents/")).toEqual({ name: "agents" });
  });
  it("treats unknown paths as not found", () => {
    expect(parseHash("#/nope")).toEqual({ name: "notfound", path: "/nope" });
    expect(parseHash("#/tools/")).toMatchObject({ name: "notfound" });
    expect(parseHash("#/tools/a/b")).toMatchObject({ name: "notfound" });
  });
  it("builds hrefs", () => {
    expect(href("/agents")).toBe("#/agents");
  });
  it("follows hashchange", () => {
    window.location.hash = "";
    const { result } = renderHook(() => useHashRoute());
    expect(result.current.name).toBe("home");
    act(() => {
      window.location.hash = "#/install";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(result.current.name).toBe("install");
    window.location.hash = "";
  });
});
