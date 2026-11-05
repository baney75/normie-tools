// NT offline shell. Same-origin GET requests only. No timers.
// Cache Storage is shared by the whole origin, so the worker only ever touches names with this prefix.
const CACHE_PREFIX = "nt-shell-";
const CACHE = "nt-shell-v1";
const PRECACHE = [
  "./", "./index.html", "./manifest.webmanifest", "./tools.json", "./llms.txt",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./icons/favicon-32.png",
  "./splash/iphone-se-portrait.png", "./splash/iphone-15-portrait.png", "./splash/iphone-15-pro-max-portrait.png",
  "./splash/ipad-mini-portrait.png", "./splash/ipad-mini-landscape.png",
  "./splash/ipad-air-portrait.png", "./splash/ipad-air-landscape.png",
];
// Written by the build (vite build.manifest). Lists every script, style and font, including the
// lazy tool pages, so every shipped tool works offline after one visit.
const ASSET_MANIFEST = "./asset-manifest.json";

async function buildFiles() {
  try {
    const res = await fetch(ASSET_MANIFEST);
    if (!res.ok) return [];
    const m = await res.json();
    const files = new Set();
    for (const e of Object.values(m)) {
      if (e.file) files.add("./" + e.file);
      for (const f of e.css || []) files.add("./" + f);
      for (const f of e.assets || []) files.add("./" + f);
    }
    return [...files];
  } catch {
    return []; // dev server or a host without the list: files are still saved when first used
  }
}

async function precache() {
  const c = await caches.open(CACHE);
  await c.addAll(PRECACHE);
  await c.add(ASSET_MANIFEST).catch(() => {});
  const files = await buildFiles();
  // Best effort: one missing file must not stop the worker from installing.
  await Promise.all(files.map((f) => c.add(f).catch(() => {})));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    // Network first, so an update shows up. Fall back to the saved page offline.
    event.respondWith(fetch(req).catch(() => caches.match("./index.html", { ignoreVary: true })));
    return;
  }

  // Static files: saved copy first, saved on first visit.
  event.respondWith(
    caches.match(req, { ignoreVary: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    }),
  );
});
