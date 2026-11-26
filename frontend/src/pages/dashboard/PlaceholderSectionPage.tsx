import { useTranslation } from "react-i18next";

import { PageIntro } from "../../components/layout/PageIntro";
import { EmptyState, StatusPill } from "../../components/ui";
import { useAuth } from "../../lib/auth";

export type PlaceholderSection = "requests" | "orders" | "messages";

export function PlaceholderSectionPage({ section }: { section: PlaceholderSection }) {
  const { t } = useTranslation();
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const titles = {
    requests: t("dashboard.sections.requestsTitle"),
    orders: t("dashboard.sections.ordersTitle"),
    messages: t("dashboard.sections.messagesTitle"),
  };

  const bodyKey =
    section === "requests"
      ? user.is_farmer && user.is_buyer
        ? "dashboard.sections.requestsBoth"
        : user.is_farmer
          ? "dashboard.sections.requestsFarmer"
          : "dashboard.sections.requestsBuyer"
      : section === "orders"
        ? "dashboard.sections.ordersBody"
        : "dashboard.sections.messagesBody";

  return (
    <>
      <PageIntro
        eyebrow={t("dashboard.eyebrow")}
        title={titles[section]}
        description={t(bodyKey)}
      />
      <section className="sarura-container py-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-5 flex justify-center">
            <StatusPill tone="pending">{t("dashboard.sections.comingStep")}</StatusPill>
          </div>
          <EmptyState
            title={t("dashboard.sections.placeholderTitle", {
              section: titles[section],
            })}
            message={t("dashboard.sections.placeholderBody")}
          />
        </div>
      </section>
    </>
  );
}
