package config

import "testing"

func TestValidateAllowsLocalWithoutAuthSecret(t *testing.T) {
	cfg := Config{AppEnv: "development"}
	if err := cfg.Validate(); err != nil {
		t.Fatalf("unexpected validation error: %v", err)
	}
}

func TestValidateRequiresSecretWhenAuthRequired(t *testing.T) {
	cfg := Config{AppEnv: "development", AuthRequired: true}
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected validation error")
	}
}

func TestValidateRejectsInsecureExampleSecret(t *testing.T) {
	cfg := Config{
		AppEnv:        "production",
		AuthJWTSecret: "change-me-to-at-least-32-random-characters",
	}
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected validation error")
	}
}

func TestValidateAcceptsStrongSecret(t *testing.T) {
	cfg := Config{
		AppEnv:        "production",
		AuthJWTSecret: "local-test-secret-with-more-than-32-characters",
	}
	if err := cfg.Validate(); err != nil {
		t.Fatalf("unexpected validation error: %v", err)
	}
}
