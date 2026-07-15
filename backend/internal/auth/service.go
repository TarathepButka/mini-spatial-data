package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/example/mini-spatial-data/backend/internal/config"
	"github.com/golang-jwt/jwt/v5"
	"google.golang.org/api/idtoken"
)

var (
	ErrNotConfigured   = errors.New("google login is not configured")
	ErrInvalidToken    = errors.New("invalid auth token")
	ErrEmailUnverified = errors.New("google email is not verified")
	ErrRoleNotAllowed  = errors.New("role is not available for this user")
)

const jwtIssuer = "mini-spatial-data"

type Service struct {
	googleClientID string
	jwtSecret      []byte
	tokenTTL       time.Duration
	repository     UserRepository
	now            func() time.Time
}

type UserRepository interface {
	FindByEmail(ctx context.Context, email string) (UserDocument, error)
	UpsertLogin(ctx context.Context, user User) (UserDocument, error)
}

type Claims struct {
	User User `json:"user"`
	jwt.RegisteredClaims
}

func NewService(cfg config.Config, repository UserRepository) *Service {
	return &Service{
		googleClientID: strings.TrimSpace(cfg.GoogleClientID),
		jwtSecret:      []byte(cfg.AuthJWTSecret),
		tokenTTL:       cfg.AuthTokenTTL,
		repository:     repository,
		now:            func() time.Time { return time.Now().UTC() },
	}
}

func (service *Service) LoginWithGoogle(ctx context.Context, credential string) (AuthResponse, error) {
	if service.googleClientID == "" {
		return AuthResponse{}, ErrNotConfigured
	}

	if strings.TrimSpace(credential) == "" {
		return AuthResponse{}, ErrInvalidToken
	}

	payload, err := idtoken.Validate(ctx, credential, service.googleClientID)
	if err != nil {
		return AuthResponse{}, fmt.Errorf("%w: %v", ErrInvalidToken, err)
	}

	user := userFromGooglePayload(payload)
	if user.Subject == "" || user.Email == "" {
		return AuthResponse{}, ErrInvalidToken
	}

	if !user.EmailVerified {
		return AuthResponse{}, ErrEmailUnverified
	}

	user, err = service.userFromLogin(ctx, user)
	if err != nil {
		return AuthResponse{}, err
	}

	return service.IssueToken(user)
}

func (service *Service) IssueToken(user User) (AuthResponse, error) {
	user = userWithPermissions(user)
	now := service.now()
	expiresAt := now.Add(service.tokenTTL)
	claims := Claims{
		User: user,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.Subject,
			Issuer:    jwtIssuer,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(service.jwtSecret)
	if err != nil {
		return AuthResponse{}, err
	}

	return AuthResponse{
		Token:     signed,
		ExpiresAt: expiresAt.Format(time.RFC3339),
		User:      user,
	}, nil
}

func (service *Service) ParseToken(ctx context.Context, rawToken string) (User, error) {
	rawToken = strings.TrimSpace(rawToken)
	if rawToken == "" {
		return User{}, ErrInvalidToken
	}

	claims := &Claims{}
	token, err := jwt.ParseWithClaims(rawToken, claims, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}

		return service.jwtSecret, nil
	}, jwt.WithIssuer(jwtIssuer))
	if err != nil || !token.Valid {
		return User{}, ErrInvalidToken
	}

	if claims.User.Subject == "" || claims.User.Email == "" {
		return User{}, ErrInvalidToken
	}

	return service.userFromDatabase(ctx, claims.User)
}

func (service *Service) SwitchRole(ctx context.Context, user User, role Role) (AuthResponse, error) {
	user = userWithPermissions(user)
	requestedRole, ok := ParseRole(role)
	if !ok {
		return AuthResponse{}, ErrRoleNotAllowed
	}

	if !RoleAllowed(requestedRole, user.Roles) {
		return AuthResponse{}, ErrRoleNotAllowed
	}

	user.Role = requestedRole

	return service.IssueToken(user)
}

func userFromGooglePayload(payload *idtoken.Payload) User {
	return User{
		Subject:       payload.Subject,
		Email:         stringClaim(payload.Claims, "email"),
		EmailVerified: boolClaim(payload.Claims, "email_verified"),
		Name:          stringClaim(payload.Claims, "name"),
		Picture:       stringClaim(payload.Claims, "picture"),
	}
}

func (service *Service) userFromLogin(ctx context.Context, user User) (User, error) {
	if service.repository == nil {
		return userWithPermissions(user), nil
	}

	document, err := service.repository.UpsertLogin(ctx, user)
	if err != nil {
		return User{}, err
	}

	return userWithDocument(user, document), nil
}

func (service *Service) userFromDatabase(ctx context.Context, user User) (User, error) {
	if service.repository == nil {
		return userWithPermissions(user), nil
	}

	document, err := service.repository.FindByEmail(ctx, user.Email)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			return userWithPermissions(user), nil
		}

		return User{}, err
	}

	return userWithDocument(user, document), nil
}

func userWithDocument(user User, document UserDocument) User {
	user.Roles = rolesFromDocument(document)
	user.Role = activeRole(user.Role, user.Roles)

	return userWithPermissions(user)
}

func userWithPermissions(user User) User {
	if len(user.Roles) == 0 && strings.TrimSpace(string(user.Role)) != "" {
		user.Roles = NormalizeRoles([]Role{user.Role})
	} else {
		user.Roles = NormalizeRoles(user.Roles)
	}

	user.Role = activeRole(user.Role, user.Roles)
	user.Permissions = PermissionsForRole(user.Role)

	return user
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func stringClaim(claims map[string]any, key string) string {
	value, ok := claims[key]
	if !ok || value == nil {
		return ""
	}

	if typed, ok := value.(string); ok {
		return strings.TrimSpace(typed)
	}

	return strings.TrimSpace(fmt.Sprint(value))
}

func boolClaim(claims map[string]any, key string) bool {
	value, ok := claims[key]
	if !ok || value == nil {
		return false
	}

	switch typed := value.(type) {
	case bool:
		return typed
	case string:
		return strings.EqualFold(typed, "true")
	default:
		return false
	}
}
