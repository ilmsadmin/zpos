// MongoDB initialization indexes
// Run: mongosh zplus_pos < init_indexes.js

db = db.getSiblingDB('zplus_pos');

// Audit logs collection
db.createCollection('audit_logs');
db.audit_logs.createIndex({ "store_id": 1, "created_at": -1 });
db.audit_logs.createIndex({ "user_id": 1, "created_at": -1 });
db.audit_logs.createIndex({ "action": 1, "created_at": -1 });
db.audit_logs.createIndex({ "entity_type": 1, "entity_id": 1 });
db.audit_logs.createIndex({ "created_at": 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL

// Product metadata collection
db.createCollection('product_metadata');
db.product_metadata.createIndex({ "product_id": 1 }, { unique: true });
db.product_metadata.createIndex({ "store_id": 1 });

// Warranty history collection
db.createCollection('warranty_history');
db.warranty_history.createIndex({ "warranty_id": 1, "created_at": -1 });
db.warranty_history.createIndex({ "store_id": 1, "created_at": -1 });

// Notifications collection
db.createCollection('notifications');
db.notifications.createIndex({ "user_id": 1, "is_read": 1, "created_at": -1 });
db.notifications.createIndex({ "store_id": 1, "created_at": -1 });
db.notifications.createIndex({ "created_at": 1 }, { expireAfterSeconds: 2592000 }); // 30 days TTL

// Report snapshots collection
db.createCollection('report_snapshots');
db.report_snapshots.createIndex({ "store_id": 1, "type": 1, "date": -1 });
db.report_snapshots.createIndex({ "created_at": 1 }, { expireAfterSeconds: 31536000 }); // 1 year TTL

print('MongoDB indexes created successfully');
