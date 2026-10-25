package main

import (
	"reflect"
	"testing"

	"cloud.google.com/go/firestore"
)

func TestEntityDecoder(t *testing.T) {
	tests := map[string]string{
		"opponent&#39;s":          "opponent's",
		"&#34;Knee shield&#34;":   `"Knee shield"`,
		"1 &lt; 2 &gt; 0":         "1 < 2 > 0",
		"Tom &amp; Jerry":         "Tom & Jerry",
		"literal &amp;amp; stays": "literal &amp; stays",
		"?a=1&copy=2 untouched":   "?a=1&copy=2 untouched",
		"no entities":             "no entities",
	}
	for in, want := range tests {
		if got := entityDecoder.Replace(in); got != want {
			t.Errorf("Replace(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestDecodeFields(t *testing.T) {
	data := map[string]interface{}{
		"title":    "Shaolin &amp; John Wayne",
		"duration": "10m",
		"items":    []interface{}{"opponent&#39;s hip", "plain"},
		"snapshot": map[string]interface{}{"name": "&#34;JW&#34; sweep", "url": "https://x?a=1&amp;b=2"},
		"ord":      int64(3),
	}
	got := decodeFields(data, []string{"title", "duration", "items", "snapshot.name", "snapshot.description", "missing"})
	want := []firestore.Update{
		{Path: "title", Value: "Shaolin & John Wayne"},
		{Path: "items", Value: []interface{}{"opponent's hip", "plain"}},
		{Path: "snapshot.name", Value: `"JW" sweep`},
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("decodeFields() = %#v, want %#v", got, want)
	}
	// Input must not be mutated; the caller logs the original values.
	if data["items"].([]interface{})[0] != "opponent&#39;s hip" {
		t.Error("decodeFields mutated the input array")
	}
}
