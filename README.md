# Tradify - Offline-First Artisan Marketplace

A React Native + Expo mobile application for the Nigerian artisan and SME market. Built with offline-first architecture to handle unstable networks and local constraints.

## 🚀 Features

- **Offline-First Architecture**: Full functionality without internet connection
- **Automatic Sync**: Queues operations offline, syncs when online
- **Smart Conflict Resolution**: Handles conflicting edits between devices
- **Invoice Management**: Create professional invoices with cost breakdown
- **WhatsApp Integration**: Share invoices directly via WhatsApp
- **Payment Tracking**: Cash, bank transfer, and Paystack integration
- **Expense Logging**: Track daily operational costs (fuel, transport, tools)
- **Secure Auth**: JWT-based authentication with token refresh
- **Local Database**: WatermelonDB for optimized React Native queries

## 📦 Tech Stack

### Frontend
- **Framework**: Expo + React Native (TypeScript)
- **State Management**: Redux Toolkit + Redux Persist
- **Local Database**: WatermelonDB
- **Sync & Queries**: TanStack Query v5
- **Navigation**: React Navigation
- **UI**: React Native Paper + NativeWind
- **Payments**: Paystack
- **Sharing**: Expo Sharing, Expo Linking

### Backend (Optional)
- **API**: Node.js + Express
- **Database**: PostgreSQL
- **Authentication**: JWT
- **File Storage**: S3 / Supabase Storage

## 🏗️ Project Structure

```
tradify/
├── app/                              # Expo Router navigation
│   ├── (auth)/                      # Auth screens (login, signup)
│   ├── (dashboard)/                 # Main app screens
│   │   ├── jobs/                   # Job listing & detail
│   │   ├── invoices/               # Invoice management
│   │   ├── payments/               # Payment tracking
│   │   └── expenses/               # Expense logging
│   └── _layout.tsx
│
├── src/
│   ├── components/                  # Reusable UI components
│   │   ├── InvoiceForm.tsx
│   │   ├── JobCard.tsx
│   │   └── PaymentMethod.tsx
│   │
│   ├── db/                         # WatermelonDB setup
│   │   ├── database.ts            # Schema and initialization
│   │   └── migrations.ts          # Schema migrations
│   │
│   ├── hooks/                      # Custom React hooks
│   │   ├── useSyncedQuery.ts      # Offline sync hook
│   │   ├── useOfflineQueue.ts     # Queue management
│   │   └── useConflictResolution.ts
│   │
│   ├── screens/                    # Full-screen components
│   │   ├── InvoiceShareScreen.tsx # Invoice creation & share
│   │   └── ... other screens
│   │
│   ├── services/                   # API & business logic
│   │   ├── api.ts                 # API client with TanStack Query
│   │   ├── sync.ts                # Offline sync engine
│   │   └── paystack.ts            # Paystack integration
│   │
│   ├── store/                      # Redux state management
│   │   ├── slices/
│   │   │   ├── authSlice.ts
│   │   │   ├── jobsSlice.ts
│   │   │   └── uiSlice.ts
│   │   └── store.ts
│   │
│   ├── types/                      # TypeScript definitions
│   │   └── index.ts
│   │
│   └── utils/                      # Utility functions
│       ├── formatting.ts           # Currency, phone, date formatting
│       └── validation.ts           # Input validation
│
├── prisma/                         # Prisma schema (for backend)
│   └── schema.prisma
│
├── ARCHITECTURE.md                 # Detailed architecture guide
├── app.json                       # Expo configuration
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
└── README.md                      # This file
```

## 🛠️ Getting Started

### Prerequisites

- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Expo CLI**: `npm install -g eas-cli`
- **Development environment**:
  - iOS: Xcode (Mac only)
  - Android: Android Studio + SDK
  - Or use Expo Go for quick testing

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/tradify.git
   cd tradify
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Initialize Expo project**
   ```bash
   npx expo prebuild --clean
   ```

### Development

**Run on Expo Go (quickest for testing)**
```bash
npm start
```
Then scan the QR code with:
- **iOS**: Camera app (built-in)
- **Android**: Expo Go app

**Run on Android Emulator/Device**
```bash
npm run android
```

**Run on iOS Simulator/Device**
```bash
npm run ios
```

**Run on Web**
```bash
npm run web
```

## 📱 Features Guide

### Creating an Invoice

1. Navigate to the InvoiceShare screen
2. Enter client name and phone
3. Add line items (materials and labor)
   - Material costs automatically separated
   - Labor fees separately tracked
4. Apply tax rate and discount if needed
5. Share via WhatsApp or save locally

**Code Reference**: [InvoiceShareScreen.tsx:src/screens/InvoiceShareScreen.tsx](src/screens/InvoiceShareScreen.tsx)

### Offline Functionality

All operations are stored locally when offline:

1. **Immediate Local Save**: Data saved to WatermelonDB instantly
2. **Operation Queued**: Change added to OperationQueue
3. **Automatic Sync**: When online, operations are sent to server
4. **Conflict Resolution**: If conflicts detected, user is prompted

**Hooks Reference**:
- [useSyncedQuery.ts](src/hooks/useSyncedQuery.ts) - Query with offline support
- [useOfflineQueue.ts](src/hooks/useSyncedQuery.ts) - Manage pending operations

### Payment Tracking

Support for multiple payment methods:

1. **Cash**: Record when received, no verification
2. **Bank Transfer**: Manual entry with transaction ID
3. **Paystack Escrow** (recommended): 
   - Secure payment holding
   - Automatic release on job completion
   - Dispute resolution built-in

