import { LogOut, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import type { AuthUser } from "../../api/auth";
import { DropdownMenu } from "../../components/ui/DropdownMenu";

type UserMenuProps = {
  user: AuthUser;
  onLogout: () => void;
};

export function UserMenu({ user, onLogout }: UserMenuProps) {
  const displayName = user.name || user.email;
  const role = user.role?.trim() || "";
  const initials = useMemo(() => initialsFrom(displayName), [displayName]);

  function handleLogout(close: () => void) {
    close();
    onLogout();
  }

  return (
    <DropdownMenu
      menuClassName="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded border border-zinc-200 bg-white text-sm text-zinc-700 shadow-lg"
      renderTrigger={({ open, toggle }) => (
        <button
          type="button"
          title="User menu"
          aria-label="User menu"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={toggle}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white text-zinc-700 transition focus:outline-none focus:ring-2 focus:ring-zinc-300 ${
            open ? "border-zinc-300 shadow-sm" : "border-transparent hover:border-zinc-300 hover:shadow-sm"
          }`}
        >
          <Avatar picture={user.picture} name={displayName} initials={initials} sizeClassName="h-8 w-8" />
        </button>
      )}
    >
      {({ close }) => (
        <>
          <div className="flex items-center gap-3 border-b border-zinc-100 px-3 py-3">
            <Avatar picture={user.picture} name={displayName} initials={initials} sizeClassName="h-10 w-10" />
            <div className="min-w-0">
              <div className="truncate font-medium text-zinc-950">{displayName}</div>
              <div className="truncate text-xs text-zinc-500">{user.email}</div>
            </div>
          </div>

          {role ? (
            <div className="p-2">
              <div className="flex min-h-10 items-center gap-3 rounded px-2 py-2 text-zinc-700">
                <ShieldCheck size={17} className="shrink-0 text-zinc-500" />
                <div className="min-w-0">
                  <div className="font-medium">Role</div>
                  <div className="truncate text-xs text-zinc-500">{role}</div>
                </div>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            role="menuitem"
            onClick={() => handleLogout(close)}
            className="flex h-11 w-full items-center gap-3 border-t border-zinc-100 px-4 text-left font-medium text-red-600 transition hover:bg-red-50"
          >
            <LogOut size={17} className="shrink-0" />
            Logout
          </button>
        </>
      )}
    </DropdownMenu>
  );
}

type AvatarProps = {
  picture: string;
  name: string;
  initials: string;
  sizeClassName: string;
};

function Avatar({ picture, name, initials, sizeClassName }: AvatarProps) {
  if (picture) {
    return <img src={picture} alt={name} className={`${sizeClassName} shrink-0 rounded-full object-cover`} />;
  }

  return (
    <span
      aria-hidden="true"
      className={`${sizeClassName} inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white`}
    >
      {initials}
    </span>
  );
}

function initialsFrom(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "U";
  const second = parts.length > 1 ? parts[1]?.[0] : "";
  return `${first}${second}`.toUpperCase();
}
