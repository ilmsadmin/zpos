// MongoDB Init Indexes for Zplus POS
db = db.getSiblingDB('zplus_pos');

// Activity logs
db.createCollection('activity_logs');
db.activity_logs.createIndex({ "user_id": 1, "created_at": -1 });
db.activity_logs.createIndex({ "store_id": 1, "created_at": -1 });
db.activity_logs.createIndex({ "action": 1 });
db.activity_logs.createIndex({ "created_at": 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL

// Audit logs
db.createCollection('audit_logs');
db.audit_logs.createIndex({ "entity_type": 1, "entity_id": 1 });
db.audit_logs.createIndex({ "user_id": 1, "created_at": -1 });
db.audit_logs.createIndex({ "created_at": 1 }, { expireAfterSeconds: 15552000 }); // 180 days TTL

print('✅ MongoDB indexes created successfully!');
