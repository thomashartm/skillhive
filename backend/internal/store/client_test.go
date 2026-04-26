package store

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestVerifyKeyMatchesProject_Match(t *testing.T) {
	dir := t.TempDir()
	keyPath := filepath.Join(dir, "key.json")
	if err := os.WriteFile(keyPath, []byte(`{"project_id":"skillhive-prod"}`), 0o600); err != nil {
		t.Fatalf("write fixture: %v", err)
	}
	if err := verifyKeyMatchesProject(keyPath, "skillhive-prod"); err != nil {
		t.Errorf("expected match, got %v", err)
	}
}

func TestVerifyKeyMatchesProject_Mismatch(t *testing.T) {
	dir := t.TempDir()
	keyPath := filepath.Join(dir, "key.json")
	if err := os.WriteFile(keyPath, []byte(`{"project_id":"some-other-project"}`), 0o600); err != nil {
		t.Fatalf("write fixture: %v", err)
	}
	err := verifyKeyMatchesProject(keyPath, "skillhive-prod")
	if err == nil {
		t.Fatal("expected mismatch error, got nil")
	}
	if !strings.Contains(err.Error(), "wrong project") {
		t.Errorf("error should mention wrong project: %v", err)
	}
}

func TestVerifyKeyMatchesProject_MissingFile(t *testing.T) {
	err := verifyKeyMatchesProject("/nonexistent/path/key.json", "any")
	if err == nil {
		t.Fatal("expected error for missing file")
	}
}

func TestVerifyKeyMatchesProject_NoProjectIDField(t *testing.T) {
	dir := t.TempDir()
	keyPath := filepath.Join(dir, "key.json")
	if err := os.WriteFile(keyPath, []byte(`{"type":"service_account"}`), 0o600); err != nil {
		t.Fatalf("write fixture: %v", err)
	}
	err := verifyKeyMatchesProject(keyPath, "skillhive-prod")
	if err == nil || !strings.Contains(err.Error(), "no project_id") {
		t.Errorf("expected 'no project_id' error, got %v", err)
	}
}

func TestNewFirebaseClients_RefusesWhenAmbientCredsWouldLeak(t *testing.T) {
	// Clear all the env vars that would otherwise unblock initialization.
	t.Setenv("FIRESTORE_EMULATOR_HOST", "")
	t.Setenv("K_SERVICE", "")

	_, err := NewFirebaseClients(context.Background(), "skillhive-prod", "")
	if err == nil {
		t.Fatal("expected refusal when no key, no emulator, not on Cloud Run")
	}
	if !strings.Contains(err.Error(), "refusing to start") {
		t.Errorf("error should explain the refusal: %v", err)
	}
}
