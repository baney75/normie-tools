import { useEffect, useState } from "react";

export type Route =
  | { name: "home" }
  | { name: "agents" }
  | { name: "install" }
  | { name: "research" }
  | { name: "harness" }
  | { name: "tool"; id: string }
  | { name: "notfound"; path: string };

/** "#/agents" becomes "/agents". An empty hash becomes "/". */
export function pathFromHash(hash: string): string {
  let p = hash.startsWith("#") ? hash.slice(1) : hash;
  const cut = p.search(/[?]/);
  if (cut >= 0) p = p.slice(0, cut);
  if (!p) return "/";
  if (!p.startsWith("/")) p = "/" + p;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

export function parseHash(hash: string): Route {
  const path = pathFromHash(hash);
  if (path === "/") return { name: "home" };
  if (path === "/agents") return { name: "agents" };
  if (path === "/install") return { name: "install" };
  if (path === "/research") return { name: "research" };
  if (path === "/harness") return { name: "harness" };
  const m = /^\/tools\/([A-Za-z0-9-]+)$/.exec(path);
  if (m) return { name: "tool", id: m[1] };
  return { name: "notfound", path };
}

/** Link target for a path. Works on any static host. */
export function href(path: string): string {
  return "#" + path;
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onChange);
    onChange();
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}
