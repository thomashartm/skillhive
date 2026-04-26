package cleanup

// CategoryRef is a minimal view of a Category doc for parent rewrites.
type CategoryRef struct {
	ID       string
	ParentID *string
}

// CategoryIDsRef is a minimal view of a Technique or Asset doc for
// categoryIds[] rewrites.
type CategoryIDsRef struct {
	ID          string
	CategoryIDs []string
}

// TechniqueIDsRef is a minimal view of an Asset for techniqueIds[] rewrites.
type TechniqueIDsRef struct {
	ID           string
	TechniqueIDs []string
}

// ElementRef is a minimal view of a CurriculumElement (subcollection).
type ElementRef struct {
	CurriculumID string
	ElementID    string
	TechniqueID  *string
}

// ParentRewrite describes a single-field update on a Category.
type ParentRewrite struct {
	ID          string
	NewParentID *string
}

// ArrayRewrite describes an array-field update on a Technique or Asset.
type ArrayRewrite struct {
	ID              string
	NewCategoryIDs  []string
	NewTechniqueIDs []string
}

// ElementRewrite describes a single-field update on a CurriculumElement.
type ElementRewrite struct {
	CurriculumID   string
	ElementID      string
	NewTechniqueID *string
}

// PlanCategoryParentRewrites returns one rewrite per record whose ParentID == from.
func PlanCategoryParentRewrites(records []CategoryRef, from, to string) []ParentRewrite {
	var out []ParentRewrite
	for _, r := range records {
		if r.ParentID != nil && *r.ParentID == from {
			toCopy := to
			out = append(out, ParentRewrite{ID: r.ID, NewParentID: &toCopy})
		}
	}
	return out
}

// PlanCategoryIDsRewrites replaces from-> to in each CategoryIDs array,
// deduping occurrences of to after replacement. Records without `from`
// are skipped.
func PlanCategoryIDsRewrites(records []CategoryIDsRef, from, to string) []ArrayRewrite {
	var out []ArrayRewrite
	for _, r := range records {
		if !contains(r.CategoryIDs, from) {
			continue
		}
		rewritten := replaceAndDedupe(r.CategoryIDs, from, to)
		out = append(out, ArrayRewrite{ID: r.ID, NewCategoryIDs: rewritten})
	}
	return out
}

// PlanTechniqueIDsRewrites replaces from -> to in each TechniqueIDs array.
func PlanTechniqueIDsRewrites(records []TechniqueIDsRef, from, to string) []ArrayRewrite {
	var out []ArrayRewrite
	for _, r := range records {
		if !contains(r.TechniqueIDs, from) {
			continue
		}
		rewritten := replaceAndDedupe(r.TechniqueIDs, from, to)
		out = append(out, ArrayRewrite{ID: r.ID, NewTechniqueIDs: rewritten})
	}
	return out
}

// PlanElementTechniqueRewrites finds curriculum elements whose TechniqueID == from.
func PlanElementTechniqueRewrites(elements []ElementRef, from, to string) []ElementRewrite {
	var out []ElementRewrite
	for _, e := range elements {
		if e.TechniqueID != nil && *e.TechniqueID == from {
			toCopy := to
			out = append(out, ElementRewrite{
				CurriculumID:   e.CurriculumID,
				ElementID:      e.ElementID,
				NewTechniqueID: &toCopy,
			})
		}
	}
	return out
}

func contains(s []string, v string) bool {
	for _, x := range s {
		if x == v {
			return true
		}
	}
	return false
}

// replaceAndDedupe rewrites occurrences of from to `to` and removes duplicates
// while preserving first-seen ordering.
func replaceAndDedupe(xs []string, from, to string) []string {
	seen := map[string]bool{}
	out := make([]string, 0, len(xs))
	for _, x := range xs {
		if x == from {
			x = to
		}
		if seen[x] {
			continue
		}
		seen[x] = true
		out = append(out, x)
	}
	return out
}
