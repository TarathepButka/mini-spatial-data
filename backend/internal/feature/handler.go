package feature

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func RegisterRoutes(router gin.IRouter, handler *Handler, requireAuth gin.HandlerFunc) {
	registerResourceRoutes(router.Group("/features"), handler, requireAuth)
}

func registerResourceRoutes(group gin.IRouter, handler *Handler, requireAuth gin.HandlerFunc) {
	group.GET("", handler.List)
	group.GET("/nearby", handler.Nearby)
	group.GET("/:id", handler.Get)
	group.POST("", withMiddleware(requireAuth, handler.Create)...)
	group.PUT("/:id", withMiddleware(requireAuth, handler.Update)...)
	group.DELETE("/:id", withMiddleware(requireAuth, handler.Delete)...)
}

func (handler *Handler) List(c *gin.Context) {
	params, err := NewListParams(c.Request.URL.Query())
	if err != nil {
		writeError(c, err)
		return
	}
	response, err := handler.service.List(c.Request.Context(), params)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, response)
}

func (handler *Handler) Nearby(c *gin.Context) {
	params, err := NewNearbyParams(c.Request.URL.Query())
	if err != nil {
		writeError(c, err)
		return
	}
	response, err := handler.service.Nearby(c.Request.Context(), params)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, response)
}

func (handler *Handler) Get(c *gin.Context) {
	feature, err := handler.service.Get(c.Request.Context(), c.Param("id"))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, feature)
}

func (handler *Handler) Create(c *gin.Context) {
	var input FeatureInput
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, ValidationError{Message: "request body must be a valid GeoJSON Feature"})
		return
	}
	feature, err := handler.service.Create(c.Request.Context(), input)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, feature)
}

func (handler *Handler) Update(c *gin.Context) {
	var input FeatureInput
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, ValidationError{Message: "request body must be a valid GeoJSON Feature"})
		return
	}
	feature, err := handler.service.Update(c.Request.Context(), c.Param("id"), input)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, feature)
}

func (handler *Handler) Delete(c *gin.Context) {
	if err := handler.service.Delete(c.Request.Context(), c.Param("id")); err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, DeleteResponse{Deleted: true})
}

func writeError(c *gin.Context, err error) {
	status := http.StatusInternalServerError
	code := "internal_error"
	message := "internal server error"

	if errors.Is(err, ErrValidation) {
		status = http.StatusBadRequest
		code = "validation_error"
		message = err.Error()
	} else if errors.Is(err, ErrNotFound) {
		status = http.StatusNotFound
		code = "not_found"
		message = "feature not found"
	}

	c.JSON(status, ErrorResponse{Error: ErrorBody{Code: code, Message: message}})
}

func withMiddleware(middleware gin.HandlerFunc, handler gin.HandlerFunc) []gin.HandlerFunc {
	if middleware == nil {
		return []gin.HandlerFunc{handler}
	}
	return []gin.HandlerFunc{middleware, handler}
}
