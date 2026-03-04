package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/zplus/pos/internal/config"
	"github.com/zplus/pos/pkg/auth"
	"github.com/zplus/pos/pkg/database"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	pool, err := database.NewPostgres(cfg.Postgres)
	if err != nil {
		log.Fatalf("Failed to connect to PostgreSQL: %v", err)
	}
	defer pool.Close()

	ctx := context.Background()

	// 1. Create default store
	storeID := uuid.New()
	_, err = pool.Exec(ctx, `
		INSERT INTO stores (id, name, code, address, phone, email, is_active, settings, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, true, '{}', NOW(), NOW())
		ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
		RETURNING id
	`, storeID, "Zplus Store", "ZPLUS-HQ", "123 Main Street", "0123456789", "admin@zplus.vn")

	// Get the store ID in case it already existed
	err = pool.QueryRow(ctx, `SELECT id FROM stores WHERE code = 'ZPLUS-HQ'`).Scan(&storeID)
	if err != nil {
		log.Fatalf("Failed to get store: %v", err)
	}
	fmt.Printf("✅ Store created/found: %s\n", storeID)

	// 2. Create super_admin role
	roleID := uuid.New()
	allPermissions := `["users:read","users:create","users:update","users:delete","products:read","products:create","products:update","products:delete","inventory:read","inventory:update","inventory:import","inventory:export","orders:read","orders:create","orders:update","orders:delete","orders:refund","customers:read","customers:create","customers:update","customers:delete","reports:read","reports:export","settings:read","settings:update","categories:read","categories:create","categories:update","categories:delete","suppliers:read","suppliers:create","suppliers:update","suppliers:delete","purchase_orders:read","purchase_orders:create","purchase_orders:update","purchase_orders:delete","stocktake:read","stocktake:create","stocktake:update","stocktake:delete","warranty:read","warranty:create","warranty:update","warranty:delete","pos_sessions:read","pos_sessions:create","pos_sessions:update","roles:read","roles:create","roles:update","roles:delete","stores:read","stores:create","stores:update","stores:delete","dashboard:read"]`

	_, err = pool.Exec(ctx, `
		INSERT INTO roles (id, store_id, name, display_name, description, permissions, is_system, created_at, updated_at)
		VALUES ($1, NULL, 'super_admin', 'Super Admin', 'Full system access', $2::jsonb, true, NOW(), NOW())
		ON CONFLICT ON CONSTRAINT roles_store_id_name_key DO UPDATE SET permissions = EXCLUDED.permissions
	`, roleID, allPermissions)
	if err != nil {
		// Try alternative: the unique constraint might have a different name
		_, err = pool.Exec(ctx, `
			INSERT INTO roles (id, store_id, name, display_name, description, permissions, is_system, created_at, updated_at)
			VALUES ($1, NULL, 'super_admin', 'Super Admin', 'Full system access', $2::jsonb, true, NOW(), NOW())
			ON CONFLICT DO NOTHING
		`, roleID, allPermissions)
		if err != nil {
			log.Fatalf("Failed to create super_admin role: %v", err)
		}
	}

	// Get the role ID
	err = pool.QueryRow(ctx, `SELECT id FROM roles WHERE name = 'super_admin' AND store_id IS NULL`).Scan(&roleID)
	if err != nil {
		log.Fatalf("Failed to get super_admin role: %v", err)
	}
	fmt.Printf("✅ Super Admin role created/found: %s\n", roleID)

	// 3. Also create default staff role for normal user registration
	staffRoleID := uuid.New()
	staffPermissions := `["products:read","orders:read","orders:create","customers:read","customers:create","inventory:read","pos_sessions:read","pos_sessions:create","pos_sessions:update"]`
	_, err = pool.Exec(ctx, `
		INSERT INTO roles (id, store_id, name, display_name, description, permissions, is_system, created_at, updated_at)
		VALUES ($1, NULL, 'staff', 'Staff', 'Default staff role', $2::jsonb, true, NOW(), NOW())
		ON CONFLICT DO NOTHING
	`, staffRoleID, staffPermissions)
	if err != nil {
		log.Printf("⚠️  Staff role might already exist: %v", err)
	}
	fmt.Println("✅ Staff role created/found")

	// 4. Create admin user
	adminPassword := os.Getenv("ADMIN_PASSWORD")
	if adminPassword == "" {
		adminPassword = "Admin@123"
	}
	hashedPassword, err := auth.HashPassword(adminPassword, nil)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	adminID := uuid.New()
	adminEmail := "admin@zplus.vn"
	now := time.Now()

	_, err = pool.Exec(ctx, `
		INSERT INTO users (id, store_id, role_id, email, password_hash, full_name, phone, avatar_url, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, '', true, $8, $9)
		ON CONFLICT (email) DO UPDATE SET
			role_id = EXCLUDED.role_id,
			password_hash = EXCLUDED.password_hash,
			avatar_url = '',
			updated_at = NOW()
	`, adminID, storeID, roleID, adminEmail, hashedPassword, "Super Admin", "0123456789", now, now)
	if err != nil {
		log.Fatalf("Failed to create admin user: %v", err)
	}

	fmt.Println("✅ Admin user created/updated successfully!")

	// 5. Create toan@zplus.vn super admin user
	toanPassword := os.Getenv("TOAN_PASSWORD")
	if toanPassword == "" {
		toanPassword = "ChangeMe@123"
	}
	toanHashedPassword, err := auth.HashPassword(toanPassword, nil)
	if err != nil {
		log.Fatalf("Failed to hash toan password: %v", err)
	}

	toanID := uuid.New()
	toanEmail := "toan@zplus.vn"

	_, err = pool.Exec(ctx, `
		INSERT INTO users (id, store_id, role_id, email, password_hash, full_name, phone, avatar_url, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, '', true, $8, $9)
		ON CONFLICT (email) DO UPDATE SET
			role_id = EXCLUDED.role_id,
			password_hash = EXCLUDED.password_hash,
			avatar_url = '',
			updated_at = NOW()
	`, toanID, storeID, roleID, toanEmail, toanHashedPassword, "Toan Le", "0123456789", now, now)
	if err != nil {
		log.Fatalf("Failed to create toan user: %v", err)
	}

	fmt.Println("✅ Toan user created/updated successfully!")

	fmt.Println()
	fmt.Println("╔══════════════════════════════════════════╗")
	fmt.Println("║         Admin Account Details            ║")
	fmt.Println("╠══════════════════════════════════════════╣")
	fmt.Printf("║  Email:    %-29s ║\n", adminEmail)
	fmt.Printf("║  Password: %-29s ║\n", adminPassword)
	fmt.Println("║  Role:     Super Admin                   ║")
	fmt.Println("╠══════════════════════════════════════════╣")
	fmt.Printf("║  Email:    %-29s ║\n", toanEmail)
	fmt.Printf("║  Password: %-29s ║\n", toanPassword)
	fmt.Println("║  Role:     Super Admin                   ║")
	fmt.Println("╚══════════════════════════════════════════╝")
}
