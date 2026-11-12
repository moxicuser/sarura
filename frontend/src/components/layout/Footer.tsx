import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const marketplaceLinks = [
  { to: "/marketplace", labelKey: "footer.browse" },
  { to: "/sell", labelKey: "footer.sell" },
  { to: "/how-it-works", labelKey: "footer.howItWorks" },
] as const;

const companyLinks = [
  { to: "/about", labelKey: "footer.aboutUs" },
  { to: "/contact", labelKey: "footer.contact" },
] as const;

const legalLinks = [
  { to: "/privacy", labelKey: "footer.privacy" },
  { to: "/policies", labelKey: "footer.policies" },
] as const;

function FooterColumn({
  heading,
  links,
}: {
  heading: string;
  links: ReadonlyArray<{ to: string; labelKey: string }>;
}) {
  const { t } = useTranslation();

  return (
    <div>
      <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-white/55">{heading}</h2>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="text-sm text-white/85 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {t(link.labelKey)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 bg-sarura-green-dark text-white">
      <div className="sarura-container py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link
              to="/"
              className="text-xl font-extrabold tracking-[0.08em] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-sarura-green-dark"
            >
              {t("common.siteName")}
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/75">
              {t("footer.about")}
            </p>
            <p className="mt-5 text-sm text-white/70">
              {t("footer.location")}
              <br />
              {t("footer.languages")}
            </p>
          </div>

          <FooterColumn heading={t("footer.marketplaceHeading")} links={marketplaceLinks} />
          <FooterColumn heading={t("footer.companyHeading")} links={companyLinks} />
          <FooterColumn heading={t("footer.legalHeading")} links={legalLinks} />
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/15 pt-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {t("common.siteName")}. {t("footer.rights")}
          </p>
          <p>
            {t("footer.location")} · {t("footer.languages")}
          </p>
        </div>
      </div>
    </footer>
  );
}
