package feature

import "errors"

var (
	ErrNotFound   = errors.New("feature not found")
	ErrValidation = errors.New("validation error")
	ErrForbidden  = errors.New("forbidden")
)

type ValidationError struct {
	Message string
}

func (err ValidationError) Error() string {
	return err.Message
}

func (err ValidationError) Is(target error) bool {
	return target == ErrValidation
}
