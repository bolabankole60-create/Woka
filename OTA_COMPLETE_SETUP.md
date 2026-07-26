# OTA Updates - Complete Setup & Implementation

**Over-The-Air Update System for Tradify**

Date: 2026-07-26  
Status: ✅ READY TO IMPLEMENT

---

## 🎯 What You'll Implement

A complete Over-The-Air (OTA) update system that allows you to:

✅ **Instant Deployment** - Push bug fixes in 1 minute (vs 2-4 days via Play Store)  
✅ **Smart Downloads** - 5MB updates (vs 50MB APK re-download)  
✅ **Silent Updates** - Background check + notification (not forced)  
✅ **Easy Rollback** - Delete broken update, users revert instantly  
✅ **Nigeria-Friendly** - 3-second timeout for slow networks  

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         USER'S DEVICE                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Tradify App (v1.0.0)                               │   │
│  │  - Native code (Paystack, Sync, etc)                │   │
│  │  - channel: "preview"  (config in app.json)         │   │
│  └──────────────────────────────────────────────────────┘   │
│           ▲                                    │              │
│           │                                    ▼              │
│           │                          ┌──────────────────┐   │
│           │                          │  UpdateCheck.tsx │   │
│           │                          │  ─────────────── │   │
│           │                          │ 1. On app start  │   │
│           │                          │ 2. Check updates │   │
│           │                          │ 3. Download if   │   │
│           │                          │    available     │   │
│           │                          │ 4. Show banner   │   │
│           │                          │ 5. User taps     │   │
│           │                          │    "Reload"      │   │
│           │                          └──────────────────┘   │
│           │                                    │              │
│           └────────────────────────────────────┘              │
│                 Reload with new code                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ Check for updates
                            │ Download bundles
                            │
┌─────────────────────────────────────────────────────────────┐
│                    EXPO SERVERS                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Channel: preview                                   │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  Update 1 (latest): HMAC bug fix                   │   │
│  │  Update 2: Expense category fix                     │   │
│  │  Update 3: Performance optimization                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Channel: production                                │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  Update 1 (latest): Security hotfix                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ eas update --channel preview
                            │ eas update --channel production
                            │
┌─────────────────────────────────────────────────────────────┐
│                   ENGINEER'S COMPUTER                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Fix bug in code                                         │
│  2. Test locally (npm start)                               │
│  3. Deploy: eas update --channel preview                   │
│  4. Update published to Expo servers                       │
│  5. Users' phones fetch automatically                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Files to Update/Create

### 1. **app.json** (Modify)

**What:** Add expo-updates plugin configuration  
**File:** `app-with-updates.json` (template)  
**Action:** Copy `app-with-updates.json` → `app.json`

**Key Changes:**
```json
{
  "plugins": [
    [
      "expo-updates",
      {
        "url": "https://u.expo.dev/YOUR_PROJECT_ID",
        "runtimeVersion": "sdkVersion",
        "checkAutomatically": "ON_APP_START",
        "fallbackToCacheTimeout": 3000
      }
    ]
  ]
}
```

**Important:** Update `YOUR_PROJECT_ID`

---

### 2. **eas.json** (Modify)

**What:** Add channel configuration to build profiles  
**File:** `eas-with-channels.json` (template)  
**Action:** Copy `eas-with-channels.json` → `eas.json`

**Key Changes:**
```json
{
  "build": {
    "preview": {
      "channel": "preview"
    },
    "production": {
      "channel": "production"
    }
  }
}
```

---

### 3. **src/components/UpdateCheck.tsx** (Create)

**What:** Programmatic OTA update handler  
**File:** `UpdateCheck.tsx`  
**Action:** Copy to `src/components/UpdateCheck.tsx`

**Features:**
- Checks for updates on app startup
- Downloads silently in background
- Shows non-intrusive notification banner
- User can tap "Reload" to apply update
- Graceful timeout for poor networks (3 seconds)

---

### 4. **app/_layout.tsx** (Modify)

**What:** Import and use UpdateCheck component  
**Action:** Add two lines to root layout

```typescript
import UpdateCheck from '@/components/UpdateCheck';

export default function RootLayout() {
  return (
    <Stack>
      <UpdateCheck />  {/* Add this line */}
      {/* Rest of your layout */}
    </Stack>
  );
}
```

---

## 🚀 Step-by-Step Implementation

### Step 1: Update Configuration Files

```bash
# 1. Backup current files
cp app.json app.json.backup
cp eas.json eas.json.backup

# 2. Copy new configs (with expo-updates)
cp app-with-updates.json app.json
cp eas-with-channels.json eas.json

# 3. Get your Expo project ID
expo config --type public | jq '.projectId'
# Output: abc123def456...

# 4. Update app.json with your project ID
nano app.json
# Find: "url": "https://u.expo.dev/YOUR_PROJECT_ID"
# Replace: YOUR_PROJECT_ID with your actual ID
# Example: "url": "https://u.expo.dev/abc123def456"

# 5. Verify changes
cat app.json | grep -A 5 "expo-updates"
cat eas.json | grep -A 2 '"channel"'
```

---

