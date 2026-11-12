import type { ButtonHTMLAttributes } from "react";

import { cx } from "../../lib/cx";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonStyleOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-sarura-green text-white hover:bg-sarura-green-dark",
  secondary:
    "border-[1.5px] border-sarura-green bg-white text-sarura-green hover:bg-sarura-green-light",
  tertiary:
    "bg-transparent text-sarura-gray hover:bg-sarura-green-light hover:text-sarura-green-dark",
  danger:
    "border-[1.5px] border-sarura-red bg-white text-sarura-red hover:bg-sarura-red/5",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: ButtonStyleOptions = {}): string {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sarura-green focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && "w-full",
    className,
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonStyleOptions;

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, fullWidth, className })}
      {...props}
    />
  );
}
