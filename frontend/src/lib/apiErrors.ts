/** Turn DRF validation errors into messages a form can show next to a field. */

import { ApiError } from "./api";

export type ApiFieldErrors = Record<string, string>;

function firstMessage(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstMessage(item);
      if (message) {
        return message;
      }
    }
  }
  return null;
}

/** Field name -> first message. `detail` and `non_field_errors` are omitted so
 * the caller can show them as a form-level alert instead. */
export function fieldErrorsFrom(error: unknown): ApiFieldErrors {
  if (!(error instanceof ApiError) || !error.data || typeof error.data !== "object") {
    return {};
  }

  const errors: ApiFieldErrors = {};
  for (const [field, value] of Object.entries(error.data as Record<string, unknown>)) {
    if (field === "detail" || field === "non_field_errors") {
      continue;
    }
    const message = firstMessage(value);
    if (message) {
      errors[field] = message;
    }
  }
  return errors;
}

/** A form-level message from `detail` / `non_field_errors`, if the API sent one. */
export function detailFrom(error: unknown): string | null {
  if (!(error instanceof ApiError) || !error.data || typeof error.data !== "object") {
    return null;
  }
  const data = error.data as Record<string, unknown>;
  return firstMessage(data.detail) ?? firstMessage(data.non_field_errors);
}

export function isRateLimited(error: unknown): boolean {
  return error instanceof ApiError && error.status === 429;
}
