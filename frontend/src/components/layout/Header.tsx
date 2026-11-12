import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink } from "react-router-dom";

import { useAuth } from "../../lib/auth";
import { buttonStyles } from "../ui";
import { LanguageToggle } from "./LanguageToggle";

const mainLinks = [
  { to: "/marketplace", labelKey: "nav.marketplace" },
  { to: "/how-it-works", labelKey: "nav.howItWorks" },
  { to: "/sell", labelKey: "nav.sell" },
] as const;

const publicMenuLinks = [
  { to: "/", labelKey: "nav.home" },
  ...mainLinks,
  { to: "/about", labelKey: "nav.about" },
  { to: "/contact", labelKey: "nav.contact" },
  { to: "/privacy", labelKey: "nav.privacy" },
  { to: "/policies", labelKey: "nav.policies" },
] as const;

export function Header() {
  const { t } = useTranslation();
  const { user, status, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const signedIn = status === "authenticated" && user !== null;
  const menuLinks = signedIn
    ? [
        { to: "/", labelKey: "nav.home" },
        { to: "/dashboard", labelKey: "nav.dashboard" },
        ...publicMenuLinks.slice(1),
      ]
    : publicMenuLinks;

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const onLogout = async () => {
    closeMenu();
    await logout();
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-sarura-border bg-white/95 backdrop-blur">
        <div className="sarura-container flex min-h-16 items-center gap-3">
          <Link
            to="/"
            className="group flex shrink-0 flex-col leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sarura-green focus-visible:ring-offset-4"
            aria-label={t("common.siteName")}
          >
            <span className="text-xl font-extrabold tracking-[0.08em] text-sarura-green">
              {t("common.siteName")}
            </span>
            <span className="mt-1 hidden text-[11px] font-medium text-sarura-gray sm:block">
              {t("home.eyebrow")}
            </span>
          </Link>

          <nav aria-label={t("common.menuTitle")} className="ml-6 hidden items-center gap-6 lg:flex">
            {mainLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `text-sm font-semibold transition-colors ${
                    isActive
                      ? "text-sarura-green-dark"
                      : "text-sarura-gray hover:text-sarura-green-dark"
                  }`
                }
              >
                {t(link.labelKey)}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <LanguageToggle />
            <span aria-hidden="true" className="hidden h-6 w-px bg-sarura-border sm:block" />

            {status === "loading" && (
              <span className="sr-only" role="status">
                {t("common.loading")}
              </span>
            )}

            {signedIn && (
              <>
                <Link
                  to="/dashboard"
                  className="whitespace-nowrap rounded-lg px-2 py-2 text-sm font-semibold text-sarura-green-dark transition-colors hover:text-sarura-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sarura-green"
                >
                  {t("nav.dashboard")}
                </Link>
                <button
                  type="button"
                  onClick={() => void onLogout()}
                  className={buttonStyles({
                    variant: "secondary",
                    size: "sm",
                    className: "hidden sm:inline-flex",
                  })}
                >
                  {t("nav.logout")}
                </button>
              </>
            )}

            {status === "anonymous" && (
              <>
                <Link
                  to="/login"
                  className="whitespace-nowrap rounded-lg px-2 py-2 text-sm font-semibold text-sarura-gray transition-colors hover:text-sarura-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sarura-green"
                >
                  {t("nav.login")}
                </Link>
                <Link
                  to="/register"
                  className={buttonStyles({ size: "sm", className: "hidden sm:inline-flex" })}
                >
                  {t("nav.register")}
                </Link>
              </>
            )}

            <button
              type="button"
              aria-label={t("common.openMenu")}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen(true)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-sarura-border text-xl leading-none text-sarura-ink transition-colors hover:border-sarura-green hover:text-sarura-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sarura-green lg:hidden"
            >
              <span aria-hidden="true">☰</span>
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            role="presentation"
            onClick={closeMenu}
            className="absolute inset-0 bg-sarura-ink/40"
          />
          <div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label={t("common.menuTitle")}
            className="relative ml-auto flex h-full w-[min(22rem,88vw)] flex-col bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-sarura-border px-5 py-3">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-sarura-gray">
                {t("common.menuTitle")}
              </span>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeMenu}
                className="min-h-11 rounded-lg px-2 text-sm font-semibold text-sarura-gray hover:text-sarura-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sarura-green"
              >
                {t("common.closeMenu")}
              </button>
            </div>

            {signedIn && (
              <div className="border-b border-sarura-border px-5 py-4">
                <p className="text-sm font-bold text-sarura-ink">{user.full_name}</p>
                <p className="mt-1 text-xs text-sarura-gray">{user.email}</p>
              </div>
            )}

            <nav aria-label={t("common.menuTitle")} className="flex-1 overflow-y-auto px-3 py-4">
              {menuLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={closeMenu}
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-3 text-base font-semibold transition-colors ${
                      isActive
                        ? "bg-sarura-green-light text-sarura-green-dark"
                        : "text-sarura-ink hover:bg-sarura-page"
                    }`
                  }
                >
                  {t(link.labelKey)}
                </NavLink>
              ))}
            </nav>

            <div className="space-y-3 border-t border-sarura-border px-5 py-5">
              <div className="flex items-center justify-between gap-4 text-sm font-semibold text-sarura-gray">
                <span>{t("common.language")}</span>
                <LanguageToggle />
              </div>

              {signedIn ? (
                <button
                  type="button"
                  onClick={() => void onLogout()}
                  className={buttonStyles({ variant: "secondary", fullWidth: true })}
                >
                  {t("nav.logout")}
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={closeMenu}
                    className={buttonStyles({ variant: "secondary", fullWidth: true })}
                  >
                    {t("nav.login")}
                  </Link>
                  <Link
                    to="/register"
                    onClick={closeMenu}
                    className={buttonStyles({ fullWidth: true })}
                  >
                    {t("nav.register")}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
