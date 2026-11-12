import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { AuthShell } from "../components/auth/AuthShell";
import { FormAlert } from "../components/auth/FormAlert";
import { Button, SelectField, TextField } from "../components/ui";
import { normalizeLanguage } from "../i18n";
import { apiGet } from "../lib/api";
import { fieldErrorsFrom, isRateLimited } from "../lib/apiErrors";
import { useAuth } from "../lib/auth";
import { localizedName } from "../lib/format";
import { safeNext } from "../lib/redirect";
import { EMAIL_PATTERN, PHONE_PATTERN } from "../lib/validation";
import type { BuyerType, District, Province, RegisterPayload, Sector } from "../types/api";

type Role = "buyer" | "farmer" | "both";

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  passwordConfirm: string;
  province: string;
  district: string;
  sector: string;
  farmName: string;
  businessName: string;
  buyerType: BuyerType;
};

type FieldName =
  | "full_name"
  | "email"
  | "phone"
  | "password"
  | "password_confirm"
  | "province"
  | "district"
  | "sector";

const emptyForm: FormState = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  passwordConfirm: "",
  province: "",
  district: "",
  sector: "",
  farmName: "",
  businessName: "",
  buyerType: "individual",
};

const BUYER_TYPES: BuyerType[] = ["individual", "restaurant", "trader", "company"];

