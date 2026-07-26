# EAS Build & Deployment Guide for Tradify

Complete guide for building and deploying your Expo app using EAS (Expo Application Services).

---

## 🎯 Overview

This guide covers:
- ✅ **eas.json** configuration with 3 build profiles
- ✅ **Environment variables** for different environments
- ✅ **Step-by-step deployment** commands
- ✅ **APK generation** for testers
- ✅ **AAB generation** for Google Play Store
- ✅ **Credential management**

---

## 📋 Build Profiles Explained

### 1. **Development Profile**
```json
{
  "development": {
    "developmentClient": true,
    "distribution": "internal",
    "env": {
      "EXPO_PUBLIC_API_URL": "http://192.168.1.100:3000"
    },
    "android": {
      "buildType": "apk"
    }
  }
}
```

**Purpose:**
- For active development with Expo dev client
- Hot reload support
- Fast rebuild cycle
- Targets local backend (192.168.1.100:3000)

**When to use:**
```bash
eas build --platform android --profile development
```

---

### 2. **Preview Profile**
```json
{
  "preview": {
    "developmentClient": false,
    "distribution": "internal",
    "env": {
      "EXPO_PUBLIC_API_URL": "https://staging-api.tradify.ng"
    },
    "android": {
      "buildType": "apk"
    }
  }
}
```

**Purpose:**
- APK for testers (no Expo account needed)
- Targets staging backend
- Can be downloaded and installed directly
- Smaller than AAB (but not for Play Store)

**When to use:**
```bash
eas build --platform android --profile preview
```

---

### 3. **Production Profile**
```json
{
  "production": {
    "developmentClient": false,
    "distribution": "store",
    "env": {
      "EXPO_PUBLIC_API_URL": "https://api.tradify.ng"
    },
    "android": {
      "buildType": "aab"
    },
    "autoIncrement": true
  }
}
```

**Purpose:**
- AAB bundle for Google Play Store
- Optimized & minified
- Targets production backend
- Auto-increments version code

**When to use:**
```bash
eas build --platform android --profile production
```

---

## 🔧 Environment Variables

### EXPO_PUBLIC_API_URL

This variable is injected into your compiled app. Access it:

```typescript
// In your Expo app
const API_URL = process.env.EXPO_PUBLIC_API_URL;

// In your API client
import { apiClient } from '@/services/api';

const baseURL = process.env.EXPO_PUBLIC_API_URL;
// development: http://192.168.1.100:3000
// preview: https://staging-api.tradify.ng
// production: https://api.tradify.ng
```

### In app.json (for reference)

```json
{
  "expo": {
    "plugins": [
      ["expo-build-properties", {
        "android": {
          "usesCleartextTraffic": true
        }
      }]
    ]
  }
}
```

**Note:** `usesCleartextTraffic: true` allows HTTP in development. Remove for production (requires HTTPS).

### In .env (for local development)

```bash
# .env.local (for npm start)
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000

# This is separate from eas.json env variables
# eas.json env variables are set during cloud build
```

---

## 🔐 Credential Management

### 1. Android Keystore Setup

**Create a keystore for signing:**

```bash
# Generate keystore (one-time)
keytool -genkey -v -keystore android/keystore.jks \
  -alias tradify-prod \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass your_keystore_password \
  -keypass your_key_password

# When prompted:
# First and last name: Chidike Okafor
# Organizational unit: Tradify
# Organization: Tradify Inc
# City: Lagos
# State: Lagos
# Country: NG
```

**Store passwords securely:**

```bash
# Option 1: Environment variables (secure)
export KEYSTORE_PASSWORD=your_keystore_password
export KEY_PASSWORD=your_key_password

# Option 2: GitHub Secrets (for CI/CD)
# Settings → Secrets and variables → Actions
# Add KEYSTORE_PASSWORD and KEY_PASSWORD
```

**Upload keystore to EAS:**

```bash
# EAS will ask for passwords on first build
eas build --platform android --profile production

# First time:
# → Where is your keystore? android/keystore.jks
# → Keystore password? [enters password]
# → Key alias? tradify-prod
# → Key password? [enters password]

# EAS stores these credentials securely
# Future builds use stored credentials
```

### 2. View Stored Credentials

```bash
# List all credentials for your project
eas credentials

# For Android:
# Keystore
#   Key alias: tradify-prod
#   Keystore path: android/keystore.jks
#   Status: Stored securely
```

