# API Testing Guide

This guide explains how to generate authentication tokens and test the API endpoints.

## Available Users

Run `make token` to see all available users in the database. By default, the seeded database contains:

1. admin@skillhive.net (Admin) - Role: admin
2. admin@example.com (Admin User) - Role: admin
3. thomashartm@googlemail.com (thomashartm) - Role: admin

## Generating Bearer Tokens

### Interactive Mode

Generate a token by selecting a user interactively:

```bash
make token
```

This will:
1. Show all available users
2. Prompt you to select a user number
3. Display the generated bearer token

### Automatic Mode

Generate a token for a specific user directly:

```bash
# Generate token for user #1
make token USER_NUM=1

# Generate token for user #2
make token USER_NUM=2
```

### Save Token to CLI Tool

Generate and automatically save the token for use with the CLI tool:

```bash
# Generate and save token for user #1
make token-save USER_NUM=1
```

This saves the token to `~/.trainhive-token` for automatic use with the CLI tool.

## Using the Bearer Token

### With curl

```bash
# Copy the token from the output
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Make API requests
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/v1/videos
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/v1/curricula
```

### With the CLI Tool

If you used `make token-save`, the token is already configured:

```bash
# List videos
npm run cli -w @trainhive/api-cli -- request GET /api/v1/videos

# Get specific video
npm run cli -w @trainhive/api-cli -- request GET /api/v1/videos/1

# Create a video
npm run cli -w @trainhive/api-cli -- videos create -t "Test Video" -u "https://youtube.com/watch?v=xyz"
```

Or manually save the token:

```bash
# Copy token from 'make token' output and save
echo "YOUR_TOKEN_HERE" > ~/.trainhive-token

# Then use the CLI
npm run cli -w @trainhive/api-cli -- videos list
```

## Quick Testing Workflow

1. **Generate and save token:**
   ```bash
   make token-save USER_NUM=1
   ```

2. **Test with CLI:**
   ```bash
   npm run cli -w @trainhive/api-cli -- request GET /api/v1/health
   npm run cli -w @trainhive/api-cli -- videos list
   ```

3. **Or test with curl:**
   ```bash
   TOKEN=$(cat ~/.trainhive-token)
   curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/v1/videos
   ```

## Token Details

- **Expiration:** 7 days
- **Storage:** `~/.trainhive-token`
- **Format:** JWT (JSON Web Token)
- **Includes:** User ID, email, name, role, and scopes

## Available API Endpoints

Visit http://localhost:3001/api/docs for full API documentation when the API is running.

Common endpoints:
- `GET /api/v1/health` - Health check (public)
- `GET /api/v1/videos` - List videos
- `GET /api/v1/curricula` - List curricula
- `GET /api/v1/categories` - List categories
- `GET /api/v1/techniques` - List techniques
- `GET /api/v1/tags` - List tags

## Troubleshooting

### "No users found in database"

Run the database seeding:
```bash
make db-seed
```

### "NEXTAUTH_SECRET environment variable is not set"

Make sure your `.env` file is configured with `NEXTAUTH_SECRET`.

### Token expired

Generate a new token:
```bash
make token-save USER_NUM=1
```
