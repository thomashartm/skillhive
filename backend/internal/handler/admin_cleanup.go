package handler

import (
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"cloud.google.com/go/firestore"
	"github.com/go-chi/chi/v5"
	"github.com/thomas/skillhive-api/internal/cleanup"
	"github.com/thomas/skillhive-api/internal/llm"
	"github.com/thomas/skillhive-api/internal/middleware"
)

type AdminCleanupHandler struct {
	templates *cleanup.TemplateStore
	service   *cleanup.Service
	executor  *cleanup.Executor
}

// NewAdminCleanupHandler wires the cleanup feature. Returns a disabled handler
// (all job-flow routes return 503) if llmClient is nil. Template CRUD works
// without an LLM.
func NewAdminCleanupHandler(fs *firestore.Client, llmClient llm.Client) *AdminCleanupHandler {
	templates := cleanup.NewTemplateStore(fs)
	var svc *cleanup.Service
	if llmClient != nil {
		svc = cleanup.NewService(fs, llmClient, templates)
	}
	return &AdminCleanupHandler{
		templates: templates,
		service:   svc,
		executor:  cleanup.NewExecutor(fs),
	}
}

func (h *AdminCleanupHandler) llmRequired(w http.ResponseWriter) bool {
	if h.service == nil {
		writeError(w, http.StatusServiceUnavailable, "LLM client not configured (GEMINI_API_KEY missing)")
		return true
	}
	return false
}

// --- Templates ---

func (h *AdminCleanupHandler) ListTemplates(w http.ResponseWriter, r *http.Request) {
	disciplineID := r.URL.Query().Get("disciplineId")
	entityType := cleanup.EntityType(r.URL.Query().Get("entityType"))
	if disciplineID == "" || !entityType.IsValid() {
		writeError(w, http.StatusBadRequest, "disciplineId and entityType (category|technique) required")
		return
	}
	if err := middleware.RequireAdmin(r.Context(), disciplineID); err != nil {
		writeError(w, http.StatusForbidden, "admin role required for this discipline")
		return
	}
	out, err := h.templates.List(r.Context(), disciplineID, entityType)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if out == nil {
		out = []cleanup.Template{}
	}
	writeJSON(w, http.StatusOK, out)
}

type createTemplateReq struct {
	DisciplineID string             `json:"disciplineId"`
	EntityType   cleanup.EntityType `json:"entityType"`
	Name         string             `json:"name"`
	Description  string             `json:"description"`
	PromptBody   string             `json:"promptBody"`
}

func (h *AdminCleanupHandler) CreateTemplate(w http.ResponseWriter, r *http.Request) {
	var req createTemplateReq
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := middleware.RequireAdmin(r.Context(), req.DisciplineID); err != nil {
		writeError(w, http.StatusForbidden, "admin role required for this discipline")
		return
	}
	t, err := h.templates.Create(r.Context(), cleanup.Template{
		DisciplineID: req.DisciplineID,
		EntityType:   req.EntityType,
		Name:         req.Name,
		Description:  req.Description,
		PromptBody:   req.PromptBody,
		CreatedBy:    middleware.GetUserUID(r.Context()),
	})
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, t)
}

type updateTemplateReq struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	PromptBody  string `json:"promptBody"`
}