---

## 📱 Step-by-Step Deployment Commands

### Phase 1: Initial Setup

#### Step 1: Install EAS CLI

```bash
# Install globally
npm install -g eas-cli

# Verify installation
eas --version
# Expected output: eas-cli/X.X.X
```

#### Step 2: Initialize Project (One-time)

```bash
# From project root
eas init

# When prompted:
# → What is your Expo project ID? [auto-detected or enter manually]
# → Which platform? android
# → Create new app? Yes

# This creates eas.json and links to your Expo project
```

#### Step 3: Login to Expo Account

```bash
# Login to Expo
eas login

# When prompted:
# → Username: your_expo_username
# → Password: your_expo_password

# Verify login
eas whoami
# Expected output: your_expo_username
```

---

### Phase 2: Android Preview Build (APK for Testers)

#### Step 4a: Build Preview APK

```bash
# Build for Android (staging environment)
eas build --platform android --profile preview

# Expected output:
# Build queued
# Waiting for build to start...
# [Build logs...]
# Build finished
# Download link: https://eas-builds.s3.us-west-2.amazonaws.com/...

# Save this link! Send it to testers
```

#### Step 4b: Monitor Build Progress

```bash
# View build status in terminal
eas build --platform android --profile preview --wait

# Or view in browser
# https://expo.dev/builds

# Click on build to see:
# - Status (queued, running, completed)
# - Logs (real-time output)
# - Download link (when complete)
```

#### Step 4c: Share with Testers

```bash
# Download link format:
# https://eas-builds.s3.us-west-2.amazonaws.com/.../...apk

# Testers can:
# 1. Click link on Android device
# 2. File downloaded to Downloads
# 3. Tap file to install
# 4. App appears on home screen

# No Expo account needed! ✅
```

---

### Phase 3: Production Build (AAB for Play Store)

#### Step 5a: Build Production AAB

```bash
# Build for Play Store (production environment)
eas build --platform android --profile production

# Expected output:
# Build queued with version: 1.0.0 (1)
# (auto-incremented for each build)
# Download link: https://eas-builds.s3.us-west-2.amazonaws.com/...

# Save the AAB link
```

#### Step 5b: Verify Build Details

```bash
# View build metadata
eas build:view

# Select the build to see:
# - Version: 1.0.0
# - Build number: 1
# - Platform: Android
# - Build type: aab
# - Status: finished
```

---

### Phase 4: Upload to Google Play Store

#### Step 6a: Create Service Account (First-time)

```bash
# In Google Play Console (https://play.google.com/console):
# 1. Go to Settings → API access
# 2. Create service account
# 3. Grant roles: "Edit and delete Google Play apps"
# 4. Download JSON key
# 5. Save as: service-account-key.json (root of project)
```

#### Step 6b: Submit to Play Store

```bash
# Method 1: Automatic submission
eas submit --platform android --profile production

# When prompted:
# → Service account key path? ./service-account-key.json
# → Track? internal (for testing) or production (live)
# → Submit? Yes

# Expected output:
# Submission ID: 123456789
# Status: Submitted to Google Play
```

#### Step 6c: Manual Upload (Alternative)

```bash
# If automatic fails, upload manually:
# 1. Download AAB from EAS link
# 2. Go to Google Play Console
# 3. Your app → Release → Production
# 4. Upload AAB file
# 5. Fill in release notes
# 6. Review & submit
```

---

## 🔄 Complete Deployment Workflow

### For Development (Local Testing)

```bash
# Terminal 1: Start backend
cd tradify-backend
npm run dev
# Server running on http://localhost:3000

# Terminal 2: Start Expo dev client
cd tradify
npm start

# Terminal 3: Build and test
eas build --platform android --profile development --wait
# Install on emulator/device using expo-dev-client
```

### For Staging (QA Testing)

```bash
# Build APK for testers
eas build --platform android --profile preview

# Wait for completion
eas build:view
# Copy download link

# Share with QA team
# Testers download and install APK
# Test against staging backend (https://staging-api.tradify.ng)
```

### For Production (Play Store Release)

```bash
# 1. Update version in app.json
#    "version": "1.0.0"

# 2. Commit changes
git add app.json eas.json
git commit -m "Release version 1.0.0"
git tag v1.0.0

# 3. Build production AAB
eas build --platform android --profile production --wait

# 4. Submit to Play Store
eas submit --platform android --profile production

# 5. Verify submission in Play Console
# Settings → Version control → See recent builds

# 6. Review & publish
# Create release notes
# Set rollout percentage (start with 5%, ramp up to 100%)
# Publish when ready
```

