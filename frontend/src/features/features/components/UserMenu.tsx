import { useMemo, useState } from "react";
import type { AuthUser } from "../../../api/auth";
import { DropdownMenu } from "../../../components/ui/DropdownMenu";

type UserMenuProps = {
  user: AuthUser;
  onLogout: () => void;
  onSwitchRole: (role: string) => Promise<void>;
};

export function UserMenu({ user, onLogout, onSwitchRole }: UserMenuProps) {
  const displayName = user.name || user.email;
  const activeRole = normalizeRole(user.role);
  const roleLabel = formatRole(activeRole);
  const roles = useMemo(() => rolesForUser(user), [user]);
  const initials = useMemo(() => initialsFrom(displayName), [displayName]);
  const [switchingRole, setSwitchingRole] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  function handleLogout(close: () => void) {
    close();
    onLogout();
  }

  async function handleSwitchRole(role: string, close: () => void) {
    if (role === activeRole || switchingRole) {
      return;
    }

    setSwitchingRole(role);
    setSwitchError(null);
    try {
      await onSwitchRole(role);
      setRoleMenuOpen(false);
      close();
    } catch {
      setSwitchError("Unable to switch role.");
    } finally {
      setSwitchingRole(null);
    }
  }

  return (
    <DropdownMenu
      menuClassName="absolute right-0 z-40 mt-2 w-72 overflow-visible rounded border border-zinc-200 bg-white text-sm text-zinc-700 shadow-lg"
      renderTrigger={({ open, toggle }) => (
        <button
          type="button"
          title="User menu"
          aria-label="User menu"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={toggle}
          className={`inline-flex h-10 items-center gap-2 rounded-full border bg-white px-2 pl-3 text-sm text-zinc-700 transition focus:outline-none focus:ring-2 focus:ring-zinc-300 ${
            open ? "border-zinc-300 shadow-sm" : "border-transparent hover:border-zinc-300 hover:shadow-sm"
          }`}
        >
          <span className="hidden max-w-[220px] truncate sm:inline">
            {roleLabel ? `${roleLabel} | ` : ""}
            {displayName}
          </span>
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

          <div
            className="relative border-b border-zinc-100"
            onBlur={(event) => {
              const nextTarget = event.relatedTarget;
              if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
                return;
              }

              setRoleMenuOpen(false);
            }}
            onFocus={() => setRoleMenuOpen(true)}
            onMouseEnter={() => setRoleMenuOpen(true)}
            onMouseLeave={() => setRoleMenuOpen(false)}
          >
            <button
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={roleMenuOpen}
              onClick={() => setRoleMenuOpen((open) => !open)}
              className="flex h-11 w-full items-center justify-between px-4 text-left font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              <span>Switch role</span>
              <span className="text-xs font-semibold tracking-wide text-zinc-500">{roleLabel}</span>
            </button>

            {roleMenuOpen ? (
              <div
                role="menu"
                className="absolute right-full top-0 z-50 w-44 overflow-hidden rounded border border-zinc-200 bg-white py-1 text-sm text-zinc-700 shadow-lg"
              >
                {roles.map((role) => {
                  const active = role === activeRole;

                  return (
                    <button
                      key={role}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      disabled={active || switchingRole !== null}
                      onClick={() => handleSwitchRole(role, close)}
                      className={`flex h-10 w-full items-center justify-between px-3 text-left font-medium transition ${
                        active ? "bg-zinc-950 text-white" : "text-zinc-700 hover:bg-zinc-100"
                      } disabled:cursor-default disabled:opacity-100`}
                    >
                      <span>{formatRole(role)}</span>
                      <span className={`text-xs ${active ? "text-white" : "text-zinc-400"}`}>{active ? "ACTIVE" : ""}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {switchError ? <div className="px-4 pb-2 text-xs text-red-600">{switchError}</div> : null}
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => handleLogout(close)}
            className="flex h-11 w-full items-center border-t border-zinc-100 px-4 text-left font-medium text-red-600 transition hover:bg-red-50"
          >
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

function rolesForUser(user: AuthUser) {
  const roles = [user.role, ...(user.roles ?? [])]
    .map(normalizeRole)
    .filter(Boolean);

  return Array.from(new Set(roles));
}

function normalizeRole(role?: string) {
  return role?.trim().toLowerCase() || "";
}

function formatRole(role: string) {
  return role.trim().toUpperCase();
}
