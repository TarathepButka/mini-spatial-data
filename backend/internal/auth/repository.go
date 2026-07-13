package auth

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

var ErrUserNotFound = errors.New("user not found")

type UserDocument struct {
	ID            bson.ObjectID `bson:"_id,omitempty"`
	Email         string        `bson:"email"`
	Subject       string        `bson:"subject,omitempty"`
	EmailVerified bool          `bson:"emailVerified"`
	Name          string        `bson:"name,omitempty"`
	Picture       string        `bson:"picture,omitempty"`
	Role          Role          `bson:"role"`
	Roles         []Role        `bson:"roles,omitempty"`
	CreatedAt     time.Time     `bson:"createdAt"`
	UpdatedAt     time.Time     `bson:"updatedAt"`
}

type Repository struct {
	collection *mongo.Collection
}

func NewRepository(collection *mongo.Collection) *Repository {
	return &Repository{collection: collection}
}

func (repository *Repository) EnsureIndexes(ctx context.Context) error {
	models := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "email", Value: 1}},
			Options: options.Index().SetName("email_unique").SetUnique(true),
		},
	}
	_, err := repository.collection.Indexes().CreateMany(ctx, models)

	return err
}

func (repository *Repository) FindByEmail(ctx context.Context, email string) (UserDocument, error) {
	var document UserDocument
	if err := repository.collection.FindOne(ctx, bson.M{"email": normalizeEmail(email)}).Decode(&document); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return UserDocument{}, ErrUserNotFound
		}

		return UserDocument{}, err
	}

	return document, nil
}

func (repository *Repository) UpsertLogin(ctx context.Context, user User) (UserDocument, error) {
	now := time.Now().UTC()
	email := normalizeEmail(user.Email)
	if email == "" {
		return UserDocument{}, ErrInvalidToken
	}

	existing, err := repository.FindByEmail(ctx, email)
	if err != nil && !errors.Is(err, ErrUserNotFound) {
		return UserDocument{}, err
	}

	role := RoleUser
	roles := []Role{RoleUser}
	if err == nil {
		roles = rolesFromDocument(existing)
		role = activeRole(existing.Role, roles)
	}

	update := bson.M{
		"$set": bson.M{
			"subject":       user.Subject,
			"emailVerified": user.EmailVerified,
			"name":          user.Name,
			"picture":       user.Picture,
			"role":          role,
			"roles":         roles,
			"updatedAt":     now,
		},
		"$setOnInsert": bson.M{
			"_id":       bson.NewObjectID(),
			"email":     email,
			"createdAt": now,
		},
	}

	var document UserDocument
	err = repository.collection.FindOneAndUpdate(
		ctx,
		bson.M{"email": email},
		update,
		options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After),
	).Decode(&document)

	return document, err
}

func (repository *Repository) SeedUsers(ctx context.Context, seeds []SeedUser) error {
	now := time.Now().UTC()
	for _, seed := range seeds {
		email := normalizeEmail(seed.Email)
		if email == "" {
			continue
		}

		roles := rolesFromSeed(seed)
		role := activeRole(seed.Role, roles)
		update := bson.M{
			"$set": bson.M{
				"role":      role,
				"roles":     roles,
				"updatedAt": now,
			},
			"$setOnInsert": bson.M{
				"_id":           bson.NewObjectID(),
				"email":         email,
				"emailVerified": true,
				"createdAt":     now,
			},
		}

		if _, err := repository.collection.UpdateOne(ctx, bson.M{"email": email}, update, options.UpdateOne().SetUpsert(true)); err != nil {
			return err
		}
	}

	return nil
}

func rolesFromSeed(seed SeedUser) []Role {
	if len(seed.Roles) > 0 {
		return NormalizeRoles(seed.Roles)
	}

	return NormalizeRoles([]Role{seed.Role})
}

func rolesFromDocument(document UserDocument) []Role {
	if len(document.Roles) > 0 {
		return NormalizeRoles(document.Roles)
	}

	return NormalizeRoles([]Role{document.Role})
}

func activeRole(role Role, roles []Role) Role {
	normalizedRoles := NormalizeRoles(roles)
	if RoleAllowed(role, normalizedRoles) {
		normalized, _ := ParseRole(role)

		return normalized
	}

	return normalizedRoles[0]
}
