import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { AuthShell } from "../components/auth/AuthShell";
import { FormAlert } from "../components/auth/FormAlert";
import { Button, TextField } from "../components/ui";
import { apiPost } from "../lib/api";
import { isRateLimited } from "../lib/apiErrors";
import { EMAIL_PATTERN } from "../lib/validation";

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!email.trim()) {
      setFieldError(t("auth.errors.required"));
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setFieldError(t("auth.errors.email"));
      return;
    }
    setFieldError(null);

    setSubmitting(true);
    try {
      await apiPost<{ detail: string }>("/auth/password-reset/", { email: email.trim() });
      setSent(true);
    } catch (error) {
      setFormError(
        isRateLimited(error) ? t("auth.errors.rateLimited") : t("auth.errors.generic"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow={t("auth.eyebrow")}
      title={t("auth.forgotTitle")}
      description={t("auth.forgotDescription")}
      footer={
        <p>
          <Link to="/login" className="font-semibold text-sarura-green-dark hover:underline">
            {t("auth.backToLogin")}
          </Link>
        </p>
      }
    >
      {sent ? (
        <div className="space-y-4">
          <div
            role="status"
            className="rounded-lg border border-sarura-green/40 bg-sarura-green-light px-4 py-3 text-sm font-medium text-sarura-green-dark"
          >
            {t("auth.forgotSent")}
          </div>
          <Link to="/login" className="block text-sm font-semibold text-sarura-green-dark hover:underline">
            {t("auth.backToLogin")}
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {formError && <FormAlert message={formError} />}
          <TextField
            label={t("auth.email")}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setFieldError(null);
            }}
            error={fieldError ?? undefined}
            required
          />
          <Button type="submit" fullWidth size="lg" disabled={submitting}>
            {submitting ? t("auth.forgotSending") : t("auth.forgotAction")}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
