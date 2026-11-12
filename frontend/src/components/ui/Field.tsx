import { forwardRef, useId } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useTranslation } from "react-i18next";

import { cx } from "../../lib/cx";

export type BaseFieldProps = {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  wrapperClassName?: string;
};

type FieldFrameState = {
  id: string;
  describedBy?: string;
  invalid: boolean;
  controlClass: string;
};

type FieldFrameProps = BaseFieldProps & {
  children: (state: FieldFrameState) => ReactNode;
};

function FieldFrame({
  id,
  label,
  hint,
  error,
  required = false,
  wrapperClassName,
  children,
}: FieldFrameProps) {
  const { t } = useTranslation();
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const controlClass = cx(
    "w-full rounded-lg border bg-white px-3 text-sm text-sarura-ink transition-colors",
    "placeholder:text-sarura-gray/70 focus:outline-none focus:ring-2",
    "disabled:cursor-not-allowed disabled:bg-sarura-page",
    error
      ? "border-sarura-red focus:border-sarura-red focus:ring-sarura-red/20"
      : "border-sarura-border focus:border-sarura-green focus:ring-sarura-green/20",
  );

  return (
    <div className={cx("w-full", wrapperClassName)}>
      <label htmlFor={controlId} className="mb-1.5 block text-sm font-semibold text-sarura-ink">
        {label}
        {required && (
          <>
            <span aria-hidden="true" className="ml-1 text-sarura-red">
              *
            </span>
            <span className="sr-only"> ({t("common.required")})</span>
          </>
        )}
      </label>
      {children({
        id: controlId,
        describedBy,
        invalid: Boolean(error),
        controlClass,
      })}
      {hint && (
        <p id={hintId} className="mt-1.5 text-sm text-sarura-gray">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm font-medium text-sarura-red">
          {error}
        </p>
      )}
    </div>
  );
}

export type TextFieldProps = BaseFieldProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "id">;

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(
    {
      id,
      label,
      hint,
      error,
      required,
      wrapperClassName,
      className,
      ...props
    },
    ref,
  ) {
    return (
      <FieldFrame
        id={id}
        label={label}
        hint={hint}
        error={error}
        required={required}
        wrapperClassName={wrapperClassName}
      >
        {({ id: controlId, describedBy, invalid, controlClass }) => (
          <input
            ref={ref}
            id={controlId}
            required={required}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={cx(controlClass, "min-h-11 py-2", className)}
            {...props}
          />
        )}
      </FieldFrame>
    );
  },
);

export type TextareaFieldProps = BaseFieldProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id">;

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  function TextareaField(
    {
      id,
      label,
      hint,
      error,
      required,
      wrapperClassName,
      className,
      ...props
    },
    ref,
  ) {
    return (
      <FieldFrame
        id={id}
        label={label}
        hint={hint}
        error={error}
        required={required}
        wrapperClassName={wrapperClassName}
      >
        {({ id: controlId, describedBy, invalid, controlClass }) => (
          <textarea
            ref={ref}
            id={controlId}
            required={required}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={cx(controlClass, "min-h-28 py-2.5", className)}
            {...props}
          />
        )}
      </FieldFrame>
    );
  },
);

export type SelectOption = {
  value: string;
  label: string;
};

export type SelectFieldProps = BaseFieldProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
    options: SelectOption[];
    placeholder?: string;
  };

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  function SelectField(
    {
      id,
      label,
      hint,
      error,
      required,
      wrapperClassName,
      className,
      options,
      placeholder,
      ...props
    },
    ref,
  ) {
    return (
      <FieldFrame
        id={id}
        label={label}
        hint={hint}
        error={error}
        required={required}
        wrapperClassName={wrapperClassName}
      >
        {({ id: controlId, describedBy, invalid, controlClass }) => (
          <select
            ref={ref}
            id={controlId}
            required={required}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={cx(controlClass, "min-h-11 py-2 pr-9", className)}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </FieldFrame>
    );
  },
);
