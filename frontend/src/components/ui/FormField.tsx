import type { ReactNode } from "react";

export const textControlClassName = "h-10 rounded border border-zinc-200 px-3 font-normal outline-none focus:border-zinc-400";
export const textareaControlClassName = "resize-none rounded border border-zinc-200 px-3 py-2 font-normal outline-none focus:border-zinc-400";

type FormFieldProps = {
  children: ReactNode;
  className?: string;
  label: string;
  required?: boolean;
  error?: string;
};

export function FormField({ children, className = "", label, required, error }: FormFieldProps) {
  return (
    <label className={`grid gap-1 text-sm font-medium text-zinc-700 ${className}`}>
      <span>
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
      {error && <span className="text-xs font-normal text-red-500">{error}</span>}
    </label>
  );
}
