import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { AuthShell } from "../components/auth/AuthShell";
import { FormAlert } from "../components/auth/FormAlert";
import { Button, TextField } from "../components/ui";
import { fieldErrorsFrom, isRateLimited } from "../lib/apiErrors";
import { useAuth } from "../lib/auth";
import { safeNext } from "../lib/redirect";
import { EMAIL_PATTERN } from "../lib/validation";

type FieldName = "email" | "password";

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const registerHref =
    next === "/dashboard" ? "/register" : `/register?next=${encodeURIComponent(next)}`;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const nextErrors: Partial<Record<FieldName, string>> = {};
    if (!email.trim()) {
      nextErrors.email = t("auth.errors.required");
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      nextErrors.email = t("auth.errors.email");
    }
    if (!password) {
      nextErrors.password = t("auth.errors.required");
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(next, { replace: true });
    } catch (error) {
      if (isRateLimited(error)) {
        setFormError(t("auth.errors.rateLimited"));
      } else {
        const fields = fieldErrorsFrom(error);
        setErrors({
          email: fields.email ? t("auth.errors.checkField") : undefined,
          password: fields.password ? t("auth.errors.checkField") : undefined,
        });
        setFormError(t("auth.errors.invalidCredentials"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow={t("auth.eyebrow")}
      title={t("auth.loginTitle")}
      description={t("auth.loginDescription")}
      footer={
        <p>
          {t("auth.noAccount")}{" "}
          <Link to={registerHref} className="font-semibold text-sarura-green-dark hover:underline">
            {t("auth.registerLink")}
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <FormAlert message={formError} />}
        <TextField
          label={t("auth.email")}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setErrors((current) => ({ ...current, email: undefined }));
          }}
          error={errors.email}
          required
        />
        <TextField
          label={t("auth.password")}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setErrors((current) => ({ ...current, password: undefined }));
          }}
          error={errors.password}
          required
        />
        <p className="text-sm">
          <Link
            to="/forgot-password"
            className="font-semibold text-sarura-green-dark hover:underline"
          >
            {t("auth.forgotLink")}
          </Link>
        </p>
        <Button type="submit" fullWidth size="lg" disabled={submitting}>
          {submitting ? t("auth.loggingIn") : t("auth.loginAction")}
        </Button>
      </form>
    </AuthShell>
  );
}
