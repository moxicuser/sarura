import type { ReactNode } from "react";

export type AuthShellProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

/** Centered card shared by the login, register and password pages. */
export function AuthShell({ eyebrow, title, description, children, footer }: AuthShellProps) {
  return (
    <section className="sarura-container py-10 sm:py-14">
      <div className="mx-auto w-full max-w-lg">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-sarura-green-dark">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-sarura-ink sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-3 text-base leading-relaxed text-sarura-gray">{description}</p>
        )}
        <div className="mt-6 rounded-xl border border-sarura-border bg-white p-5 shadow-sm sm:p-6">
          {children}
        </div>
        {footer && <div className="mt-4 text-sm text-sarura-gray">{footer}</div>}
      </div>
    </section>
  );
}
