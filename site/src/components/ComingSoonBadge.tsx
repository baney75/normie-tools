import { Clock } from "lucide-react";
import type { Tool } from "../data/tools";
import "./ComingSoonBadge.css";

/** A tool that has not shipped must show the badge. */
export const needsComingSoonBadge = (t: Pick<Tool, "status">): boolean => t.status !== "shipped";

export function ComingSoonBadge() {
  return (
    <span className="nt-badge-soon">
      <Clock aria-hidden="true" focusable="false" size={16} />
      <span>Coming soon</span>
    </span>
  );
}
