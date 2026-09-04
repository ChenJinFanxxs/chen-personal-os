import Link from "next/link";
import type { ReactNode } from "react";
import { navItems } from "./os-data";

type OSShellProps = {
  active: string;
  kicker: string;
  title: string;
  description?: string;
  actions?: string[];
  actionSlot?: ReactNode;
  children: ReactNode;
};

export function OSShell({ active, kicker, title, description, actions = [], actionSlot, children }: OSShellProps) {
  return (
    <main className="shell">
      <div className="sidebar-hover-zone" aria-hidden="true" />
      <aside className="sidebar" aria-label="Personal OS navigation">
        <Link className="brand-block" href="/">
          <div className="brand-mark">C</div>
          <div>
            <p className="eyebrow">Warm Archive OS</p>
            <h1>Chen&apos;s Personal OS</h1>
          </div>
        </Link>

        <nav className="nav-list">
          {navItems.map((item) => (
            <Link className={item.key === active ? "nav-item active" : "nav-item"} href={item.href} key={item.key}>
              <span>{item.label}</span>
              <small>{item.key}</small>
            </Link>
          ))}
        </nav>
      </aside>

      <section className="workspace page-workspace">
        <header className="topbar page-topbar">
          <div>
            <p className="eyebrow">{kicker}</p>
            <h2>{title}</h2>
            {description ? <p className="page-description">{description}</p> : null}
          </div>
          {actionSlot ? actionSlot : actions.length ? (
            <div className="top-actions" aria-label="Page status">
              {actions.map((action) => <span key={action}>{action}</span>)}
            </div>
          ) : null}
        </header>
        {children}
      </section>
    </main>
  );
}




