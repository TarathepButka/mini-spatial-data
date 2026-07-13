import { describe, expect, it } from "vitest";
import type { AuthUser } from "../../api/auth";
import type { SpatialFeature } from "../../types/geojson";
import { canDeleteFeature, permissionFlagsForUser } from "./permissionFlags";

const user: AuthUser = {
  sub: "user-sub",
  email: "user@example.com",
  emailVerified: true,
  name: "User",
  picture: "",
  role: "user",
  roles: ["user"],
  permissions: ["read", "create", "edit"],
};

const admin: AuthUser = {
  sub: "admin-sub",
  email: "admin@example.com",
  emailVerified: true,
  name: "Admin",
  picture: "",
  role: "admin",
  roles: ["admin", "user"],
  permissions: ["read", "create", "edit", "delete", "seed"],
};

describe("permissionFlagsForUser", () => {
  it("maps normal user permissions to UI flags", () => {
    expect(permissionFlagsForUser(user)).toEqual({
      canCreateFeature: true,
      canEditFeature: true,
      canDeleteAnyFeature: false,
      canSeedVallaris: false,
    });
  });

  it("maps admin permissions to UI flags", () => {
    expect(permissionFlagsForUser(admin)).toEqual({
      canCreateFeature: true,
      canEditFeature: true,
      canDeleteAnyFeature: true,
      canSeedVallaris: true,
    });
  });

  it("disables all UI flags when there is no user", () => {
    expect(permissionFlagsForUser(null)).toEqual({
      canCreateFeature: false,
      canEditFeature: false,
      canDeleteAnyFeature: false,
      canSeedVallaris: false,
    });
  });

  it("allows users to delete their own feature", () => {
    expect(canDeleteFeature(user, featureOwnedBy(user))).toBe(true);
    expect(canDeleteFeature(user, featureOwnedBy(admin))).toBe(false);
  });

  it("allows admins to delete any feature", () => {
    expect(canDeleteFeature(admin, featureOwnedBy(user))).toBe(true);
  });
});

function featureOwnedBy(owner: AuthUser): SpatialFeature {
  return {
    id: "feature-id",
    type: "Feature",
    geometry: { type: "Point", coordinates: [100.5, 13.7] },
    properties: {
      name: "Owned feature",
      createdBy: {
        sub: owner.sub,
        email: owner.email,
      },
    },
  };
}
