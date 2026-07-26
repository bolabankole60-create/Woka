# EAS Complete Master Guide

**Production-Ready Expo Application Services Configuration for Tradify**

A comprehensive guide to building Android APKs for testers and AAB bundles for Google Play Store.

---

## 📖 What's Included in This Guide

This master guide covers **everything you need** to:

✅ Configure `eas.json` with three build profiles  
✅ Inject environment variables per build  
✅ Build preview APK for testers (standalone, no Expo account needed)  
✅ Build production AAB for Google Play Store  
✅ Submit builds to Play Store automatically  
✅ Troubleshoot common issues  

---

## 🎯 Quick Navigation

| Need | Go To |
|------|-------|
| Just copy-paste commands? | [EAS_QUICK_REFERENCE.md](EAS_QUICK_REFERENCE.md) |
| Step-by-step terminal guide? | [EAS_TERMINAL_COMMANDS.md](EAS_TERMINAL_COMMANDS.md) |
| Understanding env variables? | [EAS_ENVIRONMENT_VARIABLES.md](EAS_ENVIRONMENT_VARIABLES.md) |
| Detailed annotated eas.json? | [eas-annotated.json](eas-annotated.json) |
| Ready to use eas.json? | [eas-production.json](eas-production.json) |
| Full deployment guide? | [EAS_DEPLOYMENT_GUIDE.md](EAS_DEPLOYMENT_GUIDE.md) |
| Setup overview? | [EAS_COMPLETE_SETUP.md](EAS_COMPLETE_SETUP.md) |

---

## 🚀 Five-Minute Quick Start

### 1. Copy eas.json to Your Project

```bash
# Copy production-ready configuration
cp eas-production.json your-project/eas.json
```

### 2. Install & Login

```bash
npm install -g eas-cli
eas login
eas init
```

### 3. Create Keystore (One-time)

```bash
keytool -genkey -v -keystore android/keystore.jks \
  -alias tradify-prod \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass YourPassword123 \
  -keypass YourPassword456
```

### 4. Build Preview APK

```bash
eas build --platform android --profile preview --wait
# Share download link with testers
```

### 5. Build for Play Store

```bash
eas build --platform android --profile production --wait
eas submit --platform android --profile production
# Publish in Google Play Console
```

**Done!** 🎉

---

## 📊 Understanding the Three Profiles

### Profile Comparison

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  DEVELOPMENT              PREVIEW                PRODUCTION   │
│  ─────────────            ────────                ──────────  │
│  Local testing            QA sharing              Play Store   │
│  ✓ Hot reload             ✓ Standalone            ✓ AAB bundle │
│  ✓ Dev Client             ✓ No account needed     ✓ Optimized  │
│                                                                 │
│  API: localhost:3000      API: staging-api        API: api.ng   │
│  Build: APK               Build: APK              Build: AAB    │
│  Share: Dev machine       Share: Download link    Share: Store  │
│                                                                 │
└─────────────────────────────────────────────────────────────┘
```

### When to Use Each Profile

**Development Profile**
```bash
eas build --platform android --profile development
```
- ✅ Testing with Expo Dev Client
- ✅ Hot reload for rapid iteration
- ✅ Connects to your local backend (localhost:3000)
- ✅ Your development machine only

**Preview Profile**
```bash
eas build --platform android --profile preview
```
- ✅ Share APK with testers
- ✅ No Expo account needed for testers
- ✅ Connects to staging backend
- ✅ Download link provided (share via WhatsApp/email)
- ✅ Perfect for market testing in Nigeria

**Production Profile**
```bash
eas build --platform android --profile production
```
- ✅ Google Play Store release
- ✅ AAB bundle (not APK)
- ✅ Connects to production backend
- ✅ Auto-increments version for each build
- ✅ Ready for millions of users

---

## 🔧 Environment Variable Injection

### How It Works

```
Your Code
    ↓
process.env.EXPO_PUBLIC_API_URL
    ↓
eas.json (selected profile)
    ↓
