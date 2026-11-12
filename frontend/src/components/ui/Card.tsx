import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "../../lib/cx";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  padded?: boolean;
};

export function Card({ padded = false, className, ...props }: CardProps) {
  return (
    <div
      className={cx(
        "overflow-hidden rounded-xl border border-sarura-border bg-white shadow-card",
        padded && "p-5 sm:p-6",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("border-b border-sarura-border px-5 py-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cx("text-base font-bold tracking-tight text-sarura-ink", className)}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("px-5 py-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "flex flex-wrap items-center gap-2 border-t border-sarura-border px-5 py-4",
        className,
      )}
      {...props}
    />
  );
}

export type CardMetaProps = {
  children: ReactNode;
  className?: string;
};

export function CardMeta({ children, className }: CardMetaProps) {
  return <p className={cx("text-sm text-sarura-gray", className)}>{children}</p>;
}
