package validate

import (
	"fmt"
	"regexp"
)

var firestoreIDRegex = regexp.MustCompile(`^[a-zA-Z0-9_-]{1,128}$`)

func Required(field, value string) error {
	if value == "" {
		return fmt.Errorf("%s is required", field)
	}
	return nil
}

func MaxLength(field, value string, max int) error {
	if len(value) > max {
		return fmt.Errorf("%s must be at most %d characters", field, max)
	}
	return nil
}

func MinLength(field, value string, min int) error {
	if len(value) < min {
		return fmt.Errorf("%s must be at least %d characters", field, min)
	}
	return nil
}

func StringLength(field, value string, min, max int) error {
	if err := MinLength(field, value, min); err != nil {
		return err
	}
	return MaxLength(field, value, max)
}

func FirestoreID(field, value string) error {
	if !firestoreIDRegex.MatchString(value) {
		return fmt.Errorf("%s is not a valid Firestore document ID", field)
	}
	return nil
}

func EnumWhitelist(field, value string, allowed []string) error {
	for _, a := range allowed {
		if value == a {
			return nil
		}
	}
	return fmt.Errorf("%s must be one of: %v", field, allowed)
}