Cloud Build injects value
    ↓
Compiled APK/AAB
    ↓
App uses correct API URL
```

### Three API URLs

```json
{
  "development": {
    "env": {
      "EXPO_PUBLIC_API_URL": "http://192.168.1.100:3000"
    }
  },
  "preview": {
    "env": {
      "EXPO_PUBLIC_API_URL": "https://staging-api.tradify.ng"
    }
  },
  "production": {
    "env": {
      "EXPO_PUBLIC_API_URL": "https://api.tradify.ng"
    }
  }
}
```

### Using in Your App

```typescript
// In API client
const apiUrl = process.env.EXPO_PUBLIC_API_URL;

export const apiClient = new APIClient({
  baseURL: apiUrl,
  timeout: 10000,
});

// Development: http://192.168.1.100:3000
// Preview: https://staging-api.tradify.ng
// Production: https://api.tradify.ng
```

---

## 📝 Configuration Files

### 1. eas-production.json (Ready to Use)

```json
{
  "cli": { "version": ">= 5.0.0", ... },
  "build": {
    "development": { ... },
    "preview": { ... },
    "production": { ... }
  },
  "submit": { ... }
}
```

**Action:** Copy to your project root as `eas.json`

### 2. eas-annotated.json (Learn Configuration)

Same as `eas-production.json` but with detailed comments explaining every option.

**Action:** Read to understand each configuration option

### 3. app.json (Expo Configuration)

```json
{
  "expo": {
    "name": "Tradify",
    "slug": "tradify",
    "version": "1.0.0",
    "android": {
      "versionCode": 1,
      "package": "com.tradify.app"
    }
  }
}
```

**Action:** Ensure `version` and `versionCode` are correct before building

---

## 🔐 Android Keystore

### What Is It?

A keystore is a file containing your private key used to sign APKs and AABs. It proves ownership of your app.

**Critical:** 
- ✅ Keep safe (never commit to git)
- ✅ Keep password secure
- ✅ Never lose it (can't update app without it)
- ✅ One keystore per app

### Create Keystore

```bash
keytool -genkey -v -keystore android/keystore.jks \
  -alias tradify-prod \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass MyPassword123 \
  -keypass MyPassword456
```

**Remember:**
- `storepass`: Password for keystore file
- `keypass`: Password for key within keystore
- `validity`: 10000 days = ~27 years

### Secure Keystore

```bash
# Add to .gitignore
echo "android/keystore.jks" >> .gitignore
echo "service-account-key.json" >> .gitignore

# Verify it's ignored
git status
# Should NOT show keystore.jks
```

### Use in eas.json

```json
{
  "keystore": {
    "keystorePath": "android/keystore.jks",
    "keystorePassword": "MyPassword123",
    "keyAlias": "tradify-prod",
    "keyPassword": "MyPassword456"
  }
}
```

---

## 🏗️ Complete Build Workflow

### Step 1: Setup (One-time)

```bash
# Install EAS globally
npm install -g eas-cli

# Login to Expo
eas login

# Initialize project
eas init

# Create keystore
keytool -genkey -v -keystore android/keystore.jks \
  -alias tradify-prod -keyalg RSA -keysize 2048 -validity 10000

# Verify setup
eas whoami
eas credentials
```

### Step 2: Development

```bash
# Start backend
cd tradify-backend
npm run dev
# Running on http://localhost:3000

# In another terminal, build development APK
cd tradify
eas build --platform android --profile development --wait

# Install on device/emulator
adb install -r ~/Downloads/tradify-dev.apk
```

### Step 3: Testing with QA

```bash
# Build preview APK
eas build --platform android --profile preview --wait

# Get download link from output:
# https://eas-builds.s3.us-west-2.amazonaws.com/...apk

# Share with testers:
# - Email link
# - WhatsApp link
# - Slack message

# Testers download and install directly (no Expo account needed)
```

### Step 4: Release to Play Store

```bash
# Update version in app.json
# "version": "1.0.0" → "1.0.1"

