import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { FormAlert } from "../../components/auth/FormAlert";
import { RoleNotice } from "../../components/dashboard/RoleNotice";
import { PageIntro } from "../../components/layout/PageIntro";
import {
  Button,
  ErrorState,
  LoadingState,
  SelectField,
  TextareaField,
  TextField,
} from "../../components/ui";
import { normalizeLanguage } from "../../i18n";
import { apiDelete, apiGet, apiPatch, apiPost, apiUpload } from "../../lib/api";
import { detailFrom, fieldErrorsFrom } from "../../lib/apiErrors";
import { useAuth } from "../../lib/auth";
import { localizedName } from "../../lib/format";
import { useApi } from "../../lib/useApi";
import type {
  Category,
  District,
  ProductDetail,
  ProductImage,
  ProductWritePayload,
  Province,
  Sector,
} from "../../types/api";

type FormState = {
  cropName: string;
  category: string;
  description: string;
  quantity: string;
  price: string;
  priceBasis: "fixed" | "negotiable";
  province: string;
  district: string;
  sector: string;
  availableFrom: string;
  status: "active" | "sold" | "hidden";
};

type FieldName =
  | "crop_name"
  | "category"
  | "description"
  | "quantity"
  | "price_per_unit"
  | "district"
  | "sector";

const emptyForm: FormState = {
  cropName: "",
  category: "",
  description: "",
  quantity: "",
  price: "",
  priceBasis: "negotiable",
  province: "",
  district: "",
  sector: "",
  availableFrom: "",
  status: "active",
};

const MAX_PHOTOS = 5;

