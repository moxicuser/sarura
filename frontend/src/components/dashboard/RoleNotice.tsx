import { useTranslation } from "react-i18next";

import { PageIntro } from "../layout/PageIntro";
import { EmptyState } from "../ui";

/** Shown when a dashboard section needs a role the account does not have. */
export function RoleNotice({ role }: { role: "farmer" | "buyer" }) {
  const { t } = useTranslation();

  return (
    <>
      <PageIntro
        eyebrow={t("dashboard.eyebrow")}
        title={t("dashboard.nav.overview")}
        description={t("dashboard.description")}
      />
      <div className="sarura-container py-8">
        <EmptyState
          title={t("dashboard.roleNoticeTitle")}
          message={t(
            role === "farmer"
              ? "dashboard.roleNoticeFarmer"
              : "dashboard.roleNoticeBuyer",
          )}
        />
      </div>
    </>
  );
}
