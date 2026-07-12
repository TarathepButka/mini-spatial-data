import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "ghost" | "danger" | "secondary";
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { children, className = "", variant = "ghost", ...props },
  ref,
) {
  const variantClassName =
    variant === "danger"
      ? "text-red-600 hover:bg-red-50"
      : variant === "secondary"
        ? "border border-zinc-200 text-zinc-700 hover:border-zinc-400"
        : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950";

  return (
    <button
      type="button"
      ref={ref}
      className={`rounded p-2 transition disabled:cursor-not-allowed disabled:opacity-50 ${variantClassName} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});
