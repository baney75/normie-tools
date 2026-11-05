import fs from "node:fs";
import path from "node:path";

type Tool = { id: string; name: string; status: string; routes: string[] };

// Every tool with status "shipped" in public/tools.json. Read at test time, so a newly shipped tool is covered with no edit here.
export function shippedTools(): { id: string; name: string; hash: string }[] {
  const file = path.resolve(import.meta.dirname, "../public/tools.json");
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as { tools: Tool[] };
  return data.tools
    .filter((t) => t.status === "shipped")
    .map((t) => ({ id: t.id, name: t.name, hash: `#${t.routes[0]}` }));
}

/** True when the tool is shipped. A spec for a tool that went back to coming soon skips itself. */
export function isShipped(id: string): boolean {
  return shippedTools().some((t) => t.id === id);
}
