import type { ReactNode } from "react";
import { PAGES } from "../copy/pages";
import { href } from "../lib/hashRouter";
import { Footer } from "./Footer";

export type ShellProps = {
  children: ReactNode;
  /** The "Where you are" side panel. Shown only when the container is wide. */
  aside?: ReactNode;
  /** Replaces the default footer content. */
  footer?: ReactNode;
  /** Tool pages use more width so the answer can sit beside the boxes. */
  wide?: boolean;
};

export function Shell({ children, aside, footer, wide = false }: ShellProps) {
  const base = import.meta.env.BASE_URL;
  return (
    <div className="nt-shell">
      <a
        className="nt-skip"
        href="#main"
        onClick={(e) => {
          // Hash links belong to the router, so move focus by hand.
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >{PAGES.shell.skip}</a>
      <header className="nt-header">
        <a href={href("/")} aria-label={PAGES.shell.homeLabel}>
          <img src={`${base}brand/nt-wordmark-light.svg`} alt="" width="143" height="32" />
        </a>
      </header>
      <main id="main" className="nt-main" tabIndex={-1}>
        <div className={wide ? "nt-layout nt-layout-wide" : "nt-layout"}>
          <div className={wide ? "nt-content nt-content-wide" : "nt-content"}>{children}</div>
          {aside ? <aside className="nt-aside" aria-label={PAGES.shell.asideLabel}>{aside}</aside> : null}
        </div>
      </main>
      <footer className="nt-footer">{footer ?? <Footer />}</footer>
    </div>
  );
}