# Commit and tag
git add app.json
git commit -m "Release v1.0.1"
git tag v1.0.1

# Build production AAB
eas build --platform android --profile production --wait

# Submit to Play Store
eas submit --platform android --profile production

# Publish in Google Play Console
# → Settings → Version control → Select build
# → Create release → Set rollout (5% → 100%) → Publish
```

---

## 📤 Google Play Store Setup

### 1. Create Google Play Developer Account

```
https://play.google.com/console
→ Create account ($25 one-time fee)
→ Verify identity
→ Complete merchant profile
```

### 2. Create App Listing

```
Google Play Console
→ Create app
→ App name: Tradify
→ Content rating: Everyone
→ Category: Productivity
→ Contact email: your-email@tradify.ng
```

### 3. Get API Access

```
Google Play Console
→ Settings → API access
→ Create service account
→ Download JSON key
→ Save as service-account-key.json (project root)
→ Add to .gitignore
```

### 4. Submit Builds

```bash
# First submission
eas submit --platform android --profile production

# Interactive prompts:
# ? Service account key path: ./service-account-key.json
# ? Release track: internal (for testing)
# ? Confirm submission: yes

# Later, after QA approval:
# ? Release track: production
# ? Confirm submission: yes
```

---

## 🐛 Troubleshooting

### Build Fails: "Keystore not found"

```bash
# Solution: Create keystore
keytool -genkey -v -keystore android/keystore.jks \
  -alias tradify-prod -keyalg RSA -keysize 2048 -validity 10000

# Verify
ls -la android/keystore.jks
# Should show file size > 2KB
```

### Build Fails: "Invalid keystore password"

```bash
# Solution: Reset credentials
eas credentials --platform android --reset

# Next build will prompt for password
eas build --platform android --profile production
```

### APK Won't Install

```
Android Device:
Settings → Apps → Special app access → Install unknown apps
→ Enable for your file manager
→ Tap APK to install
```

### App Connects to Wrong API

```bash
# Solution: Verify eas.json environment variables

# Check what's in eas.json
cat eas.json | grep EXPO_PUBLIC_API_URL

# Check what app is using
grep -r "EXPO_PUBLIC_API_URL" src/

# Verify API client initialization
grep -r "baseURL" src/services/api.ts

# If wrong, update eas.json and rebuild
eas build --platform android --profile production --clear-cache --wait
```

### Slow Build Times

```bash
# Solution 1: Clear build cache
eas build --platform android --profile production --clear-cache --wait

# Solution 2: Check node version (should be 18.13.0)
node --version
npm --version

