import {
  CalendarCheck,
  ChevronRight,
  Contact,
  CreditCard,
  FileText,
  FolderOpen,
  GraduationCap,
  House,
  IdCard,
  ImageMinus,
  Mail,
  Mic,
  Pill,
  Receipt,
  Ruler,
  Scale,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  ShoppingBasket,
  Sofa,
  Type,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { isUsable, type Tool } from "../data/tools";
import { href } from "../lib/hashRouter";
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
  wallet: Wallet,
  "credit-card": CreditCard,
  scale: Scale,
  "graduation-cap": GraduationCap,
  ruler: Ruler,
};

export function iconFor(name?: string): LucideIcon {
  return (name && ICONS[name]) || Wrench;
}

export type ToolGridProps = {
  tools: Tool[];
  onOpen?: (tool: Tool) => void;
};

function Row({ tool, onOpen }: { tool: Tool; onOpen?: (t: Tool) => void }) {
  if (!isUsable(tool)) {
    return (
      <a className="nt-row nt-row-off" href={href("/coming")}>
        <span className="nt-row-text">
          <span className="nt-row-title">{tool.name}</span>
          <span className="nt-row-sub">Not ready yet</span>
        </span>
      </a>
    );
  }
  const Icon = iconFor(tool.icon);
  return (
    <a className="nt-row nt-row-on" href={`#/tools/${tool.id}`} onClick={() => onOpen?.(tool)}>
      <span className="nt-row-icon">
        <Icon aria-hidden="true" focusable="false" size={24} />
      </span>
      <span className="nt-row-text">
        <span className="nt-row-title">{tool.question || tool.name}</span>
        {tool.question ? <span className="nt-row-sub">{tool.name}</span> : null}
      </span>
      <ChevronRight className="nt-row-arrow" aria-hidden="true" focusable="false" size={20} />
    </a>
  );
}

/** Tools as a plain list of rows. Ready tools first, each one link. */
export function ToolGrid({ tools, onOpen }: ToolGridProps) {
  const sorted = [...tools.filter(isUsable), ...tools.filter((t) => !isUsable(t))];
  return (
    <ul className="nt-rows">
      {sorted.map((t) => (
        <li key={t.id}>
          <Row tool={t} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}
