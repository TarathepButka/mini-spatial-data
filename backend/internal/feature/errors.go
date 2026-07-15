package feature

import "github.com/example/mini-spatial-data/backend/internal/shared/api"

var (
	ErrNotFound   = api.ErrNotFound
	ErrValidation = api.ErrValidation
	ErrForbidden  = api.ErrForbidden
)

type ValidationError = api.ValidationError

