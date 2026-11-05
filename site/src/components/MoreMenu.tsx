import "./MoreMenu.css";

export type MoreItem = { label: string; onClick?: () => void; href?: string };

export type MoreMenuProps = { items: MoreItem[]; label?: string };

export function MoreMenu({ items, label = "More" }: MoreMenuProps) {
  if (items.length === 0) return null;
  return (
    <details className="nt-more">
      <summary>{label}</summary>
      <ul className="nt-more-list">
        {items.map((item) => (
          <li key={item.label}>
            {item.href ? (
              <a href={item.href}>{item.label}</a>
            ) : (
              <button type="button" onClick={item.onClick}>
                {item.label}
              </button>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
