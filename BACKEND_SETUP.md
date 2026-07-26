# Tradify Backend - Production Setup Guide

Complete guide for setting up and running the production-grade Node.js/Express/TypeScript backend with PostgreSQL.

---

## 📋 Prerequisites

Ensure you have installed:

- **Node.js** (v18+): https://nodejs.org/
- **npm** (v9+) or **yarn**
- **Docker** & **Docker Compose**: https://docs.docker.com/compose/install/
- **PostgreSQL** (Optional - Docker Compose handles this)
- **Git**

Verify installation:
```bash
node --version  # v18.0.0 or higher
npm --version   # v9.0.0 or higher
docker --version
docker-compose --version
```

---

## 🚀 Quick Start (5 Minutes)

### 1. Create Backend Project Structure

Copy the backend files to a separate directory (or integrate into your existing Tradify repo):

```bash
# Create backend directory
mkdir tradify-backend && cd tradify-backend

# Copy files (already created in your Tradify repo)
# - prisma/schema.prisma
# - src/server.ts
# - src/config/database.ts
# - src/controllers/syncController.ts
# - src/middleware/errorHandler.ts
# - src/routes/index.ts
# - src/utils/logger.ts
# - .env.backend.example
# - docker-compose.yml
# - package.backend.json
```

### 2. Setup Environment

```bash
# Copy environment template
cp .env.backend.example .env.local

# Edit .env.local with your configuration
# (defaults should work for local development)
```

### 3. Start PostgreSQL

```bash
# Start PostgreSQL container
docker-compose up -d

# Verify it's running
docker-compose ps

# Expected output:
# NAME                 STATUS
# tradify-postgres     Up (healthy)
```

### 4. Install Dependencies

```bash
# Rename package file
cp package.backend.json package.json

# Install dependencies
npm install
```

### 5. Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed with sample data (development only)
npm run db:seed
```

### 6. Start the Server

```bash
# Development (with hot reload)
npm run dev

# OR Production
npm run build
npm start
```

**Expected output:**
```
🚀 Starting Tradify Backend (development)
📡 Connecting to database...
✅ Database connected successfully
✅ Server listening on http://localhost:3000
📚 API documentation: http://localhost:3000/api-docs
🏥 Health check: http://localhost:3000/health

📱 For mobile testing, use:
   http://192.168.1.100:3000
   http://192.168.1.50:3000
```

### 7. Test Connection

```bash
# Health check
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":"2024-07-26T10:30:00Z","uptime":5,"environment":"development"}
```

---

## 🗄️ Database Setup

### PostgreSQL via Docker Compose

```bash
# Start PostgreSQL
docker-compose up -d postgres

# View logs
docker-compose logs -f postgres

# Connect directly (if psql installed)
psql -U tradify -d tradify_db -h localhost
# Password: tradify

# Stop PostgreSQL
docker-compose down

# Stop AND remove data
docker-compose down -v
```

### Manual PostgreSQL Setup

If you prefer local PostgreSQL instead of Docker:

```bash
# Install PostgreSQL (macOS)
brew install postgresql

# Install PostgreSQL (Ubuntu/Debian)
sudo apt-get install postgresql postgresql-contrib

# Create database and user
createuser -P tradify  # Password: tradify
createdb -O tradify tradify_db

# Update .env.local:
# DATABASE_URL=postgresql://tradify:tradify@localhost:5432/tradify_db
```

---

## 📊 Prisma Commands

### Database Migrations

```bash
# Create new migration
npm run db:migrate:dev -- --name add_feature_name

# Apply pending migrations
npm run db:migrate

# Reset database (caution: deletes all data)
npm run db:reset

# View migration history
npx prisma migrate show
```

### Prisma Studio (GUI)

```bash
# Open interactive database UI
npm run db:studio

# Visit http://localhost:5555
# Browse and edit data visually
```

### Generate Prisma Client

```bash
# After schema changes, regenerate
npm run db:generate
```

---

## 🔧 Development Workflow

### File Structure

```
tradify-backend/
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── migrations/              # Migration files (auto-generated)
│   └── seed.ts                 # Seed script (optional)
├── src/
│   ├── server.ts               # Express app entry point
│   ├── config/
│   │   └── database.ts         # Prisma setup
│   ├── controllers/
│   │   └── syncController.ts   # Sync handler (main logic)
│   ├── middleware/
│   │   └── errorHandler.ts     # Error handling
│   ├── routes/
│   │   └── index.ts            # Route definitions
│   ├── types/
│   │   └── index.ts            # TypeScript types
│   └── utils/
│       └── logger.ts           # Logging utility
├── dist/                        # Compiled JavaScript (after build)
├── .env.local                  # Environment config (local)
├── .env.example                # Template (commit this)
├── docker-compose.yml          # Docker services
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
└── README.md                   # This file
```

### Adding a New Route

1. **Create controller** (`src/controllers/newController.ts`):
```typescript
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { prisma } from '../config/database';

export async function getItems(req: Request, res: Response) {
  const items = await prisma.item.findMany();
  res.json({ success: true, data: items });
}
```

2. **Register route** (`src/routes/index.ts`):
```typescript
app.get('/api/v1/items', asyncHandler(getItems));
```

3. **Test**:
```bash
curl http://localhost:3000/api/v1/items
```

---

## 🧪 Testing

### Test Sync Endpoint

```bash
# Create a test file: test-sync.sh

