# firestore-sync

Export production Firestore data and import it into the local emulator for development testing.

## Prerequisites

- Go 1.25+
- A valid service account key (`FIREBASE_KEY_PATH` in `backend/.env`)
- Docker Compose running the Firestore emulator (port 8181)

## Usage

### 1. Export from production

Run **without** `FIRESTORE_EMULATOR_HOST` so the client connects to the real Firestore:

```bash
cd backend
go run ./cmd/firestore-sync export
```

This reads all documents from these collections:

- `disciplines`, `categories`, `techniques`, `tags`, `assets`, `curricula`
- Subcollections: `curricula/{id}/elements`

Output: `backend/seed/production-data.json` (gitignored — contains real user data).

### 2. Import into local emulator

Make sure the emulators are running:

```bash
docker compose up -d emulators
```

Then run with `FIRESTORE_EMULATOR_HOST` set:

```bash
cd backend
FIRESTORE_EMULATOR_HOST=localhost:8181 go run ./cmd/firestore-sync import
```

This will:

1. **Ensure admin user exists** in the Auth emulator (creates `admin@skillhive.local` if missing, sets admin roles for bjj/jkd)
2. **Remap `ownerUid`** on all imported documents from production UIDs to the local admin UID (keeps `"system"` ownership intact)
3. **Clear** all existing documents in each collection (and subcollections)
4. **Write** all documents from the JSON file with original document IDs preserved

The import **refuses to run** if `FIRESTORE_EMULATOR_HOST` is not set, preventing accidental writes to production.

You can override the admin email/password via env vars:

```bash
ADMIN_EMAIL=me@example.com \
ADMIN_PASSWORD=secret123 \
FIRESTORE_EMULATOR_HOST=localhost:8181 go run ./cmd/firestore-sync import
```

### Quick one-liner

```bash
# Export production, then import to emulator
cd backend && go run ./cmd/firestore-sync export && \
  FIRESTORE_EMULATOR_HOST=localhost:8181 go run ./cmd/firestore-sync import
```

## Type preservation

JSON round-tripping loses Firestore type information. The import step automatically restores:

| JSON type | Restored to | Example fields |
|-----------|-------------|----------------|
| RFC3339 string | `time.Time` | `createdAt`, `updatedAt` |
| Whole-number float64 | `int64` | `ord`, counts |
| Nested objects | Recursive restoration | `snapshot` |
| Arrays | Recursive restoration | `tagIds`, `items` |

## Adding new collections

Edit the `topCollections` slice and `subcollections` map in `main.go`:

```go
var topCollections = []string{
    "disciplines", "categories", "techniques",
    "tags", "assets", "curricula",
    "myNewCollection", // add here
}

var subcollections = map[string][]string{
    "curricula":       {"elements"},
    "myNewCollection": {"subColl"}, // if it has subcollections
}
```
