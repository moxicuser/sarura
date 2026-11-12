import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";

import { Footer } from "./Footer";
import { Header } from "./Header";

export function PublicLayout() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-sarura-green-dark focus:shadow-card"
      >
        {t("common.skipToContent")}
      </a>
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
