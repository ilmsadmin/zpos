package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/zplus/pos/internal/dto"
	"github.com/zplus/pos/internal/model"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// NotificationRepository defines the interface for notification data access (MongoDB)
type NotificationRepository interface {
	Create(ctx context.Context, notification *model.Notification) error
	GetByID(ctx context.Context, id string) (*model.Notification, error)
	List(ctx context.Context, storeID, userID uuid.UUID, params NotificationListParams) ([]model.Notification, int64, error)
	CountUnread(ctx context.Context, storeID, userID uuid.UUID) (int64, error)
	MarkAsRead(ctx context.Context, id string) error
	MarkAllAsRead(ctx context.Context, storeID, userID uuid.UUID) error
	DeleteOld(ctx context.Context, before time.Time) (int64, error)

	// User notification preferences (stored in MongoDB)
	GetPreferences(ctx context.Context, userID uuid.UUID) (*dto.NotificationPreferences, error)
	SavePreferences(ctx context.Context, userID uuid.UUID, prefs *dto.NotificationPreferences) error
}

// NotificationListParams for filtering notifications
type NotificationListParams struct {
	Page   int
	Limit  int
	Type   string
	IsRead *bool
}

// mongoNotificationRepo implements NotificationRepository using MongoDB
type mongoNotificationRepo struct {
	db *mongo.Database
}

func NewMongoNotificationRepository(db *mongo.Database) NotificationRepository {
	return &mongoNotificationRepo{db: db}
}

func (r *mongoNotificationRepo) collection() *mongo.Collection {
	return r.db.Collection("notifications")
}

func (r *mongoNotificationRepo) prefsCollection() *mongo.Collection {
	return r.db.Collection("notification_preferences")
}

func (r *mongoNotificationRepo) Create(ctx context.Context, notification *model.Notification) error {
	if notification.ID == "" {
		notification.ID = primitive.NewObjectID().Hex()
	}
	notification.CreatedAt = time.Now()
	notification.IsRead = false

	_, err := r.collection().InsertOne(ctx, notification)
	return err
}

func (r *mongoNotificationRepo) GetByID(ctx context.Context, id string) (*model.Notification, error) {
	var notif model.Notification
	err := r.collection().FindOne(ctx, bson.M{"_id": id}).Decode(&notif)
	if err != nil {
		return nil, err
	}
	return &notif, nil
}

func (r *mongoNotificationRepo) List(ctx context.Context, storeID, userID uuid.UUID, params NotificationListParams) ([]model.Notification, int64, error) {
	filter := bson.M{
		"store_id": storeID,
		"$or": bson.A{
			bson.M{"user_id": userID},
			bson.M{"user_id": bson.M{"$exists": false}},
			bson.M{"user_id": nil},
		},
	}

	if params.Type != "" {
		filter["type"] = params.Type
	}
	if params.IsRead != nil {
		filter["is_read"] = *params.IsRead
	}

	total, err := r.collection().CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	page := params.Page
	if page < 1 {
		page = 1
	}
	limit := params.Limit
	if limit < 1 {
		limit = 20
	}
	skip := (page - 1) * limit

	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetSkip(int64(skip)).
		SetLimit(int64(limit))

	cursor, err := r.collection().Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var notifications []model.Notification
	if err := cursor.All(ctx, &notifications); err != nil {
		return nil, 0, err
	}

	return notifications, total, nil
}

func (r *mongoNotificationRepo) CountUnread(ctx context.Context, storeID, userID uuid.UUID) (int64, error) {
	filter := bson.M{
		"store_id": storeID,
		"is_read":  false,
		"$or": bson.A{
			bson.M{"user_id": userID},
			bson.M{"user_id": bson.M{"$exists": false}},
			bson.M{"user_id": nil},
		},
	}
	return r.collection().CountDocuments(ctx, filter)
}

func (r *mongoNotificationRepo) MarkAsRead(ctx context.Context, id string) error {
	now := time.Now()
	_, err := r.collection().UpdateOne(ctx,
		bson.M{"_id": id},
		bson.M{"$set": bson.M{"is_read": true, "read_at": now}},
	)
	return err
}

func (r *mongoNotificationRepo) MarkAllAsRead(ctx context.Context, storeID, userID uuid.UUID) error {
	now := time.Now()
	filter := bson.M{
		"store_id": storeID,
		"is_read":  false,
		"$or": bson.A{
			bson.M{"user_id": userID},
			bson.M{"user_id": bson.M{"$exists": false}},
			bson.M{"user_id": nil},
		},
	}
	_, err := r.collection().UpdateMany(ctx, filter,
		bson.M{"$set": bson.M{"is_read": true, "read_at": now}},
	)
	return err
}

func (r *mongoNotificationRepo) DeleteOld(ctx context.Context, before time.Time) (int64, error) {
	result, err := r.collection().DeleteMany(ctx, bson.M{
		"created_at": bson.M{"$lt": before},
	})
	if err != nil {
		return 0, err
	}
	return result.DeletedCount, nil
}

// --- Notification Preferences ---

type notifPrefsDoc struct {
	UserID      uuid.UUID                   `bson:"_id"`
	Preferences dto.NotificationPreferences `bson:"preferences"`
	UpdatedAt   time.Time                   `bson:"updated_at"`
}

func (r *mongoNotificationRepo) GetPreferences(ctx context.Context, userID uuid.UUID) (*dto.NotificationPreferences, error) {
	var doc notifPrefsDoc
	err := r.prefsCollection().FindOne(ctx, bson.M{"_id": userID}).Decode(&doc)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			// Return default preferences
			return &dto.NotificationPreferences{
				NewOrder:        true,
				LowStock:        true,
				WarrantyExpiry:  false,
				WarrantyRequest: true,
				DailyReport:     false,
			}, nil
		}
		return nil, err
	}
	return &doc.Preferences, nil
}

func (r *mongoNotificationRepo) SavePreferences(ctx context.Context, userID uuid.UUID, prefs *dto.NotificationPreferences) error {
	doc := notifPrefsDoc{
		UserID:      userID,
		Preferences: *prefs,
		UpdatedAt:   time.Now(),
	}
	opts := options.Replace().SetUpsert(true)
	_, err := r.prefsCollection().ReplaceOne(ctx, bson.M{"_id": userID}, doc, opts)
	return err
}
