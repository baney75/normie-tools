import {
  CalendarCheck,
  Contact,
  FileText,
  FolderOpen,
  House,
  IdCard,
  ImageMinus,
  Mail,
  Mic,
  Pill,
  Receipt,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  ShoppingBasket,
  Sofa,
  Type,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { isUsable, type Tool } from "../data/tools";
import { ComingSoonBadge } from "./ComingSoonBadge";
import "./ToolGrid.css";

const ICONS: Record<string, LucideIcon> = {
  receipt: Receipt,
  "shield-check": ShieldCheck,
  "scan-line": ScanLine,
  "file-text": FileText,
  house: House,
  mail: Mail,
  type: Type,
  "id-card": IdCard,
  "image-minus": ImageMinus,
  "folder-open": FolderOpen,
  "calendar-check": CalendarCheck,
  contact: Contact,
  "shopping-basket": ShoppingBasket,
  pill: Pill,
  sofa: Sofa,
  mic: Mic,
  "shield-alert": ShieldAlert,
};

export function iconFor(name?: string): LucideIcon {
  return (name && ICONS[name]) || Wrench;
}

export type ToolGridProps = {
  tools: Tool[];
  onOpen?: (tool: Tool) => void;
};

function Card({ tool, onOpen }: { tool: Tool; onOpen?: (t: Tool) => void }) {
  const Icon = iconFor(tool.icon);
  const inner = (
    <>
      <Icon aria-hidden="true" focusable="false" size={24} />
      <span className="nt-card-name">{tool.name}</span>
      {!isUsable(tool) && <ComingSoonBadge />}
    </>
  );
  if (!isUsable(tool)) {
    return (
      <div className="nt-card nt-card-off" aria-disabled="true">
        {inner}
      </div>
    );
  }
  return (
    <a className="nt-card nt-card-on" href={`#/tools/${tool.id}`} onClick={() => onOpen?.(tool)}>
      {inner}
    </a>
  );
}

export function ToolGrid({ tools, onOpen }: ToolGridProps) {
  const groups: { name: string | null; items: Tool[] }[] = [];
  for (const t of tools) {
    const name = t.group ?? null;
    let g = groups.find((x) => x.name === name);
    if (!g) {
      g = { name, items: [] };
      groups.push(g);
    }
    g.items.push(t);
  }
  return (
    <div className="nt-grid-wrap">
      {groups.map((g) => {
        const headingId = g.name ? `nt-group-${g.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : undefined;
        return (
          <section key={g.name ?? "none"} aria-labelledby={headingId}>
            {g.name && (
              <h2 id={headingId} className="nt-grid-heading">
                {g.name}
              </h2>
            )}
            <ul className="nt-grid">
              {g.items.map((t) => (
                <li key={t.id}>
                  <Card tool={t} onOpen={onOpen} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
