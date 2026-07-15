package api

import (
	"errors"

	"github.com/gin-gonic/gin"
)

var (
	ErrNotFound     = errors.New("not found")
	ErrValidation   = errors.New("validation error")
	ErrForbidden    = errors.New("forbidden")
	ErrUnauthorized = errors.New("unauthorized")
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

type ErrorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type ErrorResponse struct {
	Error ErrorBody `json:"error"`
}

func SendError(c *gin.Context, status int, code string, message string) {
	c.JSON(status, ErrorResponse{Error: ErrorBody{Code: code, Message: message}})
}