# Solution 3: Update EAS CLI
npm install -g eas-cli@latest
```

---

## ✅ Pre-Build Checklist

### Before Preview Build

```
☐ Backend running on localhost:3000
☐ eas.json preview section has staging URL
☐ app.json has correct version
☐ Android keystore exists (android/keystore.jks)
☐ No hardcoded URLs in code
☐ Tests passing locally
☐ git status clean (no untracked changes)
```

### Before Production Build

```
☐ Preview APK tested by QA team
☐ Version incremented in app.json
☐ eas.json production has correct API URL
☐ All features working in preview
☐ Release notes prepared
☐ Service account JSON ready
☐ git tag created (git tag v1.0.0)
☐ All tests passing
```

### After Production Build

```
☐ AAB downloaded successfully
☐ Uploaded to Google Play Console
☐ App listing complete (description, screenshots, etc.)
☐ Release notes filled in
☐ Rollout strategy set (5% → 25% → 100%)
☐ QA final approval
☐ Ready to publish
```

---

## 📊 Build Times & Sizes

### Typical Build Times

| Profile | Build Time | Notes |
|---------|-----------|-------|
| Development | 5-10 min | First build slower |
| Preview | 10-15 min | Cached subsequent builds |
| Production | 15-20 min | Optimization takes time |

### Typical Sizes

| Build Type | Size | Notes |
|-----------|------|-------|
| Development APK | 60-80 MB | Includes dev tools |
| Preview APK | 50-60 MB | Standalone, optimized |
| Production AAB | 35-45 MB | Smaller than APK |

---

## 🎓 Understanding APK vs AAB

### APK (Android Package)

```
Format: Installable directly on Android devices
Size: Larger (includes all resources)
Use: Development, testing, side-loading
Share: Via download link, ADB
Requires: File download
```

**When to use:**
- ✅ Testing on emulator/device
- ✅ Sharing with testers
- ✅ Development builds

**When NOT to use:**
- ❌ Never use for Play Store (Play Store requires AAB)

### AAB (Android App Bundle)

```
Format: Optimized for Play Store
Size: Smaller (split by device configuration)
Use: Play Store only
Share: Via Play Store only
Requires: Google Play Console account
```

**When to use:**
- ✅ Releasing to Play Store
- ✅ Only distribution method for Play Store

**Advantages:**
- Smaller download (device-specific)
- Better compression
- Automatic feature delivery
- Faster app startup

---

## 🚀 Automation (CI/CD)

### GitHub Actions Example

```yaml
name: Build & Release

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm install
      
      - name: Build with EAS
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
        run: |
          npm install -g eas-cli
          eas build --platform android --profile production --wait
      
      - name: Submit to Play Store
        env:
          GOOGLE_PLAY_KEY: ${{ secrets.GOOGLE_PLAY_KEY }}
        run: |
          eas submit --platform android --profile production
```

---

## 📚 Additional Resources

| Resource | Link |
|----------|------|
| Expo Docs | https://docs.expo.dev |
| EAS Build Docs | https://docs.expo.dev/eas/build/ |
| Google Play Console | https://play.google.com/console |
| Android Developer Docs | https://developer.android.com |
| Paystack Integration | https://paystack.com/docs |

---

## 💡 Pro Tips

1. **Always tag releases** → `git tag v1.0.0` before building
2. **Test preview first** → Never skip QA testing phase
3. **Start rollout small** → Begin with 5% rollout, monitor for crashes
4. **Keep backups** → Copy keystore and service account JSON to secure location
5. **Version matters** → Always increment before Play Store release
6. **Monitor crashes** → Use Google Play Console → Vitals → Crashes
7. **User feedback** → Read reviews for bug reports and feature requests

---

## ✨ What You Now Have

✅ **eas.json** - Production-ready configuration with 3 profiles  
✅ **eas-annotated.json** - Same file with detailed comments  
✅ **eas-production.json** - Copy this to your project  
✅ **EAS_ENVIRONMENT_VARIABLES.md** - Deep dive into env vars  
✅ **EAS_TERMINAL_COMMANDS.md** - Copy-paste terminal commands  
✅ **EAS_QUICK_REFERENCE.md** - One-page cheat sheet  
✅ **EAS_DEPLOYMENT_GUIDE.md** - Comprehensive deployment guide  
✅ **EAS_COMPLETE_SETUP.md** - Setup overview  
✅ **This guide** - Master reference connecting everything  

---

## 🎉 You're Ready!

Your Tradify app is now:
- ✅ Configured for local development
- ✅ Ready to share preview APK with testers
- ✅ Prepared for Google Play Store release
- ✅ Set up for automated builds (if using CI/CD)
- ✅ Documented for team reference

**Next Step:** Copy `eas-production.json` to your project root as `eas.json` and start building!

```bash
cp eas-production.json your-project/eas.json
cd your-project
eas build --platform android --profile preview --wait
```

---

**Happy building! 🚀**

For quick commands: [EAS_QUICK_REFERENCE.md](EAS_QUICK_REFERENCE.md)  
For detailed steps: [EAS_TERMINAL_COMMANDS.md](EAS_TERMINAL_COMMANDS.md)  
For understanding env vars: [EAS_ENVIRONMENT_VARIABLES.md](EAS_ENVIRONMENT_VARIABLES.md)
