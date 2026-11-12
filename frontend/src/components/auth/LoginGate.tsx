import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { buttonStyles } from "../ui";

export type LoginGateProps = {
  open: boolean;
  next: string;
  onClose: () => void;
};

/** The login gate from guide section 4: explain why an account is needed,
 * then return the visitor to the same listing after login or registration. */
export function LoginGate({ open, next, onClose }: LoginGateProps) {
  const { t } = useTranslation();
  const closeRef = useRef<HTMLButtonElement>(null);
  const loginHref = `/login?next=${encodeURIComponent(next)}`;
  const registerHref = `/register?next=${encodeURIComponent(next)}`;

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        role="presentation"
        onClick={onClose}
        className="absolute inset-0 bg-sarura-ink/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-gate-title"
        aria-describedby="login-gate-body"
        className="relative w-full max-w-md rounded-xl border border-sarura-border bg-white p-6 shadow-2xl"
      >
        <h2 id="login-gate-title" className="text-xl font-extrabold text-sarura-ink">
          {t("auth.gateTitle")}
        </h2>
        <p id="login-gate-body" className="mt-2 text-sm leading-relaxed text-sarura-gray">
          {t("auth.gateBody")}
        </p>
        <div className="mt-5 space-y-3">
          <Link to={loginHref} className={buttonStyles({ fullWidth: true })}>
            {t("nav.login")}
          </Link>
          <Link
            to={registerHref}
            className={buttonStyles({ variant: "secondary", fullWidth: true })}
          >
            {t("nav.register")}
          </Link>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className={buttonStyles({ variant: "tertiary", fullWidth: true })}
          >
            {t("common.cancel")}
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-sarura-gray">{t("auth.gateReturnNote")}</p>
      </div>
    </div>
  );
}
