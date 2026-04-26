package store

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

type FirebaseClients struct {
	App       *firebase.App
	Auth      *auth.Client
	Firestore *firestore.Client
}

func NewFirebaseClients(ctx context.Context, projectID, keyPath string) (*FirebaseClients, error) {
	// Refuse to start in any configuration where the Firebase Admin SDK
	// would silently fall back to gcloud Application Default Credentials.
	// ADC usually points at whichever GCP project the developer most
	// recently `gcloud auth application-default login`'d into — easy to
	// have it leak across projects when working with several at once.
	//
	// Allowed configurations:
	//   * keyPath set                       → explicit credentials file
	//   * FIRESTORE_EMULATOR_HOST set       → emulator, no real GCP traffic
	//   * K_SERVICE set (running on Cloud Run) → metadata server provides creds
	inEmulator := os.Getenv("FIRESTORE_EMULATOR_HOST") != ""
	inCloudRun := os.Getenv("K_SERVICE") != ""
	if keyPath == "" && !inEmulator && !inCloudRun {
		return nil, fmt.Errorf("refusing to start: no FIREBASE_KEY_PATH, no FIRESTORE_EMULATOR_HOST, and not running on Cloud Run — without explicit credentials we'd fall back to gcloud ADC and likely target the wrong GCP project. Set FIRESTORE_EMULATOR_HOST=localhost:8181 for emulator mode, or FIREBASE_KEY_PATH=/path/to/serviceAccountKey.json for direct GCP")
	}

	var opts []option.ClientOption
	if keyPath != "" {
		// Verify the credentials file is for the project we expect. Cheap
		// guard against accidentally pointing FIREBASE_KEY_PATH at the
		// wrong service-account JSON.
		if err := verifyKeyMatchesProject(keyPath, projectID); err != nil {
			return nil, fmt.Errorf("credentials check: %w", err)
		}
		opts = append(opts, option.WithCredentialsFile(keyPath))
	}

	conf := &firebase.Config{ProjectID: projectID}
	app, err := firebase.NewApp(ctx, conf, opts...)
	if err != nil {
		return nil, err
	}

	authClient, err := app.Auth(ctx)
	if err != nil {
		return nil, err
	}

	fsClient, err := app.Firestore(ctx)
	if err != nil {
		return nil, err
	}

	slog.Info("Firebase clients initialized", "project", projectID)
	return &FirebaseClients{
		App:       app,
		Auth:      authClient,
		Firestore: fsClient,
	}, nil
}

func (fc *FirebaseClients) Close() {
	if fc.Firestore != nil {
		fc.Firestore.Close()
	}
}

// verifyKeyMatchesProject reads the service-account JSON at keyPath and
// asserts that its project_id matches the expected GCP project. Catches
// the "wrong key file at the configured path" failure mode loudly at
// startup instead of letting the SDK happily talk to a different project.
func verifyKeyMatchesProject(keyPath, expectedProjectID string) error {
	data, err := os.ReadFile(keyPath)
	if err != nil {
		return fmt.Errorf("read FIREBASE_KEY_PATH %q: %w", keyPath, err)
	}
	var key struct {
		ProjectID string `json:"project_id"`
	}
	if err := json.Unmarshal(data, &key); err != nil {
		return fmt.Errorf("parse FIREBASE_KEY_PATH %q: %w", keyPath, err)
	}
	if key.ProjectID == "" {
		return fmt.Errorf("FIREBASE_KEY_PATH %q has no project_id field", keyPath)
	}
	if key.ProjectID != expectedProjectID {
		return fmt.Errorf("FIREBASE_KEY_PATH is for project %q but GCP_PROJECT is %q — credentials would target the wrong project", key.ProjectID, expectedProjectID)
	}
	return nil
}