---

## ⚙️ Configuration Reference

### eas.json Structure

```json
{
  "cli": {
    "version": ">= 5.0.0",        // EAS CLI version
    "requireCommit": false,        // Require git commit
    "appVersionSource": "local"    // Get version from app.json
  },
  "build": {
    "PROFILE_NAME": {
      "developmentClient": bool,   // Use Expo dev client?
      "distribution": "internal"   // internal or store
        |"store",
      "channel": "channel-name",   // EAS Update channel
      "env": {
        "VAR_NAME": "value"        // Env vars injected into app
      },
      "android": {
        "buildType": "apk",        // apk or aab
        "keystoreType": "jks",     // Keystore format
        "keystore": {              // Signing config
          "keystorePath": "",
          "keystorePassword": "",
          "keyAlias": "",
          "keyPassword": ""
        }
      }
    }
  },
  "submit": {
    "PROFILE_NAME": {
      "android": {
        "serviceAccountKeyPath": "",  // For Play Store upload
        "track": "internal"           // internal, alpha, beta, production
      }
    }
  }
}
```

---

## 🐛 Troubleshooting

### Build Fails: "Keystore not found"

```bash
# Solution 1: Create keystore
keytool -genkey -v -keystore android/keystore.jks \
  -alias tradify-prod -keyalg RSA -keysize 2048 -validity 10000

# Solution 2: Check path in eas.json
# Ensure keystorePath is correct relative to project root

# Solution 3: Upload to EAS
eas build --platform android --profile production
# Enter keystore password when prompted
```

### Build Fails: "Env variable not set"

```bash
# Solution: Check eas.json env section
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.tradify.ng"
        // ↑ Must start with EXPO_PUBLIC_
      }
    }
  }
}

# Verify in app:
console.log(process.env.EXPO_PUBLIC_API_URL);
// Should print: https://api.tradify.ng
```

### APK Won't Install: "Unknown source"

```bash
# On Android device:
# Settings → Apps → Special app access → Install unknown apps
# Enable for your file manager/browser
# Then tap APK to install
```

### Version Not Incrementing

```bash
# Solution: Enable autoIncrement in production profile
{
  "production": {
    "autoIncrement": true
  }
}

# Each build will auto-increment buildNumber
# Version: 1.0.0 (1) → 1.0.0 (2) → 1.0.0 (3)
```

---

## ✅ Deployment Checklist

### Before Preview Build
- [ ] Backend server is running and accessible
- [ ] EXPO_PUBLIC_API_URL points to staging backend
- [ ] eas.json profile preview is configured
- [ ] Android keystore exists and credentials are stored
- [ ] app.json version is correct

### Before Production Build
- [ ] Staging APK has been tested
- [ ] EXPO_PUBLIC_API_URL points to production backend
- [ ] Version number is incremented in app.json
- [ ] Release notes are prepared
- [ ] Git tag created
- [ ] Service account JSON file available

### After Production Build
- [ ] AAB file is downloaded
- [ ] Uploaded to Google Play Console
- [ ] Release notes are filled in
- [ ] Rollout strategy set
- [ ] QA approval received
- [ ] Ready to publish

---

## 🚀 Quick Commands Reference

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Initialize project (one-time)
eas init

# Build preview APK
eas build --platform android --profile preview --wait

# Build production AAB
eas build --platform android --profile production --wait

# View builds
eas build:view

# Submit to Play Store
eas submit --platform android --profile production

# Check credentials
eas credentials

# View current user
eas whoami

# Update EAS CLI
npm install -g eas-cli@latest
```

---

## 📚 Additional Resources

- **EAS Documentation**: https://docs.expo.dev/eas-update/getting-started/
- **EAS Build**: https://docs.expo.dev/eas-update/build/
- **Google Play Console**: https://play.google.com/console
- **Expo CLI Reference**: https://docs.expo.dev/more/expo-cli/

---

**Your eas.json is ready for production deployments!** 🎉

Next steps:
1. Save `eas.json` to project root
2. Run `eas init` to configure
3. Create Android keystore
4. Build and test preview APK
5. Deploy to Play Store

Happy releasing! 🚀
