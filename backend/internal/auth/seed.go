package auth

type SeedUser struct {
	Email string
	Role  Role
	Roles []Role
}

var DefaultSeedUsers = []SeedUser{
	{Email: "tarathep.butka@gmail.com", Role: RoleAdmin, Roles: []Role{RoleAdmin, RoleUser}},
}
