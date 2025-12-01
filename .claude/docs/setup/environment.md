# Environment Setup

This document covers environment variables and initial setup for the TrainHive application.

## Required Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Database
DATABASE_URL=mysql://trainhive_user:trainhive_password@localhost:3306/trainhive

# Auth (for Next.js web app)
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# API (optional, defaults shown)
API_PORT=3001
CORS_ORIGIN=http://localhost:3000

# Node environment
NODE_ENV=development
```

## Optional OAuth Variables

### Google OAuth (Optional)

```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**Setup:**
1. Create OAuth client at https://console.cloud.google.com/apis/credentials
2. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

### Microsoft/Azure AD (Optional)

```env
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_TENANT_ID=common
```

**Setup:**
1. Register app at https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps
2. Redirect URI: `http://localhost:3000/api/auth/callback/azure-ad`

## Environment-Specific Configuration

### Development

```env
NODE_ENV=development
DATABASE_URL=mysql://trainhive_user:trainhive_password@localhost:3306/trainhive
NEXTAUTH_URL=http://localhost:3000
```

Features enabled in development:
- Database auto-sync (`synchronize: true`)
- Detailed error messages
- CORS enabled for localhost
- Hot module reloading

### Production

```env
NODE_ENV=production
DATABASE_URL=mysql://user:password@production-host:3306/trainhive
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=strong-random-secret-key
```

Important for production:
- Disable database auto-sync
- Use HTTPS for NEXTAUTH_URL
- Strong random secret for NEXTAUTH_SECRET
- Proper CORS configuration
- Secure cookie settings

## Database Setup

### Local MySQL Setup

1. **Install MySQL 8.0+**:
   ```bash
   # macOS with Homebrew
   brew install mysql

   # Ubuntu/Debian
   sudo apt-get install mysql-server
   ```

2. **Create database and user**:
   ```sql
   CREATE DATABASE trainhive;
   CREATE USER 'trainhive_user'@'localhost' IDENTIFIED BY 'trainhive_password';
   GRANT ALL PRIVILEGES ON trainhive.* TO 'trainhive_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

3. **Update DATABASE_URL** in `.env`:
   ```env
   DATABASE_URL=mysql://trainhive_user:trainhive_password@localhost:3306/trainhive
   ```

### Docker MySQL Setup

Alternatively, use Docker:

```bash
docker run -d \
  --name trainhive-mysql \
  -e MYSQL_ROOT_PASSWORD=rootpassword \
  -e MYSQL_DATABASE=trainhive \
  -e MYSQL_USER=trainhive_user \
  -e MYSQL_PASSWORD=trainhive_password \
  -p 3306:3306 \
  mysql:8.0
```

## First-Time Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd trainhive
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create `.env` file**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Build packages**:
   ```bash
   npm run build
   ```

5. **Seed the database** (optional):
   ```bash
   npm run db:seed
   ```

6. **Start development servers**:
   ```bash
   npm run dev:all
   ```

## Verifying Setup

### Check Web App
Open http://localhost:3000 in your browser

### Check API
```bash
# Health check
curl http://localhost:3001/api/v1/health

# API documentation
open http://localhost:3001/api/docs
```

### Check Database Connection
```bash
# From the project root
npm run db:schema
```

## Troubleshooting

### Database Connection Errors

**Error:** `ER_ACCESS_DENIED_ERROR`
- Check username and password in DATABASE_URL
- Verify user has proper permissions

**Error:** `ECONNREFUSED`
- Ensure MySQL is running: `mysql.server start` (macOS) or `sudo service mysql start` (Linux)
- Check MySQL port (default 3306)

### Authentication Errors

**Error:** `[next-auth][error][JWT_SESSION_ERROR]`
- Ensure NEXTAUTH_SECRET is set
- Check that secret is the same in both web app and API

### Build Errors

**Error:** `Cannot find module '@trainhive/...'`
- Run `npm run build` to compile packages
- Check that all dependencies are installed

### Port Conflicts

**Error:** `EADDRINUSE: address already in use`
- Kill process using the port:
  ```bash
  # Port 3000
  lsof -ti:3000 | xargs kill -9

  # Port 3001
  lsof -ti:3001 | xargs kill -9
  ```

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong random secrets** for NEXTAUTH_SECRET
3. **Rotate secrets regularly** in production
4. **Use environment-specific configurations**
5. **Enable HTTPS** in production
6. **Restrict CORS** to specific domains in production
7. **Use secure cookie settings** in production
8. **Keep dependencies updated** with `npm audit`

## Additional Configuration

### TypeScript Paths

TypeScript path mappings are configured in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@trainhive/shared": ["./packages/shared/src"],
      "@trainhive/db": ["./packages/db/src"],
      "@trainhive/auth": ["./packages/auth/src"]
    }
  }
}
```

### ESLint Configuration

ESLint is configured at the workspace root with Airbnb rules.

### Prettier Configuration

Prettier is configured at the workspace root for consistent formatting.
