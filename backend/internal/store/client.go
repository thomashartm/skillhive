package store

import (
	"context"
	"log/slog"

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
	var opts []option.ClientOption
	if keyPath != "" {
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
