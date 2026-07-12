import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  size?: "sm" | "md";
  variant?: "primary" | "secondary" | "danger";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, className = "", size = "md", variant = "secondary", ...props },
  ref,
) {
  const sizeClassName = size === "sm" ? "h-9 px-3" : "h-10 px-4";
  const variantClassName =
    variant === "primary"
      ? "bg-zinc-950 font-semibold text-white hover:bg-zinc-800"
      : variant === "danger"
        ? "bg-red-600 font-semibold text-white hover:bg-red-700"
        : "border border-zinc-200 bg-white font-medium text-zinc-700 hover:border-zinc-400";

  return (
    <button
      type="button"
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${sizeClassName} ${variantClassName} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});
