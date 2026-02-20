package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port               string
	GCPProject         string
	FirebaseKeyPath    string
	CORSAllowedOrigins string
	Env                string
	YouTubeAPIKey      string
	GeminiAPIKey       string
	GeminiModel        string
}

func Load() *Config {
	_ = godotenv.Load()

	return &Config{
		Port:               getEnv("PORT", "8080"),
		GCPProject:         getEnv("GCP_PROJECT", "skillhive"),
		FirebaseKeyPath:    getEnv("FIREBASE_KEY_PATH", ""),
		CORSAllowedOrigins: getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5000"),
		Env:                getEnv("ENV", "development"),
		YouTubeAPIKey:      getEnv("YOUTUBE_API_KEY", ""),
		GeminiAPIKey:       getEnv("GEMINI_API_KEY", ""),
		GeminiModel:        getEnv("GEMINI_MODEL", "gemini-2.0-flash"),
	}
}

func (c *Config) IsDevelopment() bool {
	return c.Env == "development"
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
