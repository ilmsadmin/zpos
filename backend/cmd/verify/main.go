package main

import (
	"context"
	"fmt"
	"log"

	"github.com/zplus/pos/internal/config"
	"github.com/zplus/pos/pkg/auth"
	"github.com/zplus/pos/pkg/database"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}
	pool, err := database.NewPostgres(cfg.Postgres)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	var passwordHash string
	err = pool.QueryRow(context.Background(), "SELECT password_hash FROM users WHERE email = 'admin@zplus.vn'").Scan(&passwordHash)
	if err != nil {
		log.Fatalf("Query error: %v", err)
	}
	fmt.Printf("Hash from DB: %s\n", passwordHash)

	valid, err := auth.VerifyPassword("Admin@123", passwordHash)
	fmt.Printf("Verify result: valid=%v, err=%v\n", valid, err)
}