export function RegisterPage() {
  const { t, i18n } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);

  const [role, setRole] = useState<Role>(
    searchParams.get("role") === "farmer" ? "farmer" : "buyer",
  );
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    apiGet<Province[]>("/locations/provinces/", {}, controller.signal)
      .then(setProvinces)
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setDistricts([]);
    setSectors([]);
    if (!form.province) {
      return;
    }
    const controller = new AbortController();
    apiGet<District[]>(
      "/locations/districts/",
      { province: Number(form.province) },
      controller.signal,
    )
      .then(setDistricts)
      .catch(() => undefined);
    return () => controller.abort();
  }, [form.province]);

  useEffect(() => {
    setSectors([]);
    if (!form.district) {
      return;
    }
    const controller = new AbortController();
    apiGet<Sector[]>(
      "/locations/sectors/",
      { district: Number(form.district) },
      controller.signal,
    )
      .then(setSectors)
      .catch(() => undefined);
    return () => controller.abort();
  }, [form.district]);

  const setField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }) as FormState);
    setFormError(null);
    setErrors((current) => {
      const key = (
        field === "fullName"
          ? "full_name"
          : field === "passwordConfirm"
            ? "password_confirm"
            : field
      ) as FieldName;
      if (!current[key]) {
        return current;
      }
      const nextErrors = { ...current };
      delete nextErrors[key];
      return nextErrors;
    });
  };

  const onProvinceChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setForm((current) => ({
      ...current,
      province: event.target.value,
      district: "",
      sector: "",
    }));
    setErrors((current) => ({ ...current, province: undefined, district: undefined }));
    setFormError(null);
  };

  const onDistrictChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setForm((current) => ({ ...current, district: event.target.value, sector: "" }));
    setErrors((current) => ({ ...current, district: undefined }));
    setFormError(null);
  };

  const validate = (): boolean => {
    const nextErrors: Partial<Record<FieldName, string>> = {};
    if (!form.fullName.trim()) {
      nextErrors.full_name = t("auth.errors.required");
    }
    if (!form.email.trim()) {
      nextErrors.email = t("auth.errors.required");
    } else if (!EMAIL_PATTERN.test(form.email.trim())) {
      nextErrors.email = t("auth.errors.email");
    }
    if (!form.phone.trim()) {
      nextErrors.phone = t("auth.errors.required");
    } else if (!PHONE_PATTERN.test(form.phone.replace(/[\s-]/g, ""))) {
      nextErrors.phone = t("auth.errors.phone");
    }
    if (!form.password) {
      nextErrors.password = t("auth.errors.required");
    } else if (form.password.length < 8) {
      nextErrors.password = t("auth.errors.passwordShort");
    }
    if (form.password !== form.passwordConfirm) {
      nextErrors.password_confirm = t("auth.errors.passwordMismatch");
    }
    if (!form.province) {
      nextErrors.province = t("auth.errors.chooseProvince");
    }
    if (!form.district) {
      nextErrors.district = t("auth.errors.chooseDistrict");
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    const payload: RegisterPayload = {
      email: form.email.trim(),
      full_name: form.fullName.trim(),
      phone: form.phone.trim(),
      password: form.password,
      password_confirm: form.passwordConfirm,
      is_buyer: role !== "farmer",
      is_farmer: role !== "buyer",
      province: Number(form.province),
      district: Number(form.district),
      sector: form.sector ? Number(form.sector) : null,
      language,
      farm_name: role !== "buyer" ? form.farmName.trim() : "",
      business_name: role !== "farmer" ? form.businessName.trim() : "",
    };
    if (role !== "farmer") {
      payload.buyer_type = form.buyerType;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await register(payload);
      navigate(next, { replace: true });
    } catch (error) {
      if (isRateLimited(error)) {
        setFormError(t("auth.errors.rateLimited"));
      } else {
        const fields = fieldErrorsFrom(error);
        setErrors({
          full_name: fields.full_name ? t("auth.errors.checkField") : undefined,
          email: fields.email ? t("auth.errors.emailTaken") : undefined,
          phone: fields.phone ? t("auth.errors.phoneTaken") : undefined,
          password: fields.password ? t("auth.errors.passwordRules") : undefined,
          password_confirm: fields.password_confirm
            ? t("auth.errors.passwordMismatch")
            : undefined,
          province: fields.province ? t("auth.errors.chooseProvince") : undefined,
          district: fields.district ? t("auth.errors.chooseDistrict") : undefined,
          sector: fields.sector ? t("auth.errors.checkField") : undefined,
        });
        setFormError(fields.roles ? t("auth.errors.chooseRole") : t("auth.errors.generic"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const loginHref =
    next === "/dashboard" ? "/login" : `/login?next=${encodeURIComponent(next)}`;

  return (
    <AuthShell
      eyebrow={t("auth.eyebrow")}
      title={t("auth.registerTitle")}
      description={t("auth.registerDescription")}
      footer={
        <p>
          {t("auth.haveAccount")}{" "}
          <Link to={loginHref} className="font-semibold text-sarura-green-dark hover:underline">
            {t("auth.loginLink")}
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <FormAlert message={formError} />}

        <fieldset>
          <legend className="mb-2 block text-sm font-semibold text-sarura-ink">
            {t("auth.roleLegend")}
          </legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                ["buyer", "auth.roleBuyer", "auth.roleBuyerHint"],
                ["farmer", "auth.roleFarmer", "auth.roleFarmerHint"],
                ["both", "auth.roleBoth", "auth.roleBothHint"],
              ] as const
            ).map(([value, labelKey, hintKey]) => (
              <label
                key={value}
                className={`flex cursor-pointer flex-col rounded-lg border p-3 text-sm transition-colors ${
                  role === value
                    ? "border-sarura-green bg-sarura-green-light"
                    : "border-sarura-border bg-white hover:border-sarura-green"
                }`}
              >
                <span className="flex items-center gap-2 font-semibold text-sarura-ink">
                  <input
                    type="radio"
                    name="role"
                    value={value}
                    checked={role === value}
                    onChange={() => setRole(value)}
                    className="h-4 w-4 accent-sarura-green"
                  />
                  {t(labelKey)}
                </span>
                <span className="mt-1 text-xs leading-relaxed text-sarura-gray">
                  {t(hintKey)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <TextField
          label={t("auth.fullName")}
          autoComplete="name"
          value={form.fullName}
          onChange={(event) => setField("fullName", event.target.value)}
          error={errors.full_name}
          required
        />
        <TextField
          label={t("auth.email")}
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(event) => setField("email", event.target.value)}
          error={errors.email}
          required
        />
        <TextField
          label={t("auth.phone")}
          type="tel"
          autoComplete="tel"
          hint={t("auth.phoneHint")}
          value={form.phone}
          onChange={(event) => setField("phone", event.target.value)}
          error={errors.phone}
          required
        />
        <TextField
          label={t("auth.password")}
          type="password"
          autoComplete="new-password"
          hint={t("auth.passwordHint")}
          value={form.password}
          onChange={(event) => setField("password", event.target.value)}
          error={errors.password}
          required
        />
        <TextField
          label={t("auth.passwordConfirm")}
          type="password"
          autoComplete="new-password"
          value={form.passwordConfirm}
          onChange={(event) => setField("passwordConfirm", event.target.value)}
          error={errors.password_confirm}
          required
        />

        <SelectField
          label={t("auth.province")}
          value={form.province}
          onChange={onProvinceChange}
          placeholder={t("auth.chooseProvince")}
          options={provinces.map((province) => ({
            value: String(province.id),
            label: localizedName(province, language),
          }))}
          error={errors.province}
          required
        />
        <SelectField
          label={t("auth.district")}
          value={form.district}
          onChange={onDistrictChange}
          placeholder={t("auth.chooseDistrict")}
          disabled={!form.province}
          options={districts.map((district) => ({
            value: String(district.id),
            label: district.name,
          }))}
          error={errors.district}
          required
        />
        <SelectField
          label={t("auth.sector")}
          value={form.sector}
          onChange={(event) => setField("sector", event.target.value)}
          placeholder={t("auth.chooseSector")}
          disabled={!form.district}
          options={sectors.map((sector) => ({
            value: String(sector.id),
            label: sector.name,
          }))}
          error={errors.sector}
        />

        {role !== "buyer" && (
          <TextField
            label={t("auth.farmName")}
            value={form.farmName}
            onChange={(event) => setField("farmName", event.target.value)}
          />
        )}

        {role !== "farmer" && (
          <>
            <TextField
              label={t("auth.businessName")}
              value={form.businessName}
              onChange={(event) => setField("businessName", event.target.value)}
            />
            <SelectField
              label={t("auth.buyerType")}
              value={form.buyerType}
              onChange={(event) => setField("buyerType", event.target.value)}
              options={BUYER_TYPES.map((value) => ({
                value,
                label: t(`auth.buyerType_${value}`),
              }))}
            />
          </>
        )}

        <Button type="submit" fullWidth size="lg" disabled={submitting}>
          {submitting ? t("auth.registering") : t("auth.registerAction")}
        </Button>
      </form>
    </AuthShell>
  );
}