export function ProductFormPage() {
  const { t, i18n } = useTranslation();
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const productId = Number(id);
  const editing = Number.isInteger(productId) && productId > 0;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [files, setFiles] = useState<File[]>([]);

  const detail = useApi<ProductDetail>(
    (signal) =>
      editing
        ? apiGet<ProductDetail>(`/products/${productId}/`, {}, signal)
        : Promise.reject(new Error("no edit target")),
    [productId, editing],
  );

  useEffect(() => {
    const controller = new AbortController();
    apiGet<Category[]>("/categories/", {}, controller.signal)
      .then(setCategories)
      .catch(() => undefined);
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

  useEffect(() => {
    const product = detail.data;
    if (!product) {
      return;
    }
    setForm({
      cropName: product.crop_name,
      category: String(product.category.id),
      description: product.description,
      quantity: String(product.quantity),
      price: product.price_per_unit,
      priceBasis: product.price_basis,
      province: String(product.province_id),
      district: "", // Set after the province's district list has loaded.
      sector: "",
      availableFrom: product.available_from ?? "",
      status: product.status,
    });
    setExistingImages(product.images);
    setDistricts([]);
    setSectors([]);
  }, [detail.data]);

  useEffect(() => {
    const product = detail.data;
    if (!product || !districts.length || form.district) {
      return;
    }
    const district = districts.find((item) => item.name === product.district_name);
    if (district) {
      setForm((current) => ({ ...current, district: String(district.id) }));
    }
  }, [detail.data, districts, form.district]);

  useEffect(() => {
    const product = detail.data;
    if (!product || !sectors.length || !product.sector_name || form.sector) {
      return;
    }
    const sector = sectors.find((item) => item.name === product.sector_name);
    if (sector) {
      setForm((current) => ({ ...current, sector: String(sector.id) }));
    }
  }, [detail.data, sectors, form.sector]);

  if (!user) {
    return null;
  }
  if (!user.is_farmer) {
    return <RoleNotice role="farmer" />;
  }
  if (editing && detail.loading) {
    return (
      <div className="sarura-container py-8">
        <LoadingState />
      </div>
    );
  }
  if (editing && detail.error) {
    return (
      <div className="sarura-container py-8">
        <ErrorState message={t("dashboard.form.loadError")} onRetry={detail.reload} />
      </div>
    );
  }
  if (editing) {
    const product = detail.data;
    if (!product || product.farmer.id !== user.id) {
      return (
        <div className="sarura-container py-8">
          <ErrorState message={t("dashboard.form.loadError")} />
        </div>
      );
    }
  }

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError(null);
    setErrors((current) => ({ ...current, [field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`) as FieldName]: undefined }));
  };

  const onPhotosChange = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(event.target.files ?? []);
    const available = MAX_PHOTOS - existingImages.length;
    if (chosen.length > available) {
      setFormError(t("dashboard.form.photoLimit", { limit: MAX_PHOTOS }));
      setFiles(chosen.slice(0, Math.max(available, 0)));
      return;
    }
    setFormError(null);
    setFiles(chosen);
  };

  const removePhoto = async (imageId: number) => {
    if (!editing || !user || !Number.isInteger(productId)) {
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await apiDelete(`/products/${productId}/images/${imageId}/`);
      setExistingImages((current) => current.filter((image) => image.id !== imageId));
      setNotice(t("dashboard.form.photoRemoved"));
    } catch {
      setFormError(t("dashboard.form.photoRemoveFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setNotice(null);

    const nextErrors: Partial<Record<FieldName, string>> = {};
    if (!form.cropName.trim()) {
      nextErrors.crop_name = t("dashboard.form.required");
    }
    if (!form.category) {
      nextErrors.category = t("dashboard.form.required");
    }
    if (!form.district) {
      nextErrors.district = t("dashboard.form.required");
    }
    if (!form.quantity || Number(form.quantity) < 0) {
      nextErrors.quantity = t("dashboard.form.quantityHint");
    }
    if (form.status === "active" && Number(form.quantity) < 1) {
      nextErrors.quantity = t("dashboard.form.activeQuantityHint");
    }
    if (!form.price || Number(form.price) < 50) {
      nextErrors.price_per_unit = t("dashboard.form.priceHint");
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    const payload: ProductWritePayload = {
      category: Number(form.category),
      crop_name: form.cropName.trim(),
      description: form.description.trim(),
      quantity: Number(form.quantity),
      unit: "kg",
      price_per_unit: form.price,
      price_basis: form.priceBasis,
      district: Number(form.district),
      sector: form.sector ? Number(form.sector) : null,
      available_from: form.availableFrom || null,
      status: form.status,
    };

    setSubmitting(true);
    try {
      let savedId = productId;
      if (editing) {
        await apiPatch<ProductDetail>(`/products/${productId}/`, payload);
      } else {
        const created = await apiPost<ProductDetail>("/products/", payload);
        savedId = created.id;
      }

      if (files.length) {
        const upload = new FormData();
        files.forEach((file) => upload.append("image", file));
        await apiUpload(`/products/${savedId}/images/`, upload);
      }

      setFiles([]);
      setNotice(t("dashboard.form.saved"));
      if (!editing) {
        navigate("/dashboard/products");
      }
    } catch (error: unknown) {
      setErrors(fieldErrorsFrom(error));
      setFormError(
        detailFrom(error) ??
          (error instanceof Error ? error.message : t("dashboard.form.saveFailed")),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageIntro
        eyebrow={t("dashboard.eyebrow")}
        title={t(editing ? "dashboard.form.titleEdit" : "dashboard.form.titleNew")}
        description={t(
          editing ? "dashboard.form.descriptionEdit" : "dashboard.form.descriptionNew",
        )}
      />

      <section className="sarura-container py-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-sarura-border bg-white p-5 sm:p-6">
          {formError && <div className="mb-4"><FormAlert message={formError} /></div>}
          {notice && (
            <p role="status" className="mb-4 rounded-lg bg-sarura-green-light px-3 py-2 text-sm font-semibold text-sarura-green-dark">
              {notice}
            </p>
          )}

          <form onSubmit={submit} noValidate className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                label={t("dashboard.form.cropName")}
                value={form.cropName}
                onChange={(event) => setField("cropName", event.target.value)}
                error={errors.crop_name}
                required
                autoComplete="off"
              />
              <SelectField
                label={t("dashboard.form.category")}
                value={form.category}
                onChange={(event) => setField("category", event.target.value)}
                options={categories.map((category) => ({
                  value: String(category.id),
                  label: localizedName(category, language),
                }))}
                placeholder={t("dashboard.form.chooseCategory")}
                error={errors.category}
                required
              />
            </div>

            <TextareaField
              label={t("dashboard.form.description")}
              value={form.description}
              onChange={(event) => setField("description", event.target.value)}
              hint={t("dashboard.form.contactHint")}
              error={errors.description}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                label={t("dashboard.form.quantity")}
                type="number"
                min="0"
                step="1"
                value={form.quantity}
                onChange={(event) => setField("quantity", event.target.value)}
                hint={t("dashboard.form.quantityHint")}
                error={errors.quantity}
                required
              />
              <TextField
                label={t("dashboard.form.price")}
                type="number"
                min="50"
                step="0.01"
                value={form.price}
                onChange={(event) => setField("price", event.target.value)}
                hint={t("dashboard.form.priceHint")}
                error={errors.price_per_unit}
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
                required
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
                required
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
                label={t("dashboard.form.availableFrom")}
                type="date"
                value={form.availableFrom}
                onChange={(event) => setField("availableFrom", event.target.value)}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField
                label={t("dashboard.form.priceBasis")}
                value={form.priceBasis}
                onChange={(event) =>
                  setField("priceBasis", event.target.value as FormState["priceBasis"])
                }
                options={[
                  { value: "negotiable", label: t("listing.negotiablePrice") },
                  { value: "fixed", label: t("listing.fixedPrice") },
                ]}
              />
              <SelectField
                label={t("dashboard.form.status")}
                value={form.status}
                onChange={(event) =>
                  setField("status", event.target.value as FormState["status"])
                }
                options={[
                  { value: "active", label: t("status.active") },
                  { value: "sold", label: t("status.sold") },
                  { value: "hidden", label: t("status.hidden") },
                ]}
              />
            </div>

            <div className="rounded-lg border border-sarura-border bg-sarura-page p-4">
              <h2 className="text-sm font-bold text-sarura-ink">
                {t("dashboard.form.photoTitle")}
              </h2>
              <p className="mt-1 text-sm text-sarura-gray">
                {t("dashboard.form.photoHint", { limit: MAX_PHOTOS })}
              </p>

              {existingImages.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-3">
                  {existingImages.map((image) => (
                    <li key={image.id} className="w-24">
                      <img
                        src={image.image}
                        alt={image.alt_text}
                        className="h-20 w-24 rounded-lg border border-sarura-border object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => void removePhoto(image.id)}
                        disabled={submitting}
                        className="mt-1 text-xs font-semibold text-sarura-red hover:underline disabled:opacity-50"
                      >
                        {t("dashboard.form.removePhoto")}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <label className="mt-3 block text-sm font-semibold text-sarura-ink" htmlFor="product-photos">
                {t("dashboard.form.chooseFile")}
              </label>
              <input
                id="product-photos"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={onPhotosChange}
                className="mt-1 block w-full text-sm text-sarura-gray file:mr-3 file:rounded-lg file:border-0 file:bg-sarura-green-light file:px-3 file:py-2 file:font-semibold file:text-sarura-green-dark"
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? t("dashboard.form.saving") : t("dashboard.form.save")}
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate("/dashboard/products")}
                disabled={submitting}
              >
                {t("dashboard.form.cancel")}
              </Button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
