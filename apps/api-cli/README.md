# SkillHive API CLI

A command-line tool for testing and interacting with the SkillHive API.

## Features

- Login and token management
- Test any API endpoint with custom HTTP methods
- Convenient commands for common operations (videos, curricula, etc.)
- Token persistence across sessions
- Colored output for better readability

## Installation

From the monorepo root:

```bash
npm install
npm run build -w @trainhive/api-cli
```

## Configuration

Create a `.env` file in `apps/api-cli` (or copy from `.env.example`):

```bash
API_URL=http://localhost:3001
```

## Usage

### Login

Login and save authentication token:

```bash
npm run cli -w @trainhive/api-cli -- login -e admin@example.com -p admin123
```

The token is saved to `~/.trainhive-token` and will be used for subsequent requests.

### Token Management

Show current token:
```bash
npm run cli -w @trainhive/api-cli -- token show
```

Clear saved token:
```bash
npm run cli -w @trainhive/api-cli -- token clear
```

### Generic Request

Make any HTTP request to the API:

```bash
# GET request
npm run cli -w @trainhive/api-cli -- request GET /api/v1/videos

# GET with query parameters
npm run cli -w @trainhive/api-cli -- request GET /api/v1/videos -q '{"limit": 5}'

# POST request with data
npm run cli -w @trainhive/api-cli -- request POST /api/v1/videos -d '{"title":"Test Video","url":"https://youtube.com/watch?v=xyz"}'

# PUT request
npm run cli -w @trainhive/api-cli -- request PUT /api/v1/videos/123 -d '{"title":"Updated Title"}'

# DELETE request
npm run cli -w @trainhive/api-cli -- request DELETE /api/v1/videos/123
```

### Videos Commands

List videos:
```bash
npm run cli -w @trainhive/api-cli -- videos list
npm run cli -w @trainhive/api-cli -- videos list -l 20 -o 10
```

Get specific video:
```bash
npm run cli -w @trainhive/api-cli -- videos get 123
```

Create video:
```bash
npm run cli -w @trainhive/api-cli -- videos create \
  -t "Guard Pass Tutorial" \
  -u "https://youtube.com/watch?v=xyz" \
  -d "Basic guard pass technique" \
  --discipline bjj
```

## Development

Build the CLI:
```bash
npm run build -w @trainhive/api-cli
```

Watch mode for development:
```bash
npm run dev -w @trainhive/api-cli
```

Run directly with ts-node:
```bash
npm run start -w @trainhive/api-cli -- login -e admin@example.com -p admin123
```

## Adding New Commands

1. Create a new command file in `src/commands/`
2. Export a function that returns a `Command` instance
3. Register the command in `src/index.ts`

Example:

```typescript
// src/commands/my-command.ts
import { Command } from 'commander';
import { ApiClient } from '../api-client.js';

export function createMyCommand(apiClient: ApiClient): Command {
  const command = new Command('my-command')
    .description('My custom command')
    .action(async () => {
      // Your logic here
    });

  return command;
}
```

## Architecture

- `src/index.ts` - CLI entry point and command registration
- `src/api-client.ts` - Axios wrapper with authentication
- `src/commands/` - Individual command implementations
  - `login.ts` - Authentication
  - `token.ts` - Token management
  - `request.ts` - Generic HTTP requests
  - `videos.ts` - Video-specific operations

## Token Storage

Authentication tokens are stored in `~/.trainhive-token` and automatically loaded for subsequent requests.
