import { ChevronDown } from "lucide-react";
import { useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useDropdownDismiss } from "../../hooks/useDropdownDismiss";

type DropdownMenuProps = {
  children: ReactNode | ((helpers: { close: () => void }) => ReactNode);
  containerClassName?: string;
  menuClassName?: string;
  renderTrigger: (helpers: { open: boolean; toggle: () => void; close: () => void }) => ReactNode;
};

export function DropdownMenu({
  children,
  containerClassName = "relative",
  menuClassName = "absolute left-0 z-30 mt-2 max-h-80 w-60 overflow-auto rounded border border-zinc-200 bg-white p-2 text-sm text-zinc-700 shadow-lg",
  renderTrigger,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useDropdownDismiss(containerRef, setOpen);

  const close = () => setOpen(false);
  const toggle = () => setOpen((value) => !value);

  return (
    <div ref={containerRef} className={containerClassName}>
      {renderTrigger({ open, toggle, close })}

      {open ? (
        <div role="menu" className={menuClassName}>
          {typeof children === "function" ? children({ close }) : children}
        </div>
      ) : null}
    </div>
  );
}

type DropdownTriggerButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  open: boolean;
  size?: "sm" | "md";
};

export function DropdownTriggerButton({
  children,
  className = "",
  icon,
  open,
  size = "md",
  ...props
}: DropdownTriggerButtonProps) {
  const sizeClassName = size === "sm" ? "h-9 min-w-32" : "h-10 min-w-44";

  return (
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      className={`inline-flex ${sizeClassName} items-center justify-between gap-2 rounded border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 ${className}`}
      {...props}
    >
      <span className="inline-flex min-w-0 items-center gap-2">
        {icon}
        <span className="truncate">{children}</span>
      </span>
      <ChevronDown size={16} className={`shrink-0 transition ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

type DropdownMenuItemProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

export function DropdownMenuItem({ active = false, children, className = "", ...props }: DropdownMenuItemProps) {
  return (
    <button
      type="button"
      className={`flex h-9 w-full items-center justify-between rounded px-2 text-left transition hover:bg-zinc-100 ${
        active ? "font-medium text-zinc-950" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator() {
  return <div className="my-2 h-px bg-zinc-100" />;
}
