package cleanup

import (
	"fmt"
	"regexp"
)

var slugPattern = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)

// Validate turns raw LLM actions into reviewable Proposals.
// Invalid actions are dropped and reported as warnings (kept in rawLlmResponse
// notes on the Job).
func Validate(entityType EntityType, input []RecordSnapshot, actions []LLMAction) ([]Proposal, []string) {
	// Index input for O(1) lookup.
	byID := make(map[string]*RecordSnapshot, len(input))
	for i := range input {
		byID[input[i].ID] = &input[i]
	}

	// Count deletes and updates per id to detect conflicts.
	deletes := map[string]bool{}
	updates := map[string]bool{}
	for _, a := range actions {
		switch a.Action {
		case ActionDelete:
			deletes[a.ID] = true
		case ActionUpdate:
			updates[a.ID] = true
		}
	}

	var proposals []Proposal
	var warnings []string
	index := 0

	for _, a := range actions {
		rec, ok := byID[a.ID]
		if !ok {
			warnings = append(warnings, fmt.Sprintf("action references unknown id %q (dropped)", a.ID))
			continue
		}

		// Conflict: same id is both updated and deleted.
		if updates[a.ID] && deletes[a.ID] {
			warnings = append(warnings, fmt.Sprintf("id %q is both updated and deleted (both dropped)", a.ID))
			continue
		}

		switch a.Action {
		case ActionDelete:
			if err := validateDelete(a, input, deletes); err != nil {
				warnings = append(warnings, err.Error())
				continue
			}
			proposals = append(proposals, Proposal{
				Index:     index,
				Action:    ActionDelete,
				TargetID:  a.ID,
				Before:    *rec,
				MergeInto: a.MergeInto,
				Rationale: a.Rationale,
				Approved:  true,
			})
			index++

		case ActionUpdate:
			if a.After == nil {
				warnings = append(warnings, fmt.Sprintf("update for %q missing 'after' (dropped)", a.ID))
				continue
			}
			after, err := validateUpdate(entityType, *rec, *a.After, byID, deletes)
			if err != nil {
				warnings = append(warnings, fmt.Sprintf("update %q invalid: %v (dropped)", a.ID, err))
				continue
			}
			proposals = append(proposals, Proposal{
				Index:     index,
				Action:    ActionUpdate,
				TargetID:  a.ID,
				Before:    *rec,
				After:     &after,
				Rationale: a.Rationale,
				Approved:  true,
			})
			index++
		}
	}
	return proposals, warnings
}

func validateDelete(a LLMAction, input []RecordSnapshot, deletes map[string]bool) error {
	if a.MergeInto == "" {
		return fmt.Errorf("delete of %q missing mergeInto (dropped)", a.ID)
	}
	if a.MergeInto == a.ID {
		return fmt.Errorf("delete of %q cannot merge into itself (dropped)", a.ID)
	}
	// Target must exist in input.
	found := false
	for _, r := range input {
		if r.ID == a.MergeInto {
			found = true
			break
		}
	}
	if !found {
		return fmt.Errorf("delete of %q merges into unknown id %q (dropped)", a.ID, a.MergeInto)
	}
	// Target must not itself be deleted in this job.
	if deletes[a.MergeInto] {
		return fmt.Errorf("delete of %q merges into %q which is also being deleted (dropped)", a.ID, a.MergeInto)
	}
	return nil
}

func validateUpdate(entityType EntityType, before RecordSnapshot, after ProposedFields, byID map[string]*RecordSnapshot, deletes map[string]bool) (ProposedFields, error) {
	if !slugPattern.MatchString(after.Slug) {
		return ProposedFields{}, fmt.Errorf("slug %q fails format", after.Slug)
	}
	if after.Name == "" {
		return ProposedFields{}, fmt.Errorf("name empty")
	}

	switch entityType {
	case EntityCategory:
		if after.ParentID != nil && *after.ParentID != "" {
			// Reject if parentId points at a record being deleted in this job —
			// otherwise Pass 3 would write a dangling reference.
			if deletes[*after.ParentID] {
				return ProposedFields{}, fmt.Errorf("parentId %q is being deleted in this job", *after.ParentID)
			}
			if err := checkCategoryCycle(before.ID, *after.ParentID, byID, after); err != nil {
				return ProposedFields{}, err
			}
		} else {
			after.ParentID = nil
		}
		after.CategoryIDs = nil // not applicable
	case EntityTechnique:
		// Reject if any categoryId is being deleted — same dangling-ref concern.
		for _, id := range after.CategoryIDs {
			if deletes[id] {
				return ProposedFields{}, fmt.Errorf("categoryId %q is being deleted in this job", id)
			}
		}
		// Dedupe categoryIds, preserving order.
		seen := map[string]bool{}
		unique := make([]string, 0, len(after.CategoryIDs))
		for _, id := range after.CategoryIDs {
			if seen[id] {
				continue
			}
			seen[id] = true
			unique = append(unique, id)
		}
		after.CategoryIDs = unique
		after.ParentID = nil // not applicable
	}
	return after, nil
}

// checkCategoryCycle walks the proposed parent chain. If we see `selfID`
// anywhere up the chain, we have a cycle.
// Proposed edges: the new after.ParentID overrides byID[selfID].ParentID.
func checkCategoryCycle(selfID, proposedParentID string, byID map[string]*RecordSnapshot, proposed ProposedFields) error {
	if proposedParentID == selfID {
		return fmt.Errorf("cycle: parent of %q is itself", selfID)
	}
	current := proposedParentID
	seen := map[string]bool{selfID: true}
	for current != "" {
		if seen[current] {
			return fmt.Errorf("cycle detected at %q", current)
		}
		seen[current] = true
		rec, ok := byID[current]
		if !ok {
			// Parent is outside the input set; we assume it's not part of a cycle
			// with selfID — conservative, since selfID is guaranteed in input.
			return nil
		}
		if rec.ParentID == nil {
			return nil
		}
		current = *rec.ParentID
	}
	return nil
}
