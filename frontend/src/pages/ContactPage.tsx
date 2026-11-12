import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { PageIntro } from "../components/layout/PageIntro";
import { Button, TextField, TextareaField } from "../components/ui";
import { ApiError, apiPost } from "../lib/api";

// [review] Placeholder contact details until the founder confirms the real
// inboxes, phone number and WhatsApp link. See docs/step7-public-content.md.
const CONTACT_EMAIL = "hello@sarura.rw";
const CONTACT_PHONE_DISPLAY = "+250 788 123 456";
const CONTACT_WHATSAPP = "https://wa.me/250788123456";

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
  website: string;
};

type FieldName = "name" | "email" | "subject" | "message";

const emptyForm: FormState = {
  name: "",
  email: "",
  subject: "",
  message: "",
  website: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);

  const setField = (field: FieldName, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      return next;
    });
    setSuccess(false);
  };

  const validate = (): boolean => {
    const next: Partial<Record<FieldName, string>> = {};
    if (!form.name.trim()) {
      next.name = t("contact.errors.required");
    }
    if (!form.email.trim()) {
      next.email = t("contact.errors.required");
    } else if (!EMAIL_PATTERN.test(form.email.trim())) {
      next.email = t("contact.errors.email");
    }
    if (!form.subject.trim()) {
      next.subject = t("contact.errors.required");
    }
    if (!form.message.trim()) {
      next.message = t("contact.errors.required");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setRateLimited(false);

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      await apiPost("/contact/", {
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
        website: form.website,
      });
      setForm(emptyForm);
      setErrors({});
      setSuccess(true);
    } catch (reason) {
      if (reason instanceof ApiError) {
        if (reason.status === 429) {
          setRateLimited(true);
          return;
        }
        if (reason.status === 400 && reason.data && typeof reason.data === "object") {
          const serverErrors: Partial<Record<FieldName, string>> = {};
          for (const field of ["name", "email", "subject", "message"] as const) {
            if (field in (reason.data as Record<string, unknown>)) {
              serverErrors[field] = t("contact.errors.check");
            }
          }
          if (Object.keys(serverErrors).length > 0) {
            setErrors(serverErrors);
            return;
          }
        }
      }
      setFormError(t("contact.errors.generic"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageIntro
        eyebrow={t("contact.eyebrow")}
        title={t("contact.title")}
        description={t("contact.description")}
      />

      <section className="sarura-container py-10 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="rounded-xl border border-sarura-border bg-white p-5 sm:p-6">
            <h2 className="text-xl font-bold text-sarura-ink">{t("contact.formTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-sarura-gray">
              {t("contact.formBody")}
            </p>

            {success && (
              <p
                role="status"
                className="mt-4 rounded-lg border border-sarura-green bg-sarura-green-light px-4 py-3 text-sm font-semibold text-sarura-green-dark"
              >
                {t("contact.success")}
              </p>
            )}
            {rateLimited && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-sarura-amber bg-white px-4 py-3 text-sm font-semibold text-sarura-amber"
              >
                {t("contact.rateLimited")}
              </p>
            )}
            {formError && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-sarura-red/50 bg-white px-4 py-3 text-sm font-semibold text-sarura-red"
              >
                {formError}
              </p>
            )}

            <form onSubmit={onSubmit} noValidate className="mt-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label={t("contact.name")}
                  value={form.name}
                  maxLength={100}
                  autoComplete="name"
                  required
                  error={errors.name}
                  onChange={(event) => setField("name", event.target.value)}
                />
                <TextField
                  type="email"
                  label={t("contact.email")}
                  value={form.email}
                  maxLength={254}
                  autoComplete="email"
                  required
                  error={errors.email}
                  onChange={(event) => setField("email", event.target.value)}
                />
              </div>
              <TextField
                label={t("contact.subject")}
                value={form.subject}
                maxLength={150}
                required
                error={errors.subject}
                wrapperClassName="mt-4"
                onChange={(event) => setField("subject", event.target.value)}
              />
              <TextareaField
                label={t("contact.message")}
                value={form.message}
                maxLength={5000}
                required
                error={errors.message}
                rows={6}
                wrapperClassName="mt-4"
                onChange={(event) => setField("message", event.target.value)}
              />

              <div
                aria-hidden="true"
                className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden"
              >
                <label htmlFor="contact-website">Website</label>
                <input
                  id="contact-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, website: event.target.value }))
                  }
                />
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={submitting}>
                  {submitting ? t("contact.sending") : t("contact.send")}
                </Button>
                <p className="text-xs leading-relaxed text-sarura-gray">
                  {t("contact.privacyNote")}{" "}
                  <Link to="/privacy" className="font-semibold text-sarura-green-dark hover:underline">
                    {t("nav.privacy")}
                  </Link>
                </p>
              </div>
            </form>
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border border-sarura-border bg-white p-5">
              <h2 className="text-base font-bold text-sarura-ink">{t("contact.detailsTitle")}</h2>
              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="font-semibold text-sarura-gray">{t("contact.emailLabel")}</dt>
                  <dd className="mt-0.5">
                    <a
                      href={`mailto:${CONTACT_EMAIL}`}
                      className="font-semibold text-sarura-green-dark hover:underline"
                    >
                      {CONTACT_EMAIL}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-sarura-gray">{t("contact.phoneLabel")}</dt>
                  <dd className="mt-0.5">
                    <a
                      href="tel:+250788123456"
                      className="font-semibold text-sarura-green-dark hover:underline"
                    >
                      {CONTACT_PHONE_DISPLAY}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-sarura-gray">{t("contact.whatsappLabel")}</dt>
                  <dd className="mt-0.5">
                    <a
                      href={CONTACT_WHATSAPP}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-sarura-green-dark hover:underline"
                    >
                      {t("contact.whatsappAction")}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-sarura-gray">{t("contact.locationLabel")}</dt>
                  <dd className="mt-0.5 text-sarura-ink">{t("footer.location")}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border border-sarura-border bg-sarura-page p-5">
              <h2 className="text-base font-bold text-sarura-ink">{t("contact.helpTitle")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-sarura-gray">
                {t("contact.helpBody")}
              </p>
              <Link
                to="/how-it-works"
                className="mt-3 inline-block text-sm font-semibold text-sarura-green-dark underline-offset-4 hover:underline"
              >
                {t("contact.helpAction")}
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
