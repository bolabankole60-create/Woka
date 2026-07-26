# Expo Updates (OTA) - Complete Deployment Guide

**Over-The-Air Update Pipeline for Tradify**

Push bug fixes and features to users instantly without requiring new APK downloads.

---

## 📱 What is OTA (Over-The-Air) Updates?

### Traditional Approach

```
User finds bug
    ↓
Engineer fixes code
    ↓
Build new APK
    ↓
Upload to Play Store
    ↓
Wait for Play Store review
    ↓
User sees "Update Available"
    ↓
User downloads new APK (~50MB)
    ↓
User reinstalls app
    ↓
Bug fixed!

⏱️ Time: 2-4 days
📦 Data: 50MB download
😤 User friction: High
```

### OTA Update Approach

```
User finds bug
    ↓
Engineer fixes code
    ↓
Deploy update: eas update --channel preview
    ↓
Update pushed to Expo servers
    ↓
User's phone checks for updates (automatic)
    ↓
Update downloaded silently (~5MB JavaScript)
    ↓
User gets notification "Update ready"
    ↓
User taps "Reload" (or auto-reload after 24h)
    ↓
Bug fixed!

⏱️ Time: 5 minutes
📦 Data: 5MB download
😤 User friction: Low
```

### What OTA Updates Can Fix

✅ **JavaScript/Code Changes**
- Bug fixes in business logic
- UI improvements
- API integration updates
- Feature toggles

❌ **Cannot Fix** (requires new APK)
- Native module updates (HMAC verification)
- Permissions changes
- Android SDK updates
- Paystack integration changes

---

## 🎯 Three-Channel Architecture

### Channel: Development

```
Purpose: Your local development
Trigger: eas update --channel development
Updates: Only your dev build receives
Use: Testing changes locally
```

### Channel: Preview

```
Purpose: QA/tester distribution
Trigger: eas update --channel preview
Updates: All testers' phones receive
Use: Bug fixes during QA phase
```

### Channel: Production

```
Purpose: Public Play Store release
Trigger: eas update --channel production
Updates: All production users receive
Use: Hotfixes for released app
```

---

## 📋 Setup Checklist

### Before First OTA Update

```bash
# 1. Update app.json with expo-updates plugin
# See: app-with-updates.json for template
cp app-with-updates.json app.json

# 2. Get your Expo project ID
expo config --type public | jq '.projectId'
# Output: abc123def456...

# 3. Update eas.json with channels
# See: eas-with-channels.json for template
cp eas-with-channels.json eas.json

# 4. Add UpdateCheck component to app
# Copy UpdateCheck.tsx to: src/components/UpdateCheck.tsx

# 5. Import and use in root layout
# In app/_layout.tsx:
# import UpdateCheck from '@/components/UpdateCheck';
# Then add <UpdateCheck /> at top of JSX

# 6. Build new APK with channels
eas build --platform android --profile preview --wait
# This APK will be the "base" for OTA updates
```

---

## 🚀 Deployment Workflow

### Step 1: Build APK with Channels

Your initial APK is built with channel configuration:

```bash
# Build preview APK with channel embedded
eas build --platform android --profile preview --wait

# Output shows download link
# Share this link with testers
# This APK connects to "preview" channel
```

### Step 2: Fix Bug in Code

```bash
# 1. Make code changes
nano src/services/api.ts
# Fix the HMAC verification bug

# 2. Commit changes (recommended)
git add src/services/api.ts
git commit -m "Fix: HMAC signature verification for Paystack webhooks"

# 3. No version bump needed (same app, different code)
# Version only changes for new APK builds
```

### Step 3: Deploy Update to Channel

```bash
# Publish code changes to "preview" channel
eas update --channel preview

# Output:
# ✓ Update published
# Update ID: xxxxx
# Message: Pushed to preview channel
# Build: 1.0.0 (1)
```

### Step 4: Users Receive Update

```
Automatic on app startup:
1. App checks: "Any updates for preview channel?"
2. Server: "Yes, new update available"
3. App downloads: New JavaScript bundle (~5MB)
4. App shows: "New version available! Tap to reload"
5. User: Taps "Reload"
6. App: Reloads with new code
7. Bug: Fixed instantly
```

### Step 5: Monitor Deployment

```bash
# View all updates published
eas update:list

# View details of specific update
eas update:view --update-id xxxxx

# Monitor rollout progress
# (In browser) https://expo.dev
```

---

## 💻 Terminal Commands

### Prerequisites

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Verify authentication
eas whoami
```

### Get Expo Project ID

```bash
# Method 1: From config
expo config --type public | jq '.projectId'

# Method 2: From Expo dashboard
https://expo.dev
→ Your projects
→ Select Tradify
→ Copy project ID from URL

# Method 3: From app.json
cat app.json | jq '.extra.eas.projectId'
```

---

## 📤 Publishing Updates to Channels

### Publish to Preview Channel

```bash
# Deploy latest code to preview channel
# All testers' phones will receive this
eas update --channel preview

