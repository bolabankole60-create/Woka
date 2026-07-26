# Tradify Expo Router Architecture

## 📂 Directory Structure

```
app/
├── _layout.tsx                 # Root layout with providers (TanStack Query, SafeArea, DB)
├── (auth)/                     # Authentication group (not shown when authenticated)
│   ├── _layout.tsx            # Auth stack layout
│   ├── login.tsx              # Login screen
│   └── signup.tsx             # Signup screen (optional)
├── (tabs)/                    # Main app tab navigation (shown when authenticated)
│   ├── _layout.tsx            # Tab navigator configuration
│   ├── index.tsx              # Dashboard tab
│   ├── jobs.tsx               # Jobs tab
│   └── expenses.tsx           # Expenses tab
└── invoice/                   # Modal routes for invoice management
    └── new.tsx                # New invoice modal (uses existing InvoiceShareScreen)
```

## 🔄 Navigation Flow

```
App Start
    ↓
_layout.tsx (Root)
    ├─ Check Auth Status
    ├─ Initialize DB & Sync
    ├─ Setup Providers (Query, SafeArea)
    │
    ├─ If NOT Authenticated
    │   └─→ (auth)/_layout.tsx
    │       ├─ login.tsx
    │       └─ signup.tsx
    │
    └─ If Authenticated
        └─→ (tabs)/_layout.tsx
            ├─ index.tsx (Dashboard)
            ├─ jobs.tsx (Jobs List)
            └─ expenses.tsx (Expenses)
            
Modal Routes (Overlays):
    └─ invoice/new.tsx (Creates invoice from dashboard FAB)
```

## 📱 Screen Breakdown

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `_layout.tsx` | Root provider setup & auth check |
| `/(auth)/login` | `login.tsx` | Login/signup screen |
| `/(tabs)` | `_layout.tsx` | Bottom tab navigator |
| `/(tabs)/` | `index.tsx` | Dashboard with summary & FAB |
| `/(tabs)/jobs` | `jobs.tsx` | Active jobs list |
| `/(tabs)/expenses` | `expenses.tsx` | Quick expense logger |
| `/invoice/new` | `new.tsx` | New invoice modal (fullscreen) |

## 🔐 Authentication Flow

1. **Cold Start**: User not logged in
   - Redirect to `/(auth)/login`
   - User enters credentials
   - JWT stored in SecureStore
   - Redirect to `/(tabs)` (dashboard)

2. **Warm Start**: JWT in SecureStore
   - Auto-restore token
   - Redirect to `/(tabs)` directly

3. **Logout**: User logs out
   - Clear SecureStore tokens
   - Redirect to `/(auth)/login`

## 📊 Provider Hierarchy

```
<RootLayout>
  <QueryClientProvider>        {/* TanStack Query */}
    <SafeAreaProvider>         {/* Expo SafeArea */}
      <AuthProvider>           {/* Custom auth state */}
        <RootNavigator>        {/* Conditional routing */}
          {isAuthenticated ? <TabsLayout /> : <AuthLayout />}
        </RootNavigator>
      </AuthProvider>
    </SafeAreaProvider>
  </QueryClientProvider>
</RootLayout>
```

## 🎨 UI Components Used

- **Tab Navigation**: Expo Router `<Tabs>` with `useBottomTabBarHeight`
- **Dashboard**: React Native `<View>`, `<Text>`, `<ScrollView>`
- **Cards**: Custom styled containers with shadows
- **FAB**: TouchableOpacity with absolute positioning
- **Icons**: React Native vector icons (MaterialCommunityIcons)

## 🔌 Integration Points

### InvoiceShareScreen
- Opened via modal route: `/invoice/new`
- Returns to dashboard on save
- Accesses WatermelonDB for persistence

### API Client
- Initialized in root layout
- Provides token management
- Auto-refresh on 401

### Database
- WatermelonDB initialized in root layout
- Synced via custom hooks
- Accessible from any screen via context/providers
