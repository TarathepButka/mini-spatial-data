package feature

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type Repository struct {
	collection *mongo.Collection
}

func NewRepository(collection *mongo.Collection) *Repository {
	return &Repository{collection: collection}
}

func (repository *Repository) EnsureIndexes(ctx context.Context) error {
	models := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "geometry", Value: "2dsphere"}},
			Options: options.Index().SetName("geometry_2dsphere"),
		},
		{
			Keys:    bson.D{{Key: "sourceId", Value: 1}},
			Options: options.Index().SetName("source_id_unique").SetUnique(true).SetSparse(true),
		},
		{
			Keys: bson.D{
				{Key: "properties.name", Value: "text"},
				{Key: "properties.province", Value: "text"},
				{Key: "properties.hotspotid", Value: "text"},
			},
			Options: options.Index().SetName("properties_text"),
		},
		{
			Keys:    bson.D{{Key: "properties.category", Value: 1}, {Key: "properties.province", Value: 1}},
			Options: options.Index().SetName("category_province"),
		},
		{
			Keys:    bson.D{{Key: "properties.confidence", Value: 1}},
			Options: options.Index().SetName("confidence"),
		},
	}
	_, err := repository.collection.Indexes().CreateMany(ctx, models)
	return err
}

func (repository *Repository) List(ctx context.Context, params ListParams) ([]FeatureDocument, int64, error) {
	filter := BuildFilter(params)
	total, err := repository.collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	findOptions := options.Find().
		SetSkip(int64((params.Page - 1) * params.Limit)).
		SetLimit(int64(params.Limit)).
		SetSort(bson.D{{Key: "updatedAt", Value: -1}, {Key: "_id", Value: -1}})

	cursor, err := repository.collection.Find(ctx, filter, findOptions)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	documents := make([]FeatureDocument, 0)
	if err := cursor.All(ctx, &documents); err != nil {
		return nil, 0, err
	}
	return documents, total, nil
}

func (repository *Repository) Nearby(ctx context.Context, params NearbyParams) ([]FeatureDocument, error) {
	filter := bson.M{
		"geometry": bson.M{
			"$near": bson.M{
				"$geometry": bson.M{
					"type":        "Point",
					"coordinates": []float64{params.Lng, params.Lat},
				},
				"$maxDistance": params.Radius,
			},
		},
	}

	cursor, err := repository.collection.Find(ctx, filter, options.Find().SetLimit(int64(params.Limit)))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	documents := make([]FeatureDocument, 0)
	if err := cursor.All(ctx, &documents); err != nil {
		return nil, err
	}
	return documents, nil
}

func (repository *Repository) Get(ctx context.Context, id string) (FeatureDocument, error) {
	objectID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return FeatureDocument{}, ValidationError{Message: "invalid feature id"}
	}
	var document FeatureDocument
	if err := repository.collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&document); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return FeatureDocument{}, ErrNotFound
		}
		return FeatureDocument{}, err
	}
	return document, nil
}

func (repository *Repository) Create(ctx context.Context, document FeatureDocument) (FeatureDocument, error) {
	now := time.Now().UTC()
	if document.ID.IsZero() {
		document.ID = bson.NewObjectID()
	}
	if document.CreatedAt.IsZero() {
		document.CreatedAt = now
	}
	document.UpdatedAt = now
	_, err := repository.collection.InsertOne(ctx, document)
	return document, err
}

func (repository *Repository) Update(ctx context.Context, id string, document FeatureDocument) (FeatureDocument, error) {
	objectID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return FeatureDocument{}, ValidationError{Message: "invalid feature id"}
	}
	now := time.Now().UTC()
	document.UpdatedAt = now
	document.Properties["updatedAt"] = now.Format(time.RFC3339)

	update := bson.M{
		"$set": bson.M{
			"type":       FeatureType,
			"geometry":   document.Geometry,
			"properties": document.Properties,
			"updatedAt":  document.UpdatedAt,
		},
	}

	var updated FeatureDocument
	err = repository.collection.FindOneAndUpdate(
		ctx,
		bson.M{"_id": objectID},
		update,
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	).Decode(&updated)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return FeatureDocument{}, ErrNotFound
		}
		return FeatureDocument{}, err
	}
	return updated, nil
}

func (repository *Repository) Delete(ctx context.Context, id string) error {
	objectID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return ValidationError{Message: "invalid feature id"}
	}
	result, err := repository.collection.DeleteOne(ctx, bson.M{"_id": objectID})
	if err != nil {
		return err
	}
	if result.DeletedCount == 0 {
		return ErrNotFound
	}
	return nil
}

func (repository *Repository) UpsertManyBySourceID(ctx context.Context, documents []FeatureDocument) (int, error) {
	models := make([]mongo.WriteModel, 0, len(documents))
	for _, document := range documents {
		if strings.TrimSpace(document.SourceID) == "" {
			continue
		}
		models = append(models, mongo.NewReplaceOneModel().
			SetFilter(bson.M{"sourceId": document.SourceID}).
			SetReplacement(document).
			SetUpsert(true))
	}
	if len(models) == 0 {
		return 0, nil
	}
	result, err := repository.collection.BulkWrite(ctx, models, options.BulkWrite().SetOrdered(false))
	if err != nil {
		return 0, err
	}
	return int(result.UpsertedCount + result.ModifiedCount), nil
}

func BuildFilter(params ListParams) bson.M {
	filter := bson.M{}

	if params.Search != "" {
		pattern := regexp.QuoteMeta(params.Search)
		regex := bson.Regex{Pattern: pattern, Options: "i"}
		filter["$or"] = bson.A{
			bson.M{"properties.name": regex},
			bson.M{"properties.hotspotid": regex},
			bson.M{"properties.province": regex},
			bson.M{"properties.amphoe": regex},
			bson.M{"properties.tambol": regex},
			bson.M{"properties.village": regex},
		}
	}

	if params.Category != "" {
		categories := splitParamList(params.Category)
		if len(categories) == 1 {
			filter["properties.category"] = categories[0]
		} else if len(categories) > 1 {
			filter["properties.category"] = bson.M{"$in": categories}
		}
	}

	if params.Province != "" {
		filter["properties.province"] = params.Province
	}

	if params.BBox != nil {
		filter["geometry"] = bson.M{
			"$geoWithin": bson.M{
				"$geometry": bboxPolygon(*params.BBox),
			},
		}
	}

	return filter
}

func bboxPolygon(bbox BBox) bson.M {
	return bson.M{
		"type": "Polygon",
		"coordinates": [][][]float64{{
			{bbox.MinLng, bbox.MinLat},
			{bbox.MaxLng, bbox.MinLat},
			{bbox.MaxLng, bbox.MaxLat},
			{bbox.MinLng, bbox.MaxLat},
			{bbox.MinLng, bbox.MinLat},
		}},
	}
}

func splitParamList(raw string) []string {
	parts := strings.Split(raw, ",")
	items := make([]string, 0, len(parts))
	for _, part := range parts {
		item := strings.TrimSpace(part)
		if item != "" {
			items = append(items, item)
		}
	}
	return items
}
