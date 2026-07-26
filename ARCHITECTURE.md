# Tradify: Offline-First Artisan Marketplace Architecture

## 1. TECH STACK OVERVIEW

### Frontend Stack
- **Framework**: Expo + React Native (TypeScript)
- **State Management**: Redux Toolkit + Redux Persist for offline state
- **Local Database**: WatermelonDB (optimized for React Native, excellent offline-first support)
- **Sync & Queries**: TanStack Query v5 (React Query) for remote sync
- **UI Components**: React Native Paper + custom Tailwind CSS via NativeWind
- **Navigation**: React Navigation (Native Stack + Bottom Tabs)
- **Payments**: Paystack React Native SDK
- **Sharing**: Expo Sharing, Expo Linking, Expo FileSystem

### Backend (Optional - for sync)
- **API**: Node.js + Express or Hono (lightweight)
- **Database**: PostgreSQL (production) with automatic migrations
- **Authentication**: JWT with refresh token rotation
- **File Storage**: AWS S3 or Supabase Storage for PDFs/images

### Development Tools
- **Package Manager**: npm/yarn
- **Type Safety**: TypeScript strict mode
- **Testing**: Jest + React Native Testing Library
- **Linting**: ESLint + Prettier
- **Build**: EAS (Expo Application Services) for iOS/Android builds

---

## 2. OFFLINE-FIRST ARCHITECTURE PATTERN

### Data Flow Architecture

```
User Action (Create Invoice)
    ↓
Redux Thunk (immediate state update + offline queue)
    ↓
WatermelonDB (local persistence)
    ↓
Offline Queue (pending operations stored)
    ↓
Network Monitor (detects connectivity)
    ↓
TanStack Query (syncs when online with conflict resolution)
    ↓
Backend API (idempotent endpoints)
    ↓
Sync Complete → Redux state merge with server response
```

### Sync Strategy: Optimistic Updates + Conflict Resolution

When artisan updates job status offline:

1. **Local Optimistic Update**
   - Job status changes immediately in UI (Draft → In Progress)
   - Operation queued with timestamp and operation ID
   - WatermelonDB persists both job record and operation log

2. **Queued Operation Record**
   ```json
   {
     "id": "op_123abc",
     "entityType": "job",
     "entityId": "job_456",
     "operation": "update",
     "timestamp": 1690401234567,
     "clientVersion": 1,
     "changes": {
       "status": "in_progress",
       "startedAt": "2024-07-25T10:30:00Z"
     }
   }
   ```

