// Model calls for the on-purpose test harnesses. Never imported by `npm test`.
// Claude runs in an empty temp folder with project-only settings, so no personal instructions leak in.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SYSTEM = "You are a careful assistant. Follow the user message only.";

export function askClaude(model, prompt, { system = SYSTEM, timeoutMs = 300000 } = {}) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "nt-model-"));
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = spawnSync(
      "claude",
      ["-p", "--model", model, "--tools", "", "--no-session-persistence", "--setting-sources", "project", "--disable-slash-commands", "--system-prompt", system],
      { input: prompt, encoding: "utf8", cwd, timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024 },
    );
    if (!r.error && r.status === 0 && r.stdout.trim()) {
      fs.rmSync(cwd, { recursive: true, force: true });
      return r.stdout.trim();
    }
  }
  fs.rmSync(cwd, { recursive: true, force: true });
  throw new Error(`claude ${model} returned nothing after 3 tries`);
}

export async function askOllama(model, prompt, { system = SYSTEM, host = process.env.OLLAMA_HOST || "http://127.0.0.1:11434" } = {}) {
  const url = host.startsWith("http") ? host : `http://${host}`;
  const res = await fetch(`${url}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      think: false,
      options: { temperature: 0, num_ctx: 8192 },
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`ollama ${model}: HTTP ${res.status}`);
  const data = await res.json();
  return String(data.message?.content ?? "").trim();
}

/** Pull the first JSON object out of a model reply. */
export function jsonIn(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}