### Step 2: Add UpdateCheck Component

```bash
# 1. Create components directory if needed
mkdir -p src/components

# 2. Copy UpdateCheck component
cp UpdateCheck.tsx src/components/UpdateCheck.tsx

# 3. Verify file exists
ls -la src/components/UpdateCheck.tsx
```

---

### Step 3: Import UpdateCheck in Root Layout

```bash
# 1. Open root layout
nano app/_layout.tsx

# 2. Add import at top
import UpdateCheck from '@/components/UpdateCheck';

# 3. Add <UpdateCheck /> inside JSX
# Should be near top of component tree
# Example:
# export default function RootLayout() {
#   return (
#     <QueryClientProvider client={queryClient}>
#       <UpdateCheck />  ← Add this line
#       <SafeAreaProvider>
#         {/* Rest of layout */}
#       </SafeAreaProvider>
#     </QueryClientProvider>
#   );
# }

# 4. Test TypeScript
npm run type-check
# Should have no errors

# 5. Test locally
npm start
# App should start normally
# Look for: "UpdateCheck mounted" in console logs
```

---

### Step 4: Install Expo Updates Library

```bash
# If not already installed
npm install expo-updates

# Or with yarn
yarn add expo-updates

# Verify installation
npm list expo-updates
```

---

### Step 5: Build Base APK with Channels

```bash
# This is the last APK your testers need to download
# After this, all updates are via OTA

# 1. Ensure eas.json has channels configured
cat eas.json | grep channel
# Should show: "channel": "preview"

# 2. Build preview APK
eas build --platform android --profile preview --wait

# 3. Output will show
# ✅ Build succeeded
# Channel: preview
# Download: [APK link]

# 4. Share with testers
# This APK will automatically receive OTA updates
```

---

### Step 6: Deploy First Update

```bash
# 1. Make a test change
nano src/screens/InvoiceShareScreen.tsx
# Change a text string or UI color

# 2. Test locally
npm start
# Verify change looks good

# 3. Deploy to preview channel
eas update --channel preview --message "Test OTA: Minor UI update"

# 4. Output will show
# ✅ Update published
# Message ID: xxxxx
# Channel: preview

# 5. Testers' phones will receive
# On next app startup: check for updates
# Banner shows: "New version available! Tap to update"
# User taps "Reload"
# App restarts with new code
```

---

## 🎯 Three Use Cases

### Use Case 1: Fix Bug in QA (5 minutes)

```
1. Tester finds: "Payment verification failing"
2. Engineer: Debugs and finds HMAC bug
3. Engineer: Fix code
4. Engineer: npm start (test locally)
5. Engineer: eas update --channel preview
6. Tester: Waits 5 seconds for notification
7. Tester: Taps "Reload" button
8. Tester: "Bug fixed!"
```

**Result:**
- ✅ Bug fixed in 5 minutes
- ✅ No APK re-download
- ✅ Tester tests new build immediately
- ✅ Back to productive testing

---

### Use Case 2: Performance Optimization for Production (1 hour)

```
1. Engineer: Identifies slow startup (5 seconds on 3G)
2. Engineer: Optimize API calls
3. Engineer: Cache results locally
4. Engineer: npm start (test on slow connection)
5. Engineer: eas update --channel production
6. All users: Automatically receive on next startup
7. Metrics: Crash rate drops 50% (fewer force-closes)
8. Analytics: User satisfaction improves
```

**Result:**
- ✅ Performance improved instantly
- ✅ No Play Store review
- ✅ No APK re-download
- ✅ All users benefit automatically

---

### Use Case 3: Feature Flag for A/B Testing (30 minutes)

```
1. Engineer: Add feature flag in code
2. Engineer: Feature behind: if (FEATURE_ENABLED) { ... }
3. Engineer: Deploy with flag off: eas update --channel production
4. QA: Approves feature
5. Engineer: Enable flag in API or config
6. Engineer: Deploy: eas update --channel production
7. Users: Gradually see feature (if using graduated rollout)
8. Metrics: Track adoption and crashes
9. Engineer: Disable if issues: eas update:delete
```

**Result:**
- ✅ Safe feature rollout
- ✅ Quick enable/disable
- ✅ No code rebuild needed
- ✅ Easy A/B testing

---

## 🔐 Security Considerations

### What OTA Can Do Safely

✅ Update JavaScript code  
✅ Fix bugs in business logic  
✅ Add feature flags  
✅ Change API endpoints  
✅ Update UI styling  
✅ Modify local database queries  

### What OTA Cannot Change (Requires New APK)

❌ Native module versions (Paystack SDK)  
❌ Android permissions  
❌ Native code compilation  
❌ SDK version  
❌ Required dependencies  

### Why Runtime Version Matters

**Setting:** `"runtimeVersion": "sdkVersion"`

This ensures updates only run on compatible runtime:

```
Your App: Expo SDK 51
├─ PaystackSDK v2.0
├─ React Native v0.74
└─ Native Libraries: X, Y, Z

Update: Only for SDK 51
├─ Can change: JavaScript
├─ Cannot change: Native code
└─ Prevents: Crashes from incompatibility
```