# Optional: Add description
eas update --channel preview --message "Fixed HMAC signature bug"

# Output:
# ✓ Update published
# Message ID: xxxxx
# Channel: preview
# Live in: 1-2 seconds
```

### Publish to Production Channel

```bash
# Deploy to all production users
# After thorough testing
eas update --channel production

# With message
eas update --channel production --message "Security hotfix: Payment verification"

# Output:
# ✓ Update published
# Message ID: xxxxx
# Channel: production
# Users reached: ~100,000
```

### View Update History

```bash
# List recent updates
eas update:list

# Show details of one update
eas update:view --update-id xxxxx

# Output includes:
# - Update ID
# - Channel
# - Publish date
# - Message
# - Platform
# - Build version
```

---

## 🔍 Monitoring Updates

### Check Rollout Status

```bash
# View all updates across channels
eas update:list

# Filter by channel
eas update:list --branch preview
eas update:list --branch production

# View specific update
eas update:view --update-id abc123def456
```

### Monitor User Adoption

```
In Expo Dashboard:
1. https://expo.dev/projects/YOUR_PROJECT_ID
2. Updates tab → Select channel
3. View:
   - Total builds on this channel
   - Latest update published
   - Approximate users
   - Active sessions
```

### Check for Errors

```bash
# View app crashes
# Go to: https://expo.dev/projects/YOUR_PROJECT_ID
# → Insights → Errors

# Look for:
- JavaScript syntax errors
- Runtime crashes
- Update fetch failures
- Compatibility issues
```

---

## 🎯 Real-World Examples

### Example 1: Critical Bug Fix (5 minutes)

**Scenario:** Payment verification bug found in production

```bash
# 1. Engineer fixes bug
nano src/middleware/paystackAuth.ts
# Fix the constant-time comparison logic

# 2. Commit (optional but recommended)
git add src/middleware/paystackAuth.ts
git commit -m "Fix: Constant-time comparison timing attack"

# 3. Test locally
npm start

# 4. Deploy to production
eas update --channel production \
  --message "Security fix: Webhook signature verification"

# 5. Monitor results
eas update:list
# Users receive within 1-2 seconds
# App reloads silently

# 6. Confirm
# Check Expo dashboard for "Active updates"
# Look for crash rate drop
```

**Result:**
- ✅ Fix deployed in 5 minutes
- ✅ All users automatically updated
- ✅ No APK re-download needed
- ✅ Zero user complaints

---

### Example 2: Staging Update for QA

**Scenario:** New feature ready for QA testing

```bash
# 1. Develop new invoice feature
nano src/screens/InvoiceShareScreen.tsx
# Add WhatsApp bulk recipient feature

# 2. Test with dev build
npm start
# Test on emulator

# 3. Deploy to preview channel for QA
eas update --channel preview \
  --message "New: Bulk invoice sharing via WhatsApp"

# 4. QA team's phones automatically receive
# (On next app startup)

# 5. QA tests on real devices
# Finds edge case with special characters

# 6. Engineer fixes edge case
nano src/screens/InvoiceShareScreen.tsx
# Fix URL encoding for special chars

# 7. Deploy update to preview again
eas update --channel preview \
  --message "Fixed: Special character handling in invoice names"

# 8. QA retests
# Approves feature
# Feature complete!
```

**Result:**
- ✅ QA iterates 3x in one day
- ✅ No APK re-downloads
- ✅ Feature ready for production
- ✅ Zero deployment delay

---

### Example 3: Performance Optimization

**Scenario:** App startup slow in Nigeria (3G network)

```bash
# 1. Identify bottleneck
# API request takes 5 seconds on app start

# 2. Optimize code
nano src/services/api.ts
# Add request caching
# Reduce payload size

# 3. Deploy to preview
eas update --channel preview \
  --message "Performance: Reduced startup time from 5s to 2s"

# 4. QA measures
# Tester on 3G: "Loads instantly now!"

# 5. Promote to production
eas update --channel production \
  --message "Performance: Improved app startup speed"

# 6. Monitor metrics
# Check Expo dashboard
# See reduced crash rate (users no longer force-close)
```

---

## ⚙️ Configuration Reference

### app.json - Expo Updates Plugin

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

**Settings Explained:**

| Setting | Value | Meaning |
|---------|-------|---------|
| `url` | `https://u.expo.dev/YOUR_PROJECT_ID` | Where to check for updates |
| `runtimeVersion` | `"sdkVersion"` | Compatibility: same SDK only |
| `checkAutomatically` | `"ON_APP_START"` | Check when app starts |
| `fallbackToCacheTimeout` | `3000` | Wait 3s for update, use cache if timeout |

### eas.json - Channel Configuration

