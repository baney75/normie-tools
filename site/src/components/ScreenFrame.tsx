import type { ReactNode } from "react";
import { MoreMenu, type MoreItem } from "./MoreMenu";
import "./ScreenFrame.css";

export type PrimaryAction = { label: string; onClick?: () => void; href?: string };

export type ScreenFrameProps = {
  title: string;
  children?: ReactNode;
  primary?: PrimaryAction;
  more?: MoreItem[];
  reserve?: string;
  /** Use "div" when the page already sits inside the shell's main area. */
  as?: "main" | "div";
};

export function ScreenFrame({ title, children, primary, more, reserve = "12rem", as = "main" }: ScreenFrameProps) {
  const Root = as;
  return (
    <Root className="nt-frame">
      <h1 className="nt-frame-title">{title}</h1>
      <div className="nt-frame-body" style={{ minHeight: reserve }}>
        {children}
      </div>
      {primary || (more && more.length > 0) ? (
        <div className="nt-frame-actions">
          {primary ? (
            primary.href ? (
              <a className="nt-primary" href={primary.href} onClick={primary.onClick}>
                {primary.label}
              </a>
            ) : (
              <button type="button" className="nt-primary" onClick={primary.onClick}>
                {primary.label}
              </button>
            )
          ) : null}
          {more && more.length > 0 ? <MoreMenu items={more} /> : null}
        </div>
      ) : null}
    </Root>
  );
}
