import type { ReactNode } from "react";

export const textControlClassName = "h-10 rounded border border-zinc-200 px-3 font-normal outline-none focus:border-zinc-400";
export const textareaControlClassName = "resize-none rounded border border-zinc-200 px-3 py-2 font-normal outline-none focus:border-zinc-400";

type FormFieldProps = {
  children: ReactNode;
  className?: string;
  label: string;
};

export function FormField({ children, className = "", label }: FormFieldProps) {
  return (
    <label className={`grid gap-1 text-sm font-medium text-zinc-700 ${className}`}>
      {label}
      {children}
    </label>
  );
}
