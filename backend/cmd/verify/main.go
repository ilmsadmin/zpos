package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/zplus/pos/internal/config"
	"github.com/zplus/pos/pkg/auth"
	"github.com/zplus/pos/pkg/database"
)

func main() {
	if len(os.Args) < 3 {
		fmt.Println("Usage: verify <email> <password>")
		os.Exit(1)
	}
	email := os.Args[1]
	password := os.Args[2]

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
	err = pool.QueryRow(context.Background(), "SELECT password_hash FROM users WHERE email = $1", email).Scan(&passwordHash)
	if err != nil {
		log.Fatalf("Query error: %v", err)
	}
	fmt.Printf("Hash from DB: %s\n", passwordHash[:40]+"...")

	valid, err := auth.VerifyPassword(password, passwordHash)
	fmt.Printf("Verify result: valid=%v, err=%v\n", valid, err)
}
