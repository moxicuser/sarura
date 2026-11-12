import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";

import { AuthShell } from "../components/auth/AuthShell";
import { FormAlert } from "../components/auth/FormAlert";
import { LoadingState } from "../components/ui";
import { apiPost } from "../lib/api";
import { useAuth } from "../lib/auth";

type VerifyState = "checking" | "done" | "error";

export function VerifyEmailPage() {
  const { t } = useTranslation();
  const { refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid") ?? "";
  const token = searchParams.get("token") ?? "";
  const started = useRef(false);
  const [state, setState] = useState<VerifyState>(uid && token ? "checking" : "error");

  useEffect(() => {
    if (!uid || !token || started.current) {
      return;
    }
    started.current = true;

    apiPost<{ detail: string }>("/auth/verify-email/", { uid, token })
      .then(() => {
        setState("done");
        void refreshUser();
      })
      .catch(() => setState("error"));
  }, [uid, token, refreshUser]);

  return (
    <AuthShell
      eyebrow={t("auth.eyebrow")}
      title={t("auth.verifyTitle")}
      description={t("auth.verifyDescription")}
      footer={
        <p>
          <Link to="/login" className="font-semibold text-sarura-green-dark hover:underline">
            {t("auth.backToLogin")}
          </Link>
        </p>
      }
    >
      {state === "checking" && (
        <div>
          <p className="text-sm font-medium text-sarura-ink">{t("auth.verifyChecking")}</p>
          <LoadingState />
        </div>
      )}

      {state === "done" && (
        <div
          role="status"
          className="rounded-lg border border-sarura-green/40 bg-sarura-green-light px-4 py-3 text-sm font-medium text-sarura-green-dark"
        >
          {t("auth.verifyDone")}
        </div>
      )}

      {state === "error" && (
        <div className="space-y-4">
          <FormAlert
            message={!uid || !token ? t("auth.verifyMissing") : t("auth.verifyFailed")}
          />
          <Link
            to="/login"
            className="inline-block text-sm font-semibold text-sarura-green-dark hover:underline"
          >
            {t("auth.backToLogin")}
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