curl -X POST http://localhost:3000/api/v1/sync \
  -H "Content-Type: application/json" \
  -d '{
    "lastSyncedAt": 0,
    "pushChanges": {
      "jobs": [{
        "id": "job_test_1",
        "operation": "create",
        "clientVersion": 0,
        "data": {
          "artisanId": "user_1",
          "clientId": "user_2",
          "title": "Test Job",
          "description": "Test job description",
          "category": "plumbing",
          "location": "Lagos",
          "status": "DRAFT"
        }
      }]
    }
  }' | jq .
```

### Run Tests

```bash
# Run test suite
npm test

# Run with coverage
npm test -- --coverage

# Watch mode (re-run on file changes)
npm run test:watch
```

---

## 🔐 Security Best Practices

### JWT Secrets

```bash
# Generate a strong JWT secret
openssl rand -base64 32

# Add to .env.production:
JWT_SECRET=your-generated-secret
```

### Database Security

```bash
# Change default password
# In .env.production:
POSTGRES_USER=unique_username
POSTGRES_PASSWORD=strong_password
DATABASE_URL=postgresql://unique_username:strong_password@prod-db:5432/tradify_prod
```

### Environment Variables

```bash
# Development: .env.local (git ignored)
# Staging: .env.staging
# Production: .env.production (use secret manager)

# Never commit secrets!
# Use AWS Secrets Manager, HashiCorp Vault, or similar
```

---

## 📱 Connect Mobile App

### Get Your Computer's IP

```bash
# Windows (PowerShell)
ipconfig
# Look for IPv4 Address: 192.168.x.x

# macOS/Linux
ifconfig
# or
ip addr show
```

### Configure Mobile App

In your Expo app's `.env`:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.YOUR_IP:3000
```

Then:
```bash
# Reload Expo Go app
npm start
# Scan QR code
```

---

## 🚢 Production Deployment

### Heroku Deployment

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create tradify-backend

# Add PostgreSQL
heroku addons:create heroku-postgresql:standard-0

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

### AWS/Docker Deployment

```bash
# Build Docker image
docker build -t tradify-backend:latest .

# Run container
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e JWT_SECRET=... \
  --name tradify-backend \
  tradify-backend:latest
```

### Environment Variables (Production)

```bash
# .env.production
NODE_ENV=production
PORT=3000
API_URL=https://api.tradify.ng

# Database (use managed service like AWS RDS)
DATABASE_URL=postgresql://user:pass@prod-db.aws.amazon.com:5432/tradify_prod
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20

# JWT
JWT_SECRET=<strong-secret>
JWT_ACCESS_EXPIRY=2h
JWT_REFRESH_EXPIRY=7d

# CORS
CORS_ORIGINS=https://app.tradify.ng,https://www.tradify.ng

# Paystack (production keys)
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...
```

---

## 🐛 Troubleshooting

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker-compose ps

# View PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres

# Verify connection
psql -U tradify -d tradify_db -h localhost
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>  # or use Windows Task Manager

# Or use different port
PORT=3001 npm run dev
```

### Type Errors

```bash
# Regenerate Prisma types
npm run db:generate

# Recompile TypeScript
npm run build
```

### Sync Not Working

```bash
# Check server logs
npm run dev

# Test sync endpoint directly
curl http://localhost:3000/api/v1/sync

# Verify database connection
npm run db:studio
```

---

## 📚 API Endpoints

### Health & Status
- `GET /health` - Server health check

### Sync (Core Feature)
- `POST /api/v1/sync` - Bi-directional offline-first sync

### Jobs (CRUD)
- `GET /api/v1/jobs` - List jobs
- `GET /api/v1/jobs/:id` - Get job details
- `POST /api/v1/jobs` - Create job
- `PATCH /api/v1/jobs/:id` - Update job
- `DELETE /api/v1/jobs/:id` - Delete job

### Invoices
- `GET /api/v1/invoices` - List invoices
- `POST /api/v1/invoices` - Create invoice
- `GET /api/v1/invoices/:id/whatsapp` - WhatsApp formatted text

### Payments
- `POST /api/v1/payments` - Record payment
- `POST /api/v1/payments/webhook` - Paystack webhook

### Expenses
- `POST /api/v1/expenses` - Log expense
- `GET /api/v1/expenses/summary` - Expense summary

---

## 📞 Support & Documentation

- **Prisma Docs**: https://www.prisma.io/docs/
- **Express Docs**: https://expressjs.com/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Docker Docs**: https://docs.docker.com/

---

## ✅ Checklist

- [ ] Prerequisites installed (Node, Docker, etc.)
- [ ] PostgreSQL running via Docker Compose
- [ ] Environment file (.env.local) configured
- [ ] Dependencies installed (`npm install`)
- [ ] Database migrations applied (`npm run db:migrate`)
- [ ] Sample data seeded (`npm run db:seed`)
- [ ] Server starting without errors (`npm run dev`)
- [ ] Health check responding (`curl http://localhost:3000/health`)
- [ ] Sync endpoint tested
- [ ] Mobile app connected to backend

---

**Backend setup complete! Ready for production.** 🎉

For questions or issues, refer to the troubleshooting section above or check the official documentation links.
