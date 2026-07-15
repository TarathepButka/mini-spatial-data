package feature

import (
	"errors"
	"net/http"

	"github.com/example/mini-spatial-data/backend/internal/auth"
	"github.com/example/mini-spatial-data/backend/internal/shared/api"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

type RoutePermissions struct {
	Read   gin.HandlerFunc
	Create gin.HandlerFunc
	Edit   gin.HandlerFunc
	Delete gin.HandlerFunc
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func RegisterRoutes(router gin.IRouter, handler *Handler, permissions RoutePermissions) {
	registerResourceRoutes(router.Group("/features"), handler, permissions)
}

func registerResourceRoutes(group gin.IRouter, handler *Handler, permissions RoutePermissions) {
	group.GET("", withMiddleware(permissions.Read, handler.List)...)
	group.GET("/nearby", withMiddleware(permissions.Read, handler.Nearby)...)
	group.GET("/:id", withMiddleware(permissions.Read, handler.Get)...)
	group.POST("", withMiddleware(permissions.Create, handler.Create)...)
	group.PUT("/:id", withMiddleware(permissions.Edit, handler.Update)...)
	group.DELETE("/:id", withMiddleware(permissions.Delete, handler.Delete)...)
}

func (handler *Handler) List(c *gin.Context) {
	params, err := NewListParams(c.Request.URL.Query())
	if err != nil {
		writeError(c, err)

		return
	}

	if actor := actorFromRequest(c); actor != nil {
		_ = handler.service.EnsureSeededForUser(c.Request.Context(), actor)
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

	feature, err := handler.service.Create(c.Request.Context(), input, actorFromRequest(c))
	if err != nil {
		writeError(c, err)

		return
	}

	c.JSON(http.StatusCreated, feature)
}

func (handler *Handler) Update(c *gin.Context) {
	user, ok := auth.UserFromContext(c)
	if !ok {
		api.SendError(c, http.StatusUnauthorized, "unauthorized", "authentication is required")

		return
	}

	var input FeatureInput
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, ValidationError{Message: "request body must be a valid GeoJSON Feature"})

		return
	}

	var (
		feature Feature
		err     error
	)
	if user.HasPermission(auth.PermissionDelete) {
		// Admin: can edit any record
		feature, err = handler.service.Update(c.Request.Context(), c.Param("id"), input)
	} else {
		// Regular user: can only edit own records
		feature, err = handler.service.UpdateOwn(c.Request.Context(), c.Param("id"), input, actorFromUser(user))
	}

	if err != nil {
		writeError(c, err)

		return
	}

	c.JSON(http.StatusOK, feature)
}

func (handler *Handler) Delete(c *gin.Context) {
	user, ok := auth.UserFromContext(c)
	if !ok {
		api.SendError(c, http.StatusUnauthorized, "unauthorized", "authentication is required")

		return
	}

	var err error
	if user.HasPermission(auth.PermissionDelete) {
		err = handler.service.Delete(c.Request.Context(), c.Param("id"))
	} else {
		err = handler.service.DeleteOwn(c.Request.Context(), c.Param("id"), actorFromUser(user))
	}

	if err != nil {
		writeError(c, err)

		return
	}

	c.JSON(http.StatusOK, DeleteResponse{Deleted: true})
}

func actorFromRequest(c *gin.Context) *Actor {
	user, ok := auth.UserFromContext(c)
	if !ok {
		return nil
	}

	return actorFromUser(user)
}

func actorFromUser(user auth.User) *Actor {
	return &Actor{
		Subject: user.Subject,
		Email:   user.Email,
		Name:    user.Name,
	}
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
	} else if errors.Is(err, ErrForbidden) {
		status = http.StatusForbidden
		code = "forbidden"
		message = "permission denied"
	}

	api.SendError(c, status, code, message)
}

func withMiddleware(middleware gin.HandlerFunc, handler gin.HandlerFunc) []gin.HandlerFunc {
	if middleware == nil {
		return []gin.HandlerFunc{handler}
	}

	return []gin.HandlerFunc{middleware, handler}
}
