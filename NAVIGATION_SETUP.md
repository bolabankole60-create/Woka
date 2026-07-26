# Expo Router Navigation Setup Guide

Complete navigation architecture for Tradify using Expo Router (file-based routing).

## 📂 Directory Structure Created

```
app/
├── _layout.tsx                      # Root layout (providers, auth check)
├── (auth)/
│   ├── _layout.tsx                 # Auth stack layout
│   ├── login.tsx                   # Login screen
│   └── signup.tsx                  # Signup screen (stub)
├── (tabs)/
│   ├── _layout.tsx                 # Tab navigator configuration
│   ├── index.tsx                   # Dashboard screen
│   ├── jobs.tsx                    # Jobs list screen
│   └── expenses.tsx                # Expenses logger screen
└── invoice/
    └── new.tsx                     # Invoice creation modal
```

## 🔄 Navigation Flow

### Authentication Flow
```
App Start → _layout.tsx (Root)
    ├─ Initialize API & restore tokens
    ├─ Check if authenticated
    │
    ├─ If NOT authenticated
    │   └─→ (auth)/login.tsx
    │       └─ User logs in
    │       └─ Tokens saved to SecureStore
    │       └─ Redirect to /(tabs)
    │
    └─ If authenticated
        └─→ (tabs)/_layout.tsx (Bottom Tabs)
            ├─ index.tsx (Dashboard)
            ├─ jobs.tsx (Jobs)
            └─ expenses.tsx (Expenses)
```

### Modal Routing
```
Dashboard (index.tsx)
    └─ FAB "New Invoice" button
    └─ router.push('/invoice/new')
    └─ Opens invoice/new.tsx (fullscreen modal)
    └─ User creates invoice
    └─ router.back() returns to dashboard
```

## 📱 Screens Overview

### Root Layout (`app/_layout.tsx`)
- **Purpose**: Global provider setup and authentication check
- **Providers**:
  - `QueryClientProvider` (TanStack Query for sync)
  - `SafeAreaProvider` (Edge-to-edge layout)
  - `StatusBar` (iOS/Android status bar)
- **Auth Logic**: Checks SecureStore for tokens, redirects accordingly
- **State**: `isInitialized`, `isAuthenticated`

### Auth Layout (`app/(auth)/_layout.tsx`)
- **Purpose**: Stack layout for auth screens
- **Screens**:
  - `login.tsx` - Email/password login with validation
  - `signup.tsx` - Account creation (stub for expansion)
- **Styling**: No header, card-style navigation

### Tab Navigation (`app/(tabs)/_layout.tsx`)
- **Purpose**: Bottom tab navigator for main app
- **Configuration**:
  - Header enabled with simple styling
  - Bottom tab bar with icons and labels
  - Three tabs with visual indicators
- **Tabs**:
  1. **Dashboard** (home icon) → `index.tsx`
  2. **Jobs** (briefcase icon) → `jobs.tsx`
  3. **Expenses** (cash icon) → `expenses.tsx`

### Dashboard Screen (`app/(tabs)/index.tsx`)
- **Features**:
  - Personalized greeting ("Welcome back, Chidike")
  - Summary cards:
    - Pending invoices total & count
    - Today's expenses total & count
  - Recent jobs list (clickable)
  - Floating Action Button (FAB) for "New Invoice"
- **Interactions**:
  - Cards navigate to related tabs
  - FAB opens invoice modal
  - Jobs list shows status badges with colors
- **Data**: Mock data for demonstration

### Jobs Screen (`app/(tabs)/jobs.tsx`)
- **Features**:
  - Filter tabs: All, Draft, In Progress, Completed
  - Job cards with:
    - Title and location
    - Status badge with color coding
    - Total amount, paid amount, pending amount
  - Clickable job cards for detail view (stub)
- **Data**: Mock job data with various statuses
- **Styling**: Color-coded by status

### Expenses Screen (`app/(tabs)/expenses.tsx`)
- **Features**:
  - Today's expense summary card
  - Quick "Log Expense" button
  - Expenses list with:
    - Category icon and color
    - Description
    - Amount
  - Bottom sheet modal for adding expenses
- **Categories**: Fuel, Transport, Tools, Equipment, Other
- **Data**: Mock expense data

### Invoice Modal (`app/invoice/new.tsx`)
- **Purpose**: Fullscreen modal for creating invoices
- **Integration**:
  - Wraps `InvoiceShareScreen` component
  - Passes pre-filled job data
  - Close button in header
  - router.back() to return to dashboard
- **Route**: Opened via `router.push('/invoice/new')`

## 🔌 Integration Points

### With InvoiceShareScreen
```typescript
// Dashboard FAB button
<TouchableOpacity onPress={() => router.push('/invoice/new')}>
  <MaterialCommunityIcons name="plus" size={28} color="#fff" />
</TouchableOpacity>

// In invoice/new.tsx
<InvoiceShareScreen
  route={{
    params: {
      jobData: {
        artisanName: 'Chidike Okafor', // Pre-filled
        clientName: '',
        clientPhone: '',
      }
    }
  }}
/>
```