func (h *AdminCleanupHandler) UpdateTemplate(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	existing, err := h.templates.Get(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	if err := middleware.RequireAdmin(r.Context(), existing.DisciplineID); err != nil {
		writeError(w, http.StatusForbidden, "admin role required for this discipline")
		return
	}
	var req updateTemplateReq
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	updated, err := h.templates.Update(r.Context(), id, req.Name, req.Description, req.PromptBody)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (h *AdminCleanupHandler) DeleteTemplate(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	existing, err := h.templates.Get(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	if err := middleware.RequireAdmin(r.Context(), existing.DisciplineID); err != nil {
		writeError(w, http.StatusForbidden, "admin role required for this discipline")
		return
	}
	if err := h.templates.Delete(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- Jobs ---

type createJobReq struct {
	DisciplineID string             `json:"disciplineId"`
	EntityType   cleanup.EntityType `json:"entityType"`
	TemplateID   string             `json:"templateId"`
	Filter       cleanup.Filter     `json:"filter"`
}

func (h *AdminCleanupHandler) CreateJob(w http.ResponseWriter, r *http.Request) {
	if h.llmRequired(w) {
		return
	}
	var req createJobReq
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := middleware.RequireAdmin(r.Context(), req.DisciplineID); err != nil {
		writeError(w, http.StatusForbidden, "admin role required for this discipline")
		return
	}
	actor := middleware.GetUserUID(r.Context())
	job, err := h.service.RunAnalysis(r.Context(), req.DisciplineID, req.EntityType, req.TemplateID, req.Filter, actor)
	if err != nil {
		if errors.Is(err, cleanup.ErrBudgetExceeded) {
			writeError(w, http.StatusRequestEntityTooLarge, "prompt exceeds token budget — narrow the filter")
			return
		}
		slog.Error("create cleanup job failed", "error", err)
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, job)
}

func (h *AdminCleanupHandler) ListJobs(w http.ResponseWriter, r *http.Request) {
	if h.llmRequired(w) {
		return
	}
	disciplineID := r.URL.Query().Get("disciplineId")
	entityType := cleanup.EntityType(r.URL.Query().Get("entityType"))
	statusFilter := cleanup.JobStatus(r.URL.Query().Get("status"))
	if disciplineID == "" || !entityType.IsValid() {
		writeError(w, http.StatusBadRequest, "disciplineId and entityType required")
		return
	}
	if err := middleware.RequireAdmin(r.Context(), disciplineID); err != nil {
		writeError(w, http.StatusForbidden, "admin role required for this discipline")
		return
	}
	jobs, err := h.service.ListJobs(r.Context(), disciplineID, entityType, statusFilter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if jobs == nil {
		jobs = []cleanup.Job{}
	}
	writeJSON(w, http.StatusOK, jobs)
}

func (h *AdminCleanupHandler) GetJob(w http.ResponseWriter, r *http.Request) {
	if h.llmRequired(w) {
		return
	}
	id := chi.URLParam(r, "id")
	job, err := h.service.GetJob(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	if err := middleware.RequireAdmin(r.Context(), job.DisciplineID); err != nil {
		writeError(w, http.StatusForbidden, "admin role required for this discipline")
		return
	}
	writeJSON(w, http.StatusOK, job)
}

type patchProposalReq struct {
	After    *cleanup.ProposedFields `json:"after,omitempty"`
	Approved *bool                   `json:"approved,omitempty"`
}

func (h *AdminCleanupHandler) PatchProposal(w http.ResponseWriter, r *http.Request) {
	if h.llmRequired(w) {
		return
	}
	jobID := chi.URLParam(r, "id")
	idxStr := chi.URLParam(r, "index")
	idx, err := strconv.Atoi(idxStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "index must be integer")
		return
	}
	job, err := h.service.GetJob(r.Context(), jobID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	if err := middleware.RequireAdmin(r.Context(), job.DisciplineID); err != nil {
		writeError(w, http.StatusForbidden, "admin role required for this discipline")
		return
	}
	var req patchProposalReq
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	updated, err := h.service.UpdateProposal(r.Context(), jobID, idx, req.After, req.Approved)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (h *AdminCleanupHandler) ApplyJob(w http.ResponseWriter, r *http.Request) {
	if h.llmRequired(w) {
		return
	}
	jobID := chi.URLParam(r, "id")
	job, err := h.service.GetJob(r.Context(), jobID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	if err := middleware.RequireAdmin(r.Context(), job.DisciplineID); err != nil {
		writeError(w, http.StatusForbidden, "admin role required for this discipline")
		return
	}
	actor := middleware.GetUserUID(r.Context())
	applied, err := h.executor.Apply(r.Context(), jobID, actor)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, applied)
}

func (h *AdminCleanupHandler) DiscardJob(w http.ResponseWriter, r *http.Request) {
	if h.llmRequired(w) {
		return
	}
	jobID := chi.URLParam(r, "id")
	job, err := h.service.GetJob(r.Context(), jobID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	if err := middleware.RequireAdmin(r.Context(), job.DisciplineID); err != nil {
		writeError(w, http.StatusForbidden, "admin role required for this discipline")
		return
	}
	if err := h.service.Discard(r.Context(), jobID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type forceFailReq struct {
	Reason string `json:"reason"`
}

// ForceFailJob is the admin recovery action for a job stuck in `proposed`
// or `applying` after an aborted apply (Cloud Run timeout, panic, etc.).
// Marks the job `failed` with an audit-trail reason. Idempotent in the
// sense that calling on an already-terminal job returns a clear error.
func (h *AdminCleanupHandler) ForceFailJob(w http.ResponseWriter, r *http.Request) {
	if h.llmRequired(w) {
		return
	}
	jobID := chi.URLParam(r, "id")
	job, err := h.service.GetJob(r.Context(), jobID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	if err := middleware.RequireAdmin(r.Context(), job.DisciplineID); err != nil {
		writeError(w, http.StatusForbidden, "admin role required for this discipline")
		return
	}
	var req forceFailReq
	// Body is optional; an empty body is fine.
	_ = decodeJSON(r, &req)
	actor := middleware.GetUserUID(r.Context())
	if err := h.service.ForceFail(r.Context(), jobID, req.Reason, actor); err != nil {
		slog.Warn("force-fail rejected", "jobId", jobID, "actor", actor, "error", err)
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	updated, err := h.service.GetJob(r.Context(), jobID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, updated)
}