```json
{
  "build": {
    "preview": {
      "channel": "preview",
      "env": { "EXPO_PUBLIC_API_URL": "https://staging-api.tradify.ng" }
    },
    "production": {
      "channel": "production",
      "env": { "EXPO_PUBLIC_API_URL": "https://api.tradify.ng" }
    }
  }
}
```

---

## 🐛 Troubleshooting

### Issue: "Update not received by users"

**Diagnosis:**

```bash
# 1. Verify update published
eas update:list
# Should show your recent update

# 2. Check update ID
eas update:view --update-id xxxxx
# Should show your message

# 3. Verify channel matches
# Check app.json: "channel" field
# Check build output: "channel: preview"
```

**Solution:**

```bash
# Make sure build was with correct channel
# Check: eas build --platform android --profile preview
# Output should show: "channel: preview"

# If channel is wrong, rebuild
eas build --platform android --profile preview --wait
```

### Issue: "Users still seeing old version"

**Reasons & Fixes:**

```bash
# Reason 1: User has app backgrounded
# Solution: Wait for next app startup

# Reason 2: Update check failed (network timeout)
# Solution: Check user's network, will retry on next startup

# Reason 3: User disabled automatic updates
# Solution: Provide manual reload button (like UpdateCheck.tsx)

# Reason 4: Rollback (update had errors)
eas update:delete --update-id xxxxx
# Prevents further distribution

# Reason 5: Runtime incompatibility
# Solution: Release new APK with updated SDK
```

### Issue: "Update causes app crash"

**Prevention:**

```bash
# 1. Test locally first
npm start
# Manually test all features

# 2. Test on staging
eas update --channel preview --dry-run

# 3. Rollback if needed
eas update:delete --update-id xxxxx
# Users revert to previous version
```

**Recovery:**

```bash
# 1. Fix the bug
nano src/services/api.ts
# Fix the null pointer exception

# 2. Deploy hotfix
eas update --channel production \
  --message "Rollback fix: Null check for Paystack response"

# 3. Monitor crashes drop
# Check Expo dashboard → Insights → Errors
```

---

## 📊 Understanding Runtime Version

### What is Runtime Version?

```
Runtime = Native code running on device
Version = Compatibility marker

Example:
  Expo SDK 51
    Native modules
    JavaScript engine
    Android libraries

Your app depends on:
  HMAC verification (native)
  Paystack SDK (native)
  SQLite (native)

If these change → Need new APK
If only JavaScript changes → OTA update works
```

### Setting: "sdkVersion" (Recommended)

```json
{
  "runtimeVersion": "sdkVersion"
}
```

**Effect:**
- Only updates compatible with current SDK work
- If you upgrade Expo SDK, must build new APK
- Updates can't add new native dependencies
- Prevents crashes from incompatible updates

**Best For:**
- Stable production app
- Mostly JavaScript changes
- No frequent native updates

---

## ✅ Pre-Update Checklist

### Before Pushing to Preview

```bash
□ Code changes tested locally (npm start)
□ No TypeScript errors (npm run type-check)
□ No console errors (check dev server logs)
□ No breaking changes (API compatible)
□ Commit message clear (git log)
□ eas.json has channel: "preview"
```

### Before Pushing to Production

```bash
□ Preview update tested by QA
□ No critical bugs found
□ Performance acceptable
□ All features working
□ No data migration needed
□ Rollback plan ready (if needed)
□ eas.json has channel: "production"
```

---

## 📚 Command Reference

| Task | Command |
|------|---------|
| Deploy to preview | `eas update --channel preview` |
| Deploy to production | `eas update --channel production` |
| View all updates | `eas update:list` |
| View specific update | `eas update:view --update-id xxxxx` |
| Delete update (rollback) | `eas update:delete --update-id xxxxx` |
| Check authentication | `eas whoami` |
| List projects | `eas project:info` |
| Test build locally | `npm start` |

---

## 🎉 You're Ready for OTA Updates!

### Summary

✅ **Configuration:**
- `app.json` has expo-updates plugin
- `eas.json` has channel mapping
- `UpdateCheck.tsx` installed in app

✅ **Build APK:**
- `eas build --platform android --profile preview --wait`
- Testers download and install once

✅ **Deploy Updates:**
- `eas update --channel preview` (push updates)
- Testers receive automatically
- No APK re-download

✅ **Release to Production:**
- `eas update --channel production` (after testing)
- All users get update
- Instant deployment

### Typical Timeline

1. **Day 1:** Build base APK, share with 5 testers
2. **Day 2-3:** Deploy 3-4 updates based on feedback
3. **Day 4:** Promote to production
4. **Day 5:** Monitor crash rate (should drop)

### Benefits

🚀 **5-minute deployment** (vs 2-4 days for Play Store)  
📦 **5MB update** (vs 50MB APK re-download)  
😊 **Better UX** (no manual re-downloads)  
🔄 **Easy rollback** (delete update, revert automatically)  
🇳🇬 **Nigeria-friendly** (3G timeout handling)  

---

**Happy updating!** 🚀