### With API Client
```typescript
// Root layout initializes API
import { apiClient, initializeAPI } from '@/services/api';

await initializeAPI(); // Restores tokens from SecureStore
const user = await apiClient.login(email, password);
```

### With TanStack Query
```typescript
// Any screen can use queries
import { useQuery } from '@tanstack/react-query';

const { data: jobs, isLoading } = useQuery({
  queryKey: ['jobs'],
  queryFn: () => apiClient.getJobs(artisanId),
});
```

## 🎨 Styling Patterns

### Colors
- **Primary**: `#0066cc` (Blue - actions, headers)
- **Success**: `#00b050` (Green - completed, paid)
- **Warning**: `#ff9800` (Orange - in progress, expenses)
- **Danger**: `#dc3545` (Red - errors)
- **Text**: `#1a1a1a` (Dark gray - primary), `#666` (Medium gray - secondary)
- **Background**: `#f5f5f5` (Light gray - surfaces), `#fff` (White - cards)

### Common Components
```typescript
// Card with shadow
<View style={{
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
}} />

// Tab button
<TouchableOpacity
  style={{
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: isActive ? '#0066cc' : '#f0f0f0',
  }}
/>

// Status badge
<View style={{
  backgroundColor: statusColor,
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 4,
}} />
```

## 🔐 Authentication Flow Detailed

### Login Process
1. User enters email & password in `login.tsx`
2. Validation checks email format and password length
3. API call: `apiClient.login(email, password)`
4. Response includes `accessToken` and `refreshToken`
5. Tokens saved to SecureStore via `apiClient.saveTokens()`
6. Router redirects to `/(tabs)` (dashboard)

### Token Refresh
- Access token: 2-hour expiry
- Refresh token: 7-day expiry
- API client auto-refreshes on 401 response
- New tokens saved to SecureStore

### Logout
```typescript
// From any screen
const handleLogout = async () => {
  await apiClient.logout();
  await apiClient.clearTokens();
  router.replace('/(auth)/login');
};
```

## 📲 Testing Navigation

### Test Authentication
1. Run `npm start`
2. Scan QR code with Expo Go
3. App shows login screen
4. Enter demo credentials:
   - Email: `okafor.plumber@gmail.com`
   - Password: `password123`
5. Should redirect to dashboard

### Test Tab Navigation
1. From dashboard, tap different tab icons
2. Verify screen changes and tab highlights
3. Tab styling updates correctly

### Test Invoice Modal
1. On dashboard, tap FAB (+ button)
2. Invoice creation modal opens fullscreen
3. Complete invoice form
4. Tap close button (X) or back
5. Returns to dashboard

### Test Deep Linking (Future)
```typescript
// Navigate directly to jobs
router.push('/(tabs)/jobs');

// Navigate to specific job (when implemented)
router.push('/(tabs)/jobs/job_1');
```

## 🚀 Next Steps

### Implement Missing Screens
1. **Job Detail** (`app/(tabs)/jobs/[id].tsx`)
   - Show full job information
   - Update job status
   - View related invoices

2. **Job Creation** (`app/job/new.tsx`)
   - New job modal
   - Client selection
   - Cost estimation

3. **Signup** (`app/(auth)/signup.tsx`)
   - Complete signup form
   - User role selection
   - Trade/category selection

### Add Features
1. **Navigation Guards**: Protect routes based on role/subscription
2. **Deep Linking**: Handle URLs from external apps
3. **Splash Screen**: Add branded launch screen
4. **Notifications**: Push notification handling
5. **Offline Support**: Handle network state changes

### Styling Improvements
1. **Dark Mode**: Add dark theme support
2. **Animations**: Add screen transitions
3. **Loading States**: Skeleton screens
4. **Error Boundaries**: Better error handling UI

## 📚 Dependencies Used

```json
{
  "expo": "^51.0.0",
  "expo-router": "^3.4.8",
  "react-navigation": "^6.1.8",
  "react-native-safe-area-context": "^4.7.4",
  "@tanstack/react-query": "^5.28.0",
  "expo-secure-store": "^12.3.2",
  "@expo/vector-icons": "included"
}
```

## 🔧 Debugging Navigation

### Enable Console Logging
```typescript
// Add to root layout
useEffect(() => {
  const unsubscribe = useNavigationContainerRef()?.addEventListener?.('state', (e) => {
    console.log('[Navigation] State change:', e.data.state);
  });
  return unsubscribe;
}, []);
```

### Check Route State
```typescript
// In any screen
const router = useRouter();
const route = useRoute();
console.log('[Route] Current path:', route.name);
```

### Monitor Auth State
```typescript
// In root layout
useEffect(() => {
  console.log('[Auth] Initialized:', isInitialized);
  console.log('[Auth] Authenticated:', isAuthenticated);
  console.log('[Auth] Segments:', segments);
}, [isInitialized, isAuthenticated, segments]);
```

## 📖 Reference

- **Expo Router Docs**: https://docs.expo.dev/routing/introduction/
- **React Navigation**: https://reactnavigation.org/
- **File-based Routing**: https://docs.expo.dev/routing/file-based-routing/

---

**Navigation setup complete! The app is now ready for feature development.** 🚀
