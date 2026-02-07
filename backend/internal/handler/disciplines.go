package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"cloud.google.com/go/firestore"
	"github.com/thomas/skillhive-api/internal/model"
	"google.golang.org/api/iterator"
)

type DisciplineHandler struct {
	fs *firestore.Client
}

func NewDisciplineHandler(fs *firestore.Client) *DisciplineHandler {
	return &DisciplineHandler{fs: fs}
}

func (h *DisciplineHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	iter := h.fs.Collection("disciplines").Documents(ctx)
	defer iter.Stop()

	var disciplines []model.Discipline
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			slog.Error("failed to list disciplines", "error", err)
			http.Error(w, `{"error":"failed to list disciplines"}`, http.StatusInternalServerError)
			return
		}

		var d model.Discipline
		if err := doc.DataTo(&d); err != nil {
			slog.Error("failed to parse discipline", "docID", doc.Ref.ID, "error", err)
			continue
		}
		d.ID = doc.Ref.ID
		disciplines = append(disciplines, d)
	}

	if disciplines == nil {
		disciplines = []model.Discipline{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(disciplines)
}
