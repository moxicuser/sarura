import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { FormAlert } from "../../components/auth/FormAlert";
import { PageIntro } from "../../components/layout/PageIntro";
import {
  Button,
  SelectField,
  StatusPill,
  TextareaField,
  TextField,
} from "../../components/ui";
import { normalizeLanguage } from "../../i18n";
import { apiGet, apiPatch, apiPost } from "../../lib/api";
import { detailFrom, fieldErrorsFrom } from "../../lib/apiErrors";
import { useAuth } from "../../lib/auth";
import { formatDate, localizedName } from "../../lib/format";
import { PHONE_PATTERN } from "../../lib/validation";
import type {
  AuthUser,
  BuyerType,
  District,
  ProfileUpdatePayload,
  Province,
  RoleUpdatePayload,
  Sector,
} from "../../types/api";

type FieldName = "full_name" | "phone" | "district" | "sector" | "farm_name" | "business_name";

type FormState = {
  fullName: string;
  phone: string;
  province: string;
  district: string;
  sector: string;
  cell: string;
  farmName: string;
  cooperativeName: string;
  about: string;
  businessName: string;
  buyerType: BuyerType;
};

const BUYER_TYPES: BuyerType[] = ["individual", "restaurant", "trader", "company"];

const blankForm: FormState = {
  fullName: "",
  phone: "",
  province: "",
  district: "",
  sector: "",
  cell: "",
  farmName: "",
  cooperativeName: "",
  about: "",
  businessName: "",
  buyerType: "individual",
};

