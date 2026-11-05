import { Suspense } from "react";
import { ComingSoonBadge } from "../components/ComingSoonBadge";
import { PAGES } from "../copy/pages";
import { TOOLS } from "../data/tools";
import { href } from "../lib/hashRouter";
import { pageFor } from "../tools/registry";

// Ship gate: only a tool with status "shipped" may show a usable page.
// Everything else shows its name, the badge, and a way home. Never a form.
// A shipped tool shows its registered page (src/tools/registry.ts).
export function ToolPage({ id }: { id: string }) {
  const c = PAGES.tool;
  const tool = TOOLS.find((t) => t.id === id);
  if (!tool) {
    return (
      <>
        <h1>{c.notFound}</h1>
        <p><a href={href("/")}>{c.back}</a></p>
      </>
    );
  }
  if (tool.status !== "shipped") {
    return (
      <>
        <h1>{tool.name}</h1>
        <p><ComingSoonBadge /></p>
        <p>{c.notReady}</p>
        <p><a href={href("/")}>{c.back}</a></p>
      </>
    );
  }
  const Page = pageFor(tool.id);
  if (!Page) {
    // Shipped but no page registered yet: keep the old placeholder.
    return (
      <>
        <h1>{tool.name}</h1>
        <p>{c.shippedPlaceholder}</p>
      </>
    );
  }
  return (
    <>
      <Suspense fallback={<p role="status" className="nt-muted">{c.loading}</p>}>
        <Page />
      </Suspense>
      <p><a href={href("/")}>{c.back}</a></p>
    </>
  );
}
