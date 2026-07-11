package auth

type GoogleLoginRequest struct {
	Credential string `json:"credential"`
}

type User struct {
	Subject       string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"emailVerified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

type AuthResponse struct {
	Token     string `json:"-"`
	ExpiresAt string `json:"expiresAt"`
	User      User   `json:"user"`
}

type ErrorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type ErrorResponse struct {
	Error ErrorBody `json:"error"`
}
