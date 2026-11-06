import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { SHARE_TOOLS, SITE, toolImage, toolUrl, type ShareTool } from "./src/copy/share";

// Link previews and search. The home page gets the site's title, description, share picture and structured data. The build
// also writes one small page per shipped tool (dist/tools/<id>/index.html): the same app, with that tool's own title,
// description and picture, so a shared tool link shows the tool, and search has one real address per tool. It opens the
// tool by setting the hash before the app starts. sitemap.xml lists the home page and every tool page.

const MARK = "<!-- share -->";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

type Head = { title: string; description: string; url: string; image: string; imageAlt: string; ld: object };

/** The tags for one page. Picture and page addresses are absolute, because link previews need them that way. */
export function shareTags(h: Head): string {
  const meta = (attr: "name" | "property", key: string, value: string) => `    <meta ${attr}="${key}" content="${esc(value)}" />`;
  return [
    `    <title>${esc(h.title)}</title>`,
    meta("name", "description", h.description),
    `    <link rel="canonical" href="${esc(h.url)}" />`,
    meta("property", "og:type", "website"),
    meta("property", "og:site_name", SITE.name),
    meta("property", "og:locale", "en_US"),
    meta("property", "og:title", h.title),
    meta("property", "og:description", h.description),
    meta("property", "og:url", h.url),
    meta("property", "og:image", h.image),
    meta("property", "og:image:type", "image/png"),
    meta("property", "og:image:width", "1200"),
    meta("property", "og:image:height", "630"),
    meta("property", "og:image:alt", h.imageAlt),
    meta("name", "twitter:card", "summary_large_image"),
    meta("name", "twitter:title", h.title),
    meta("name", "twitter:description", h.description),
    meta("name", "twitter:image", h.image),
    meta("name", "twitter:image:alt", h.imageAlt),
    `    <script type="application/ld+json">${JSON.stringify(h.ld).replace(/</g, "\\u003c")}</script>`,
  ].join("\n");
}

const free = { "@type": "Offer", price: "0", priceCurrency: "USD" };

export function siteHead(): Head {
  return {
    title: SITE.title,
    description: SITE.description,
    url: SITE.url,
    image: SITE.url + SITE.image,
    imageAlt: SITE.imageAlt,
    ld: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: SITE.name,
      alternateName: SITE.title,
      url: SITE.url,
      description: SITE.description,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires a web browser. Works offline after the first visit.",
      isAccessibleForFree: true,
      offers: free,
      inLanguage: "en-US",
      image: SITE.url + SITE.image,
    },
  };
}

export function toolHead(t: ShareTool): Head {
  const title = `${t.name}: ${t.question} | ${SITE.name}`;
  return {
    title,
    description: t.description,
    url: toolUrl(t.id),
    image: SITE.url + toolImage(t.id),
    imageAlt: `${t.name}. ${t.question} A phone shows a sample answer: ${t.sample.label}, ${t.sample.answer}.`,
    ld: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: t.name,
      url: toolUrl(t.id),
      description: t.description,
      applicationCategory: t.id === "unit-converter" ? "UtilitiesApplication" : "FinanceApplication",
      operatingSystem: "Any",
      isAccessibleForFree: true,
      offers: free,
      inLanguage: "en-US",
      image: SITE.url + toolImage(t.id),
      isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.url },
    },
  };
}

export function sitemap(): string {
  const urls = [SITE.url, ...SHARE_TOOLS.map((t) => toolUrl(t.id))];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((u) => `  <url><loc>${esc(u)}</loc></url>`),
    "</urlset>",
    "",
  ].join("\n");
}

/** A tool page: the built home page with the tool's tags in place of the site's, and the hash set before the app starts. */
export function toolPage(builtHome: string, t: ShareTool): string {
  const site = shareTags(siteHead());
  if (!builtHome.includes(site)) throw new Error("share-head: the built index.html has no site share tags to replace");
  const open = `    <script>if (!location.hash) history.replaceState(null, "", "#/tools/${t.id}");</script>`;
  return builtHome.replace(site, `${shareTags(toolHead(t))}\n${open}`);
}

export function shareHead(): Plugin {
  let outDir = "dist";
  return {
    name: "nt-share-head",
    configResolved(c) {
      outDir = path.resolve(c.root, c.build.outDir);
    },
    transformIndexHtml(html) {
      if (!html.includes(MARK)) throw new Error(`share-head: index.html needs a ${MARK} line in <head>`);
      return html.replace(`    ${MARK}`, shareTags(siteHead()));
    },
    writeBundle() {
      const home = fs.readFileSync(path.join(outDir, "index.html"), "utf8");
      for (const t of SHARE_TOOLS) {
        const dir = path.join(outDir, "tools", t.id);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, "index.html"), toolPage(home, t));
      }
      fs.writeFileSync(path.join(outDir, "sitemap.xml"), sitemap());
    },
  };
}