**API Reference**: [services/api.ts:src/services/api.ts#L265-L310](src/services/api.ts)

### Expense Logging

Track daily operational costs:

- **Fuel/Petrol**: Motor vehicle running costs
- **Transport**: Travel to client locations
- **Tools**: Equipment purchases/maintenance
- **Equipment**: Large asset purchases
- **Other**: Miscellaneous

Used for profitability analysis and tax filing.

## 🔐 Authentication & Security

### Token Management

- **Access Token**: 2-hour expiry, used for API requests
- **Refresh Token**: 7-day expiry, stored in secure storage
- **Auto-Refresh**: Tokens automatically refreshed before expiry

### Secure Storage

- **iOS**: Keychain encryption
- **Android**: Keystore encryption
- **Environment Variables**: Never commit `.env` file

### Data Privacy

- TLS 1.3 for all API calls
- JWT tokens in Authorization header
- No sensitive data in URLs
- Database encrypted on Android via SQLCipher

## 🔄 Sync Architecture

### How Offline-to-Online Sync Works

```
1. User Action (offline)
   ↓
2. Optimistic Update (UI updates immediately)
   ↓
3. Local Storage (saved to WatermelonDB)
   ↓
4. Queue Operation (added to OperationQueue)
   ↓
5. Detect Online (Network monitor detects connectivity)
   ↓
6. Batch Send (all pending operations sent to server)
   ↓
7. Conflict Resolution (server checks for conflicts)
   ↓
8. Merge & Notify (local state updated with server response)
```

### Conflict Resolution Strategy

**Default: Server-Wins**
- Server's version takes precedence
- User is prompted if conflict detected
- Option to retry locally or accept server state

**Alternative Strategies**:
- Client-Wins: Keep local changes
- Merge: Combine non-conflicting fields

**Reference**: [Architecture.md#3-local-storage-architecture](ARCHITECTURE.md#3-local-storage-architecture)

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

## 📦 Building & Deployment

### Build APK (Android)
```bash
npm run build:android
```

### Build IPA (iOS)
```bash
npm run build:ios
```

### Submit to App Stores
```bash
npm run submit:android
npm run submit:ios
```

### Production Configuration

Before deploying:

1. **Update version numbers** in `app.json`
2. **Set environment variables**:
   ```bash
   export EXPO_PUBLIC_API_URL="https://api.tradify.ng"
   export PAYSTACK_PUBLIC_KEY="pk_live_xxxxx"
   ```
3. **Generate signing keys**:
   ```bash
   eas credentials
   ```
4. **Build & submit**:
   ```bash
   eas build --platform all
   eas submit --platform all
   ```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/signup` - Create account
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Jobs
- `GET /api/jobs` - List jobs
- `POST /api/jobs` - Create job
- `PATCH /api/jobs/:id` - Update job

### Invoices
- `POST /api/invoices` - Create invoice
- `POST /api/invoices/:id/share` - Generate share link
- `PATCH /api/invoices/:id` - Update status

### Payments
- `POST /api/payments` - Record payment
- `POST /api/payments/paystack/initialize` - Start Paystack payment
- `POST /api/payments/paystack/verify` - Verify payment

### Sync
- `POST /api/sync` - Batch sync operations
- `GET /api/sync/delta` - Delta sync since timestamp

### Expenses
- `POST /api/expenses` - Log expense
- `GET /api/expenses/summary` - Get summary

**Full API Specification**: See [services/api.ts](src/services/api.ts)

## 📊 Database Schema

**Local (WatermelonDB)**:
- `users` - Artisan and client profiles
- `jobs` - Main job records
- `invoices` - Generated invoices
- `invoice_items` - Line items
- `payments` - Payment tracking
- `expense_logs` - Operational expenses
- `operation_queue` - Pending sync operations

**Remote (PostgreSQL)**:
Same structure with additional audit trails

**Schema Reference**: [prisma/schema.prisma](prisma/schema.prisma)

## 🎯 Performance Optimization

### Bundle Size
- Target: < 30MB app size
- Tree-shake unused dependencies
- Lazy load heavy modules (PDF, charts)

### Database
- Index frequently queried columns
- Lazy load invoice details
- Implement pagination for large lists

### Network
- Compress images to 80% quality
- Batch multiple requests
- Delta sync for efficient updates

## 📝 Environment Variables

Create `.env` file:

```env
# API Configuration
EXPO_PUBLIC_API_URL=https://api.tradify.local

# Paystack
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx

# Firebase (optional)
FIREBASE_API_KEY=xxxxx
FIREBASE_AUTH_DOMAIN=xxxxx

# Feature Flags
ENABLE_PAYSTACK_ESCROW=true
ENABLE_OFFLINE_QUEUE=true
```

## 🐛 Debugging

### Enable Debug Logging
```bash
export DEBUG=tradify:*
npm start
```

### Inspect Local Database
```bash
# In your app, add to console
import { database } from './src/db/database';
const jobs = await database.get('jobs').query().fetch();
console.log(jobs);
```

### Network Request Logging
```typescript
// In services/api.ts, uncomment:
// this.client.interceptors.request.use(config => {
//   console.log('API Request:', config);
//   return config;
// });
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 📞 Support

- **Documentation**: See [ARCHITECTURE.md](ARCHITECTURE.md)
- **Issues**: GitHub Issues
- **Email**: support@tradify.ng

## 🗺️ Roadmap

- [ ] Dashboard analytics (profitability, earnings)
- [ ] Team management (assign jobs to team members)
- [ ] Client ratings & reviews
- [ ] SMS notifications for payments
- [ ] USSD support for low-bandwidth users
- [ ] Multi-language support
- [ ] Offline map support
- [ ] Photo editing & before/after gallery

---

**Made with ❤️ for Nigerian Artisans**
