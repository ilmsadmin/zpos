package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/zplus/pos/internal/config"
	"github.com/zplus/pos/internal/repository/postgres"
	"github.com/zplus/pos/pkg/database"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: debuglogin <email>")
		os.Exit(1)
	}
	email := os.Args[1]

	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}
	pool, err := database.NewPostgres(cfg.Postgres)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	repo := postgres.NewUserRepository(pool)
	user, err := repo.GetByEmail(context.Background(), email)
	if err != nil {
		log.Fatalf("GetByEmail error: %v", err)
	}
	fmt.Printf("User found: %s\n", user.Email)
	fmt.Printf("PasswordHash: %s...\n", user.PasswordHash[:40])
	fmt.Printf("IsActive: %v\n", user.IsActive)
	fmt.Printf("RoleID: %s\n", user.RoleID)
	fmt.Printf("StoreID: %s\n", user.StoreID)
}
