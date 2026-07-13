import type { SpatialFeature } from "../../types/geojson";
import { hasPermission, type AuthUser } from "../../api/auth";

export type PermissionFlags = {
  canCreateFeature: boolean;
  canEditFeature: boolean;
  canDeleteAnyFeature: boolean;
  canSeedVallaris: boolean;
};

export function permissionFlagsForUser(user: AuthUser | null): PermissionFlags {
  return {
    canCreateFeature: hasPermission(user, "create"),
    canEditFeature: hasPermission(user, "edit"),
    canDeleteAnyFeature: hasPermission(user, "delete"),
    canSeedVallaris: hasPermission(user, "seed"),
  };
}

export function canDeleteFeature(user: AuthUser | null, feature: SpatialFeature, flags = permissionFlagsForUser(user)) {
  if (flags.canDeleteAnyFeature) {
    return true;
  }

  if (!user) {
    return false;
  }

  const owner = feature.properties.createdBy;
  if (!owner) {
    return false;
  }

  if (owner.sub && owner.sub === user.sub) {
    return true;
  }

  return Boolean(owner.email && owner.email.toLowerCase() === user.email.toLowerCase());
}