export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
  const { user, refreshUser } = useAuth();

  const [form, setForm] = useState<FormState>(blankForm);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [addingRole, setAddingRole] = useState<"farmer" | "buyer" | null>(null);
  const [newFarmName, setNewFarmName] = useState("");
  const [newBusinessName, setNewBusinessName] = useState("");
  const [newBuyerType, setNewBuyerType] = useState<BuyerType>("individual");

  useEffect(() => {
    const controller = new AbortController();
    apiGet<Province[]>("/locations/provinces/", {}, controller.signal)
      .then(setProvinces)
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }
    setForm({
      fullName: user.full_name,
      phone: user.phone,
      province: user.province ? String(user.province) : "",
      district: user.district ? String(user.district) : "",
      sector: user.sector ? String(user.sector) : "",
      cell: user.cell,
      farmName: user.farmer_profile?.farm_name ?? "",
      cooperativeName: user.farmer_profile?.cooperative_name ?? "",
      about: user.farmer_profile?.about ?? "",
      businessName: user.buyer_profile?.business_name ?? "",
      buyerType: user.buyer_profile?.buyer_type ?? "individual",
    });
  }, [user]);

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

  if (!user) {
    return null;
  }

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError(null);
    setNotice(null);
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setNotice(null);

    const nextErrors: Partial<Record<FieldName, string>> = {};
    if (!form.fullName.trim()) {
      nextErrors.full_name = t("dashboard.profile.required");
    }
    if (!PHONE_PATTERN.test(form.phone.trim())) {
      nextErrors.phone = t("auth.errors.phone");
    }
    if (form.sector && !form.district) {
      nextErrors.district = t("auth.errors.chooseDistrict");
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    const payload: ProfileUpdatePayload = {
      full_name: form.fullName.trim(),
      phone: form.phone.trim(),
      province: form.province ? Number(form.province) : null,
      district: form.district ? Number(form.district) : null,
      sector: form.sector ? Number(form.sector) : null,
      cell: form.cell.trim(),
    };
    if (user.is_farmer) {
      payload.farmer_profile = {
        farm_name: form.farmName.trim(),
        cooperative_name: form.cooperativeName.trim(),
        about: form.about.trim(),
      };
    }
    if (user.is_buyer) {
      payload.buyer_profile = {
        business_name: form.businessName.trim(),
        buyer_type: form.buyerType,
      };
    }

    setSaving(true);
    try {
      await apiPatch<AuthUser>("/auth/me/", payload);
      await refreshUser();
      setNotice(t("dashboard.profile.saved"));
    } catch (error: unknown) {
      setErrors(fieldErrorsFrom(error));
      setFormError(
        detailFrom(error) ??
          (error instanceof Error ? error.message : t("dashboard.profile.saveFailed")),
      );
    } finally {
      setSaving(false);
    }
  };

  const addRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!addingRole) {
      return;
    }
    const payload: RoleUpdatePayload = {
      is_farmer: addingRole === "farmer",
      is_buyer: addingRole === "buyer",
    };
    if (addingRole === "farmer") {
      payload.farm_name = newFarmName.trim();
    } else {
      payload.business_name = newBusinessName.trim();
      payload.buyer_type = newBuyerType;
    }

    setSaving(true);
    setFormError(null);
    setNotice(null);
    try {
      await apiPatch<AuthUser>("/auth/roles/", payload);
      await refreshUser();
      setAddingRole(null);
      setNewFarmName("");
      setNewBusinessName("");
      setNotice(t("dashboard.profile.roleAdded"));
    } catch (error: unknown) {
      setFormError(
        detailFrom(error) ??
          (error instanceof Error ? error.message : t("dashboard.profile.roleFailed")),
      );
    } finally {
      setSaving(false);
    }
  };

  const resendVerification = async () => {
    setFormError(null);
    setNotice(null);
    try {
      await apiPost("/auth/verify-email/resend/", {});
      setNotice(t("dashboard.resendSent"));
    } catch {
      setFormError(t("dashboard.resendFailed"));
    }
  };

  const verificationRows = [
    {
      label: t("dashboard.emailVerification"),
      done: Boolean(user.email_verified_at),
      date: user.email_verified_at,
      doneKey: "status.accountVerified",
      undoneKey: "dashboard.emailNotConfirmed",
    },
    {
      label: t("dashboard.identityReview"),
      done: Boolean(user.identity_reviewed_at),
      date: user.identity_reviewed_at,
      doneKey: "status.identityReviewed",
      undoneKey: "dashboard.identityNotReviewed",
    },
    {
      label: t("dashboard.cooperativeVerification"),
      done: Boolean(user.cooperative_verified_at),
      date: user.cooperative_verified_at,
      doneKey: "status.cooperativeVerified",
      undoneKey: "dashboard.cooperativeNotVerified",
    },
  ];

  return (
    <>
      <PageIntro
        eyebrow={t("dashboard.eyebrow")}
        title={t("dashboard.profile.title")}
        description={t("dashboard.profile.description")}
      />

      <section className="sarura-container grid gap-6 py-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
        <div className="rounded-xl border border-sarura-border bg-white p-5 sm:p-6">
          <h2 className="text-lg font-bold text-sarura-ink">
            {t("dashboard.profile.detailsTitle")}
          </h2>
          {formError && (
            <div className="mt-4">
              <FormAlert message={formError} />
            </div>
          )}
          {notice && (
            <p role="status" className="mt-4 rounded-lg bg-sarura-green-light px-3 py-2 text-sm font-semibold text-sarura-green-dark">
              {notice}
            </p>
          )}

          <form onSubmit={saveProfile} noValidate className="mt-5 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                label={t("dashboard.nameLabel")}
                value={form.fullName}
                onChange={(event) => setField("fullName", event.target.value)}
                error={errors.full_name}
                required
              />
              <TextField
                label={t("dashboard.phoneLabel")}
                value={form.phone}
                onChange={(event) => setField("phone", event.target.value)}
                error={errors.phone}
                hint={t("auth.phoneHint")}
                required
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField
                label={t("auth.province")}
                value={form.province}
                onChange={(event) => setField("province", event.target.value)}
                options={provinces.map((province) => ({
                  value: String(province.id),
                  label: localizedName(province, language),
                }))}
                placeholder={t("auth.chooseProvince")}
              />
              <SelectField
                label={t("auth.district")}
                value={form.district}
                onChange={(event) => setField("district", event.target.value)}
                options={districts.map((district) => ({
                  value: String(district.id),
                  label: district.name,
                }))}
                placeholder={t("auth.chooseDistrict")}
                error={errors.district}
              />
              <SelectField
                label={t("auth.sector")}
                value={form.sector}
                onChange={(event) => setField("sector", event.target.value)}
                options={sectors.map((sector) => ({
                  value: String(sector.id),
                  label: sector.name,
                }))}
                placeholder={t("auth.chooseSector")}
                error={errors.sector}
              />
              <TextField
                label={t("dashboard.profile.cell")}
                value={form.cell}
                onChange={(event) => setField("cell", event.target.value)}
              />
            </div>

            {user.is_farmer && (
              <div className="space-y-5 rounded-lg border border-sarura-border bg-sarura-page p-4">
                <h3 className="text-sm font-bold text-sarura-ink">
                  {t("dashboard.profile.farmerDetailsTitle")}
                </h3>
                <TextField
                  label={t("dashboard.profile.farmName")}
                  value={form.farmName}
                  onChange={(event) => setField("farmName", event.target.value)}
                  error={errors.farm_name}
                />
                <TextField
                  label={t("dashboard.profile.cooperativeName")}
                  value={form.cooperativeName}
                  onChange={(event) => setField("cooperativeName", event.target.value)}
                />
                <TextareaField
                  label={t("dashboard.profile.about")}
                  value={form.about}
                  onChange={(event) => setField("about", event.target.value)}
                />
              </div>
            )}

            {user.is_buyer && (
              <div className="space-y-5 rounded-lg border border-sarura-border bg-sarura-page p-4">
                <h3 className="text-sm font-bold text-sarura-ink">
                  {t("dashboard.profile.buyerDetailsTitle")}
                </h3>
                <TextField
                  label={t("dashboard.profile.businessName")}
                  value={form.businessName}
                  onChange={(event) => setField("businessName", event.target.value)}
                  error={errors.business_name}
                />
                <SelectField
                  label={t("auth.buyerType")}
                  value={form.buyerType}
                  onChange={(event) => setField("buyerType", event.target.value as BuyerType)}
                  options={BUYER_TYPES.map((type) => ({
                    value: type,
                    label: t(`auth.buyerType_${type}`),
                  }))}
                />
              </div>
            )}

            <Button type="submit" disabled={saving}>
              {saving ? t("dashboard.profile.saving") : t("dashboard.profile.save")}
            </Button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-sarura-border bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold text-sarura-ink">
              {t("dashboard.profile.roleTitle")}
            </h2>
            <p className="mt-1 text-sm text-sarura-gray">
              {t("dashboard.profile.roleBody")}
            </p>

            <ul className="mt-4 space-y-3">
              <li className="flex items-center justify-between gap-3 rounded-lg border border-sarura-border px-3 py-2">
                <StatusPill tone={user.is_farmer ? "success" : "neutral"}>
                  {t("dashboard.roleFarmer")}
                </StatusPill>
                {!user.is_farmer && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setAddingRole("farmer");
                      setFormError(null);
                    }}
                  >
                    {t("dashboard.profile.addFarmer")}
                  </Button>
                )}
              </li>
              <li className="flex items-center justify-between gap-3 rounded-lg border border-sarura-border px-3 py-2">
                <StatusPill tone={user.is_buyer ? "success" : "neutral"}>
                  {t("dashboard.roleBuyer")}
                </StatusPill>
                {!user.is_buyer && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setAddingRole("buyer");
                      setFormError(null);
                    }}
                  >
                    {t("dashboard.profile.addBuyer")}
                  </Button>
                )}
              </li>
            </ul>

            {addingRole && (
              <form onSubmit={addRole} noValidate className="mt-4 space-y-4 rounded-lg bg-sarura-page p-4">
                <h3 className="text-sm font-bold text-sarura-ink">
                  {t(
                    addingRole === "farmer"
                      ? "dashboard.profile.addFarmer"
                      : "dashboard.profile.addBuyer",
                  )}
                </h3>
                {addingRole === "farmer" ? (
                  <TextField
                    label={t("dashboard.profile.farmName")}
                    value={newFarmName}
                    onChange={(event) => setNewFarmName(event.target.value)}
                  />
                ) : (
                  <>
                    <TextField
                      label={t("dashboard.profile.businessName")}
                      value={newBusinessName}
                      onChange={(event) => setNewBusinessName(event.target.value)}
                    />
                    <SelectField
                      label={t("auth.buyerType")}
                      value={newBuyerType}
                      onChange={(event) => setNewBuyerType(event.target.value as BuyerType)}
                      options={BUYER_TYPES.map((type) => ({
                        value: type,
                        label: t(`auth.buyerType_${type}`),
                      }))}
                    />
                  </>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" size="sm" disabled={saving}>
                    {t("dashboard.profile.addRole")}
                  </Button>
                  <Button
                    size="sm"
                    variant="tertiary"
                    onClick={() => setAddingRole(null)}
                    disabled={saving}
                  >
                    {t("dashboard.form.cancel")}
                  </Button>
                </div>
              </form>
            )}
          </div>

          <div className="rounded-xl border border-sarura-border bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold text-sarura-ink">
              {t("dashboard.profile.verificationTitle")}
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              {verificationRows.map((row) => (
                <li key={row.label} className="rounded-lg border border-sarura-border p-3">
                  <p className="font-semibold text-sarura-gray">{row.label}</p>
                  <p className="mt-1">
                    <StatusPill tone={row.done ? "success" : "pending"}>
                      {row.done ? t(row.doneKey) : t(row.undoneKey)}
                    </StatusPill>
                  </p>
                  {row.date && (
                    <p className="mt-1 text-xs text-sarura-gray">
                      {t("dashboard.verifiedOn", {
                        date: formatDate(row.date, language),
                      })}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            {!user.email_verified_at && (
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => void resendVerification()}
              >
                {t("dashboard.resendVerification")}
              </Button>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
