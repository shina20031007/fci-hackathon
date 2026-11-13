"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LanguageSelector, useLanguage } from "@/lib/i18n/provider";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { MapPin, Menu, X, ArrowUpRight, ChevronDown } from "lucide-react";
import { SubscribeDialog } from "./subscribe-dialog";
export function NavigationDropdown({
  id,
  label,
  open,
  setOpen,
  active,
  children,
}: {
  id: string;
  label: string;
  open: string;
  setOpen: (id: string) => void;
  active?: boolean;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const expanded = open === id;
  useEffect(() => {
    if (!expanded) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen("");
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [expanded, setOpen]);
  return (
    <div
      ref={root}
      className="civic-dropdown"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen("");
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && expanded) {
          event.stopPropagation();
          setOpen("");
          trigger.current?.focus();
        }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          const focusItem = () => {
            const items = Array.from(
              root.current?.querySelectorAll<HTMLElement>(
                "[data-dropdown] a, [data-dropdown] button",
              ) ?? [],
            );
            const index = items.indexOf(document.activeElement as HTMLElement);
            const next =
              index < 0
                ? event.key === "ArrowDown"
                  ? 0
                  : items.length - 1
                : (index + (event.key === "ArrowDown" ? 1 : items.length - 1)) %
                  items.length;
            items[next]?.focus();
          };
          if (!expanded) {
            setOpen(id);
            requestAnimationFrame(focusItem);
          } else focusItem();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        className={active ? "is-active" : ""}
        aria-expanded={expanded}
        aria-controls={`${id}-options`}
        onClick={() => setOpen(expanded ? "" : id)}
      >
        {label}
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      <div
        id={`${id}-options`}
        data-dropdown
        className="civic-flyout"
        hidden={!expanded}
      >
        {children}
      </div>
    </div>
  );
}

function NavigationHeader() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [open, setOpen] = useState("");
  const [mobile, setMobile] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <header
      className="civic-header"
      onKeyDown={(event) => {
        if (event.key === "Escape" && mobile) {
          setOpen("");
          setMobile(false);
          trigger.current?.focus();
        }
      }}
    >
      <div className="civic-topline">
        <Link
          className="civic-brand"
          href="/"
          aria-label={`cityora. · ${t("Home")}`}
        >
          <span>
            <MapPin size={25} aria-hidden="true" />
          </span>
          cityora.
        </Link>
        <button
          ref={trigger}
          className="civic-mobile-toggle"
          aria-expanded={mobile}
          aria-controls="global-navigation"
          onClick={() => {
            setMobile(!mobile);
            setOpen("");
          }}
        >
          {mobile ? (
            <X size={20} aria-hidden="true" />
          ) : (
            <Menu size={20} aria-hidden="true" />
          )}
          {t(mobile ? "Close menu" : "Menu")}
        </button>
        <nav
          id="global-navigation"
          className="civic-global-nav"
          data-open={mobile}
          aria-label={t("Main navigation")}
          onClick={(event) => {
            if ((event.target as Element).closest("a")) {
              setOpen("");
              setMobile(false);
            }
          }}
        >
          <NavigationDropdown
            id="explore-navigation"
            label={t("Explore decisions")}
            open={open}
            setOpen={setOpen}
            active={
              pathname === "/explore" || pathname.startsWith("/projects/")
            }
          >
            <Link href="/explore">{t("All projects")}</Link>
            <Link href="/explore#municipality">
              {t("Find by municipality")}
            </Link>
            <Link href="/explore#category">{t("Find by category")}</Link>
          </NavigationDropdown>
          <Link
            href="/about"
            aria-current={pathname === "/about" ? "page" : undefined}
          >
            {t("About")}
          </Link>
          <SubscribeDialog />
          <div className="civic-language">
            <LanguageSelector compact />
          </div>
          <Link
            className="civic-admin"
            href="/admin"
            aria-current={pathname === "/admin" ? "page" : undefined}
          >
            {t("Staff Portal")}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  return (
    <div className="civic-shell">
      <a className="skip-link" href="#main-content">
        {t("Skip to content")}
      </a>
      <NavigationHeader key={pathname} />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <footer className="app-footer">
        <Link href="/" className="cityora-footer-brand" translate="no">
          cityora.
        </Link>
        <Link href="/about#sources-and-limitations">
          {t("Sources & limitations")}
        </Link>
      </footer>
    </div>
  );
}
