package auth

import (
	"strings"

	"github.com/example/mini-spatial-data/backend/internal/shared/api"
)

type GoogleLoginRequest struct {
	Credential string `json:"credential"`
}

type SwitchRoleRequest struct {
	Role Role `json:"role" binding:"required"`
}

type Role string

const (
	RoleUser  Role = "user"
	RoleAdmin Role = "admin"
)

type Permission string

const (
	PermissionRead   Permission = "read"
	PermissionCreate Permission = "create"
	PermissionEdit   Permission = "edit"
	PermissionDelete Permission = "delete"
	PermissionSeed   Permission = "seed"
)

type User struct {
	Subject       string       `json:"sub"`
	Email         string       `json:"email"`
	EmailVerified bool         `json:"emailVerified"`
	Name          string       `json:"name"`
	Picture       string       `json:"picture"`
	Role          Role         `json:"role"`
	Roles         []Role       `json:"roles"`
	Permissions   []Permission `json:"permissions"`
}

type AuthResponse struct {
	Token     string `json:"-"`
	ExpiresAt string `json:"expiresAt"`
	User      User   `json:"user"`
}

type ErrorBody = api.ErrorBody
type ErrorResponse = api.ErrorResponse

func NormalizeRole(role Role) Role {
	normalized, ok := ParseRole(role)
	if !ok {
		return RoleUser
	}

	return normalized
}

func ParseRole(role Role) (Role, bool) {
	switch Role(strings.ToLower(strings.TrimSpace(string(role)))) {
	case RoleAdmin:
		return RoleAdmin, true
	case RoleUser:
		return RoleUser, true
	default:
		return "", false
	}
}

func NormalizeRoles(roles []Role) []Role {
	normalized := make([]Role, 0, len(roles))
	seen := map[Role]struct{}{}
	for _, role := range roles {
		next, ok := ParseRole(role)
		if !ok {
			continue
		}

		if _, exists := seen[next]; exists {
			continue
		}

		seen[next] = struct{}{}
		normalized = append(normalized, next)
	}

	if len(normalized) == 0 {
		return []Role{RoleUser}
	}

	return normalized
}

func RoleAllowed(role Role, roles []Role) bool {
	normalized, ok := ParseRole(role)
	if !ok {
		return false
	}

	for _, allowed := range NormalizeRoles(roles) {
		if allowed == normalized {
			return true
		}
	}

	return false
}

func PermissionsForRole(role Role) []Permission {
	if NormalizeRole(role) == RoleAdmin {
		return []Permission{
			PermissionRead,
			PermissionCreate,
			PermissionEdit,
			PermissionDelete,
			PermissionSeed,
		}
	}

	return []Permission{
		PermissionRead,
		PermissionCreate,
		PermissionEdit,
	}
}

func (user User) HasPermission(permission Permission) bool {
	for _, allowed := range PermissionsForRole(user.Role) {
		if allowed == permission {
			return true
		}
	}

	return false
}
