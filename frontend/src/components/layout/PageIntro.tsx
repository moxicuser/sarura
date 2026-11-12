import type { ReactNode } from "react";

export type PageIntroProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
};

/** Shared heading band for the public static pages. */
export function PageIntro({ eyebrow, title, description, children }: PageIntroProps) {
  return (
    <section className="border-b border-sarura-border bg-sarura-green-light">
      <div className="sarura-container py-10 sm:py-14">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-sarura-green-dark">
          {eyebrow}
        </p>
        <h1 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight text-sarura-ink sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-sarura-gray">
            {description}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}