If someone on SDK 50 gets update for SDK 51:
- Incompatible native APIs → Crash
- Our check prevents this

**Result:** Safe updates that never crash apps

---

## 📊 Monitoring & Analytics

### View Update History

```bash
# See all updates published
eas update:list

# View specific update
eas update:view --update-id xxxxx

# Output shows:
# - Update ID
# - Channel (preview/production)
# - Publish date
# - Message
# - Status (active/rolled back)
```

### Monitor User Adoption

```
In Expo Dashboard:
1. https://expo.dev/projects/YOUR_PROJECT_ID
2. Updates tab
3. Select channel
4. View:
   - Total users on this channel
   - Active sessions
   - Latest update status
   - Error rate
```

### Track Rollout Performance

```
Metrics to monitor:
- Crash rate before/after update
- Session duration (app stuck?)
- User retention (users leaving?)
- Feature adoption (using new feature?)
```

---

## 🚨 Rollback Procedure

### If Update Has Errors

```bash
# 1. Identify problematic update
eas update:list
# Find the update causing issues

# 2. Delete it (prevent further distribution)
eas update:delete --update-id xxxxx

# 3. Users revert to previous version
# On next app startup: requests previous update
# No user action needed

# 4. Fix the bug
nano src/services/api.ts
# Fix the null pointer exception

# 5. Deploy corrected update
eas update --channel production --message "Rollback fix: Null check for API response"

# 6. Monitor
eas update:list
# Verify new update is published

# 7. Verify metrics
# Check Expo dashboard → crash rate drops
```

**Time to fix:** ~10 minutes (vs 2-4 days via Play Store)

---

## ✅ Deployment Checklist

### Before Building Base APK

```bash
☐ app.json has expo-updates plugin with correct project ID
☐ eas.json has "channel": "preview" in preview profile
☐ eas.json has "channel": "production" in production profile
☐ UpdateCheck.tsx added to src/components/
☐ UpdateCheck imported in app/_layout.tsx
☐ npm run type-check passes (no errors)
☐ npm start works locally
```

### Building Base APK

```bash
☐ All code committed (git status clean)
☐ Ready to build: eas build --platform android --profile preview --wait
☐ Wait for build to complete (~15 min)
☐ Copy download link
☐ Share with testers (via WhatsApp, email, etc.)
☐ Verify: Testers can download and install APK
```

### First OTA Update

```bash
☐ Make small test change (one line of code)
☐ Test locally: npm start
☐ Deploy: eas update --channel preview --message "Test OTA update"
☐ Wait ~5 seconds for publishing
☐ Tester's app shows notification
☐ Tester taps "Reload"
☐ Verify: Change appears in app
```

### Ongoing Updates

```bash
☐ Code change complete
☐ Tested locally
☐ Commit changes (recommended)
☐ Deploy: eas update --channel preview (or production)
☐ Add descriptive message
☐ Monitor: eas update:list
☐ If issues: eas update:delete --update-id xxxxx
```

---

## 🎓 Quick Reference

| Task | Time | Command |
|------|------|---------|
| Deploy update | 1 min | `eas update --channel preview` |
| View history | 10 sec | `eas update:list` |
| Rollback | 10 sec | `eas update:delete --update-id xxxxx` |
| Build APK | 15 min | `eas build --platform android --profile preview --wait` |
| Check status | 10 sec | `eas update:view --update-id xxxxx` |

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `app-with-updates.json` | Template for updated app.json |
| `eas-with-channels.json` | Template for updated eas.json |
| `UpdateCheck.tsx` | OTA update component |
| `OTA_UPDATE_GUIDE.md` | Complete OTA explanation & examples |
| `OTA_QUICK_COMMANDS.md` | Command reference & examples |
| `OTA_COMPLETE_SETUP.md` | This file - implementation guide |

---

## 🎉 Summary

### What You'll Have

✅ **Instant Deployment** - 1 minute to push updates  
✅ **Silent Updates** - Background check, user chooses when to reload  
✅ **Quick Rollback** - Delete broken update, users revert  
✅ **Smart Channel** - Different updates for preview vs production  
✅ **Network Resilient** - 3-second timeout for poor connections  
✅ **Safe Updates** - Runtime version prevents crashes  

### Implementation Timeline

1. **10 minutes** - Update configuration files (app.json, eas.json)
2. **5 minutes** - Add UpdateCheck component
3. **15 minutes** - Build base APK (done once)
4. **1 minute** - Deploy updates (repeat as needed)

### Example: 3-Month Timeline

```
Week 1:
- Day 1-2: Setup OTA (copy configs, add component)
- Day 3: Build base APK, share with 5 testers
- Day 4-5: 3 OTA updates based on feedback

Week 2-4:
- Deploy 2-3 OTA updates per week
- QA testing, user feedback cycles
- No new APK builds needed

Week 5+:
- Production release to Play Store
- 5-minute hotfix deployment for production users
- Regular feature updates via OTA
```

**Result:** Beta testing in days, not months. Production hotfixes in minutes, not days.

---

**Ready to implement OTA updates?** Start with Step 1! 🚀
