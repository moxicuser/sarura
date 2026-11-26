import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../../lib/auth";
import { cx } from "../../lib/cx";

type DashboardLink = {
  to: string;
  labelKey: string;
  end?: boolean;
};

export function DashboardLayout() {
  const { t } = useTranslation();
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const roleLabel =
    user.is_farmer && user.is_buyer
      ? t("dashboard.roleBoth")
      : user.is_farmer
        ? t("dashboard.roleFarmer")
        : t("dashboard.roleBuyer");

  const links: DashboardLink[] = [
    { to: "/dashboard", labelKey: "dashboard.nav.overview", end: true },
  ];
  if (user.is_farmer) {
    links.push({ to: "/dashboard/products", labelKey: "dashboard.nav.products" });
  }
  links.push({ to: "/dashboard/requests", labelKey: "dashboard.nav.requests" });
  links.push({ to: "/dashboard/orders", labelKey: "dashboard.nav.orders" });
  if (user.is_buyer) {
    links.push({ to: "/dashboard/saved", labelKey: "dashboard.nav.saved" });
  }
  links.push({ to: "/dashboard/messages", labelKey: "dashboard.nav.messages" });
  links.push({ to: "/dashboard/profile", labelKey: "dashboard.nav.profile" });

  return (
    <>
      <nav
        aria-label={t("dashboard.nav.label")}
        className="border-b border-sarura-border bg-white"
      >
        <div className="sarura-container">
          <p className="py-3 text-xs font-bold uppercase tracking-wide text-sarura-gray">
            {t("dashboard.nav.roleLabel")}: {roleLabel}
          </p>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3 sm:mx-0 sm:flex-wrap sm:px-0">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cx(
                    "shrink-0 rounded-full border px-3 py-2 text-sm font-semibold transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sarura-green",
                    isActive
                      ? "border-sarura-green bg-sarura-green text-white"
                      : "border-sarura-border bg-white text-sarura-ink hover:border-sarura-green hover:text-sarura-green-dark",
                  )
                }
              >
                {t(link.labelKey)}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
      <Outlet />
    </>
  );
}
