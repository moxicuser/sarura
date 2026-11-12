import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";

import { AuthShell } from "../components/auth/AuthShell";
import { FormAlert } from "../components/auth/FormAlert";
import { Button, TextField } from "../components/ui";
import { apiPost } from "../lib/api";
import { isRateLimited } from "../lib/apiErrors";

const buttonStylesLink = "inline-block text-sm font-semibold text-sarura-green-dark hover:underline";

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid") ?? "";
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; passwordConfirm?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const invalidLink = !uid || !token;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const nextErrors: typeof errors = {};
    if (!password) {
      nextErrors.password = t("auth.errors.required");
    } else if (password.length < 8) {
      nextErrors.password = t("auth.errors.passwordShort");
    }
    if (password !== passwordConfirm) {
      nextErrors.passwordConfirm = t("auth.errors.passwordMismatch");
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      await apiPost<{ detail: string }>("/auth/password-reset/confirm/", {
        uid,
        token,
        new_password: password,
        new_password_confirm: passwordConfirm,
      });
      setDone(true);
    } catch (error) {
      if (isRateLimited(error)) {
        setFormError(t("auth.errors.rateLimited"));
      } else {
        setFormError(t("auth.resetInvalid"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow={t("auth.eyebrow")}
      title={t("auth.resetTitle")}
      description={t("auth.resetDescription")}
      footer={
        <p>
          <Link to="/login" className="font-semibold text-sarura-green-dark hover:underline">
            {t("auth.backToLogin")}
          </Link>
        </p>
      }
    >
      {invalidLink ? (
        <div className="space-y-4">
          <FormAlert message={t("auth.resetInvalid")} />
          <Link to="/forgot-password" className={buttonStylesLink}>
            {t("auth.forgotAction")}
          </Link>
        </div>
      ) : done ? (
        <div className="space-y-4">
          <div
            role="status"
            className="rounded-lg border border-sarura-green/40 bg-sarura-green-light px-4 py-3 text-sm font-medium text-sarura-green-dark"
          >
            {t("auth.resetDone")}
          </div>
          <Link to="/login" className={buttonStylesLink}>
            {t("auth.loginAction")}
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {formError && <FormAlert message={formError} />}
          <TextField
            label={t("auth.newPassword")}
            type="password"
            autoComplete="new-password"
            hint={t("auth.passwordHint")}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setErrors((current) => ({ ...current, password: undefined }));
            }}
            error={errors.password}
            required
          />
          <TextField
            label={t("auth.passwordConfirm")}
            type="password"
            autoComplete="new-password"
            value={passwordConfirm}
            onChange={(event) => {
              setPasswordConfirm(event.target.value);
              setErrors((current) => ({ ...current, passwordConfirm: undefined }));
            }}
            error={errors.passwordConfirm}
            required
          />
          <Button type="submit" fullWidth size="lg" disabled={submitting}>
            {submitting ? t("auth.resetSaving") : t("auth.resetAction")}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
