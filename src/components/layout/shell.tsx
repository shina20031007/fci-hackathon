"use client";
import { Localized } from "@/lib/i18n/provider";

import { LanguageSelector, TranslationNotice } from "@/lib/i18n/provider";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  LayoutDashboard,
  Compass,
  GitBranch,
  MessagesSquare,
  Map,
  Navigation,
  PanelLeftClose,
  Info,
  ShieldCheck,
  Menu,
  X,
  ArrowUpRight,
  CircleDot,
} from "lucide-react";
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const id = pathname.match(/^\/projects\/([^/]+)/)?.[1];
  const projectLink = (module: string) =>
    id ? `/projects/${id}/${module}` : `/explore?next=${module}`;
  const items = [
    { label: "Overview", href: "/", icon: LayoutDashboard },
    { label: "Explore Decisions", href: "/explore", icon: Compass },
    { label: "Decision DNA", href: projectLink("decisions"), icon: GitBranch },
    {
      label: "Public Voice",
      href: projectLink("public-voice"),
      icon: MessagesSquare,
    },
    { label: "Impact Explorer", href: projectLink("impact"), icon: Map },
    {
      label: "Action Navigator",
      href: projectLink("participation"),
      icon: Navigation,
    },
  ];
  const current =
    pathname === "/admin"
      ? "Admin Portal"
      : pathname.startsWith("/studio")
        ? "Municipal Studio"
        : pathname.startsWith("/about")
          ? "About & Methodology"
          : (items.find((i) => i.href === pathname)?.label ??
            "Project workspace");
  return (
    <Localized>
      {
        <div className="app-shell">
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <button
            className="mobile-menu"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
          {open && (
            <button
              className="nav-overlay"
              aria-label="Close navigation overlay"
              onClick={() => setOpen(false)}
            />
          )}
          <aside className={`sidebar ${open ? "is-open" : ""}`}>
            <Link className="brand" href="/" onClick={() => setOpen(false)}>
              <span className="brand-mark">
                <GitBranch size={24} />
              </span>
              <span>
                CivicTrace<small>FROM POLICY TO PEOPLE</small>
              </span>
            </Link>
            <p className="nav-label">RESIDENT WORKSPACE</p>
            <nav aria-label="Main navigation">
              {items.map(({ label, href, icon: Icon }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`nav-link ${href === pathname ? "active" : ""}`}
                  aria-current={href === pathname ? "page" : undefined}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                  {href === pathname && <span className="active-dot" />}
                </Link>
              ))}
            </nav>
            <div className="nav-divider" />
            <p className="nav-label">REVIEW & RESOURCES</p>
            <nav aria-label="Resources">
              <Link
                className={`nav-link ${pathname === "/admin" ? "active" : ""}`}
                aria-current={pathname === "/admin" ? "page" : undefined}
                href="/admin"
                onClick={() => setOpen(false)}
              >
                <LayoutDashboard size={18} />
                Admin Portal
              </Link>
              <Link
                className={`nav-link ${pathname.startsWith("/studio") ? "active" : ""}`}
                href="/studio"
                onClick={() => setOpen(false)}
              >
                <ShieldCheck size={18} />
                Municipal Studio
              </Link>
              <Link
                className={`nav-link ${pathname === "/about" ? "active" : ""}`}
                href="/about"
                onClick={() => setOpen(false)}
              >
                <Info size={18} />
                About & Methodology
              </Link>
            </nav>
            <div className="sidebar-bottom">
              <div className="prototype-card">
                <CircleDot size={17} />
                <strong>Built for civic clarity.</strong>
                <p>
                  Every explanation has a trail.
                  <br />
                  Every source has a place.
                </p>
                <Link href="/about">
                  Our evidence approach <ArrowUpRight size={14} />
                </Link>
              </div>
              <div className="sidebar-foot">
                <span>FCI CIVIC HACK</span>
                <PanelLeftClose size={16} />
              </div>
            </div>
          </aside>
          <div className="main-shell">
            <header className="topbar">
              <div className="breadcrumb">
                Workspace <span>/</span> <strong>{current}</strong>
              </div>
              <div className="topbar-right">
                <LanguageSelector />
              </div>
            </header>
            <TranslationNotice />
            <main id="main-content" tabIndex={-1}>
              {children}
            </main>
            <footer className="app-footer">
              <span>CivicTrace · From Policy to People</span>
              <Link href="/about">
                Evidence, limitations & methodology <ArrowUpRight size={12} />
              </Link>
            </footer>
          </div>
        </div>
      }
    </Localized>
  );
}