3. **Conflict Resolution Strategy** (Last-Write-Wins with Server Authority)
   - Each record has `clientVersion` (local) and `serverVersion` (remote)
   - Server returns operation result with:
     - `success: true` (operation accepted)
     - `conflict: true` (server version newer)
     - `rejected: true` (business rule violation)
   
   - **Conflict Example**: Admin changed job status to "Completed" while artisan was offline changing it to "In Progress"
     - Server detects conflict (artisan's clientVersion < serverVersion)
     - Returns server's current state + conflict flag
     - UI prompts artisan: "Status changed by admin. Accept remote or retry local?"
   - **Automatic Merge**: For non-conflicting fields, merges local + server changes

4. **Sync Batch Processing**
   - Groups pending operations by timestamp
   - Sends as atomic batch to API endpoint: `POST /api/sync`
   - Server processes in order, returns results for each operation
   - Failed operations stay in queue with exponential backoff retry (1s → 2s → 4s → 8s)

---

## 3. LOCAL STORAGE ARCHITECTURE

### WatermelonDB Tables Structure
```
users (artisan/client profiles)
├── Basic Info: id, email, phone, name
├── Profile: bankAccount, paystackId, rating
├── Sync: _status (local|synced), _lastModified

jobs (primary business entity)
├── Metadata: id, clientId, artisanId, createdAt
├── Tracking: status, priority, dueDate
├── Sync: _status, _lastModified, _clientVersion, _serverVersion

invoices (calculated from jobs + payments)
├── Totals: materialCost, laborFee, totalAmount
├── Tracking: status, paidAmount, remainingAmount

payments (individual payment records)
├── Details: amount, method (cash|transfer|paystack)
├── Tracking: status, transactionId, paidAt

expenseLog (daily operational costs)
├── Categories: fuel, transport, tools, other
├── Tracking: amount, date, notes

operationQueue (pending sync operations)
├── Metadata: id, entityType, entityId, operation
├── Payload: changes, timestamp, clientVersion
├── Retry: retryCount, lastRetryAt, error
```

### Local Sync Status Indicators
- `_status: 'local'` - Created/modified locally, pending sync
- `_status: 'syncing'` - Currently being synced
- `_status: 'synced'` - Successfully synced
- `_status: 'conflict'` - Conflict detected, awaiting resolution
- `_status: 'failed'` - Sync failed after max retries

---

## 4. PAYMENT & EXPENSE TRACKING

### Payment Methods Integration
1. **Cash**: Recorded locally, marked as "received" by artisan
2. **Bank Transfer**: Verified via Paystack Transfers API (optional webhook)
3. **Paystack Escrow** (Recommended for Protection)
   - Client pays into Paystack (charged ~1.5% fee)
   - Amount held in escrow
   - Released to artisan after job completion confirmed
   - Handles disputes via Paystack's resolution system

### Expense Tracking
Track daily operational costs separately from job costs:
- **Fuel/Petrol**: Motor vehicle running costs
- **Transport**: Travel to client location
- **Tools**: Equipment purchases/maintenance
- **Other**: Miscellaneous operational costs

Used for:
- Calculating true job profitability
- Tax filing preparation
- Business performance analytics

---

## 5. WhatsApp & USSD Integration

### WhatsApp Invoice Sharing (via Expo Sharing)
- Format invoice as clean text message
- Generate optional PDF via `react-native-pdf-lib`
- Open WhatsApp with pre-filled message using `Linking.openURL('whatsapp://send?phone=...')`
- Include: Job details, materials list, cost breakdown, payment link

### Payment Notification via SMS/USSD
- Paystack webhook triggers SMS notification
- Simple text: "Invoice XYZ: ₦25,500 due. Pay here: [link]"
- USSD option for users without WhatsApp

---

## 6. NETWORK DETECTION & RETRY LOGIC

```typescript
// Pseudo-code for network-aware sync
const syncManager = {
  startMonitoring() {
    NetInfo.addEventListener(({ isConnected }) => {
      if (isConnected) {
        this.processPendingOperations(); // Automatic retry
      }
    });
  },

  async processPendingOperations() {
    const queue = await db.operationQueue.all();
    for (const op of queue) {
      if (op.retryCount < MAX_RETRIES) {
        try {
          const result = await api.sync([op]);
          if (result.conflict) {
            await handleConflict(op, result);
          } else if (result.success) {
            await op.destroyPermanently();
          }
        } catch (e) {
          op.incrementRetry();
        }
      }
    }
  }
};
```

---

## 7. SECURITY & DATA PRIVACY

### At Rest
- WatermelonDB stored in app sandbox (iOS Keychain for sensitive data)
- Encrypt database file on Android using SQLCipher
- Never store passwords; use JWT tokens with 24-hour expiry

### In Transit
- TLS 1.3 for all API calls
- JWT tokens in Authorization header, never URL params
- Paystack API keys in environment variables (never committed)

### Authentication Flow
1. Phone/email + password login
2. Server returns JWT (2-hour expiry) + refresh token (7-day expiry)
3. Refresh token stored in secure storage
4. Automatic token refresh before expiry via TanStack Query

---

## 8. DEPLOYMENT & CI/CD

### Local Development
```bash
npm install
npx expo prebuild # Generates native iOS/Android
npx eas build --platform ios --profile preview
npx eas build --platform android --profile preview
```

### Staging Environment
- Test Paystack account (no real charges)
- Staging API endpoint
- Deployed via EAS to TestFlight (iOS) + Google Play Internal Testing (Android)

### Production
- Separate Paystack production account
- Production API endpoint with rate limiting
- Rolling deployments via EAS with automatic rollback

---

## 9. PERFORMANCE OPTIMIZATION

### Database Queries
- Index frequently queried columns: `userId`, `status`, `createdAt`
- Lazy load invoice details (render flat list, fetch details on tap)
- Use WatermelonDB's `lazy` query for pagination

### Bundle Size
- Tree-shake unused dependencies
- Lazy-load heavy libraries (PDF, charts) on-demand
- Target: < 30MB app size

### Network
- Compress images to JPEG (80% quality)
- Implement request batching for multiple invoices
- Delta sync: only sync changed records since last sync timestamp

---

## 10. ERROR HANDLING & USER FEEDBACK

### Retry Strategy
1. Immediate retry for network timeout (3 attempts)
2. Exponential backoff (1s, 2s, 4s, 8s, 16s)
3. After 5 failed retries, move to "Failed" state
4. Show banner: "Offline changes pending. Will retry when online."
5. User can manually retry or review failed operations

### User-Facing Messages
- **Offline**: "📡 Working offline. Changes will sync when online."
- **Syncing**: "🔄 Syncing 3 invoices..."
- **Conflict**: "⚠️ Job status changed by admin. Tap to review."
- **Success**: "✅ Invoice shared via WhatsApp!"
- **Error**: "❌ Failed to load jobs. Tap to retry."

---

## 11. FOLDER STRUCTURE

```
tradify/
├── app/                          # Expo Router navigation
│   ├── (auth)/                   # Auth screens (login, signup)
│   ├── (dashboard)/              # Main app screens
│   │   ├── jobs/
│   │   ├── invoices/
│   │   ├── payments/
│   │   └── expenses/
│   └── _layout.tsx
├── src/
│   ├── components/               # Reusable UI components
│   │   ├── InvoiceForm.tsx
│   │   ├── JobCard.tsx
│   │   └── PaymentMethod.tsx
│   ├── db/                       # WatermelonDB schemas
│   │   ├── schema.ts
│   │   └── migrations.ts
│   ├── services/
│   │   ├── api.ts                # API client with TanStack Query
│   │   ├── sync.ts               # Sync engine
│   │   └── paystack.ts
│   ├── hooks/                    # Custom React hooks
│   │   ├── useOfflineQueue.ts
│   │   ├── useSyncedQuery.ts
│   │   └── usePayment.ts
│   ├── store/                    # Redux state
│   │   ├── slices/
│   │   └── store.ts
│   ├── utils/
│   │   ├── formatting.ts
│   │   ├── validation.ts
│   │   └── retry.ts
│   └── types/
│       └── index.ts
├── app.json                      # Expo config
├── tsconfig.json
├── package.json
└── README.md
```

---

## 12. KEY APIS & ENDPOINTS

### Required Backend Endpoints
```
POST   /api/auth/login           # Email + password
POST   /api/auth/refresh         # Refresh JWT token
POST   /api/sync                 # Batch sync with conflict resolution
GET    /api/jobs                 # Fetch jobs (with delta filtering)
POST   /api/jobs                 # Create job
PATCH  /api/jobs/:id             # Update job
POST   /api/invoices/:id/share   # Share invoice (returns signed URL)
POST   /api/payments             # Record payment
GET    /api/paystack/callback    # Paystack webhook verification
```

### Request/Response Format
```typescript
// Sync request
{
  "operations": [
    {
      "id": "op_123",
      "entityType": "job",
      "entityId": "job_456",
      "operation": "update",
      "clientVersion": 1,
      "changes": { "status": "in_progress" }
    }
  ]
}

// Sync response
{
  "results": [
    {
      "operationId": "op_123",
      "success": true,
      "serverVersion": 2,
      "data": { /* merged entity */ }
    }
  ]
}
```

---

## 13. TESTING STRATEGY

### Unit Tests
- Redux reducers for offline state
- Invoice calculation logic
- Payment split validation

### Integration Tests
- Sync engine with mock network failures
- Conflict resolution scenarios
- WhatsApp share formatting

### E2E Tests
- Create invoice → Share via WhatsApp
- Offline edit → Online sync
- Payment reconciliation

---

This architecture prioritizes reliability in low-bandwidth environments while maintaining a responsive, offline-capable user experience. The three-tier sync strategy (local → queue → server) ensures no data is lost, even during network interruptions.
