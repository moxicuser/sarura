import { useTranslation } from "react-i18next";

import { cx } from "../../lib/cx";
import { Button } from "./Button";

export function LoadingState({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <div role="status" className={cx("py-10", className)}>
      <span className="sr-only">{t("common.loading")}</span>
      <div aria-hidden="true" className="mx-auto max-w-md space-y-3">
        <div className="h-4 w-2/3 animate-pulse rounded bg-sarura-border" />
        <div className="h-4 w-full animate-pulse rounded bg-sarura-border" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-sarura-border" />
      </div>
    </div>
  );
}

export type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({ title, message, onRetry, className }: ErrorStateProps) {
  const { t } = useTranslation();

  return (
    <div
      role="alert"
      className={cx(
        "rounded-xl border border-sarura-red/40 bg-white px-5 py-6 text-center",
        className,
      )}
    >
      <p className="text-base font-bold text-sarura-ink">{title ?? t("common.errorTitle")}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-sarura-gray">
        {message ?? t("common.errorBody")}
      </p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      )}
    </div>
  );
}

export type EmptyStateProps = {
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
};

export function EmptyState({ title, message, action, className }: EmptyStateProps) {
  return (
    <div
      className={cx(
        "rounded-xl border border-sarura-border bg-white px-5 py-10 text-center",
        className,
      )}
    >
      <p className="text-base font-bold text-sarura-ink">{title}</p>
      {message && (
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-sarura-gray">
          {message}
        </p>
      )}
      {action && (
        <Button variant="secondary" className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
