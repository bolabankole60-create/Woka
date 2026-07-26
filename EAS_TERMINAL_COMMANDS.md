# EAS Terminal Commands - Complete Guide

Step-by-step terminal command sequences for building and releasing your Expo app with EAS.

---

## 📋 Table of Contents

1. [Initial Setup](#initial-setup)
2. [Development Build](#development-build)
3. [Preview APK Build](#preview-apk-build)
4. [Production AAB Build](#production-aab-build)
5. [Credential Management](#credential-management)
6. [Submission to Play Store](#submission-to-play-store)
7. [Monitoring & Troubleshooting](#monitoring--troubleshooting)

---

## 🚀 Initial Setup

**Time Required:** 10 minutes  
**One-time Setup:** Required before first build

### Step 1: Install EAS CLI Globally

```bash
npm install -g eas-cli
```

**Verify Installation:**
```bash
eas --version
# Output: eas-cli/X.X.X node/vX.X.X
```

**Update if Needed:**
```bash
npm install -g eas-cli@latest
```

---

### Step 2: Login to Expo Account

```bash
eas login
```

**Interactive Prompt:**
```
? What is your email address? your-email@example.com
? What is your password? [hidden input]
✅ Logged in successfully
```

**Verify Login:**
```bash
eas whoami
# Output: your-expo-username
```

---

### Step 3: Initialize EAS Project

```bash
eas init
```

**Interactive Prompt:**
```
? What is your Expo project ID? [auto-detected or enter manually]
? Create a new app on Expo? Yes
? Project name? Tradify
✅ Project initialized
```

**Result:**
- Creates project on Expo servers
- Links your local project
- Ready for building

---

### Step 4: Create Android Keystore (One-time)

**Generate Keystore for Signing:**

```bash
keytool -genkey -v -keystore android/keystore.jks \
  -alias tradify-prod \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass YourKeystorePassword123 \
  -keypass YourKeyPassword456
```

**Interactive Prompts (if not using flags):**
```
What is your first and last name?
  [Chidike Okafor]

What is the name of your organizational unit?
  [Tradify]

What is the name of your organization?
  [Tradify Inc]

What is the name of your City or Locality?
  [Lagos]

What is the name of your State or Province?
  [Lagos]

What is the two-letter country code for this unit?
  [NG]

Is CN=Chidike Okafor, OU=Tradify, O=Tradify Inc, L=Lagos, ST=Lagos, C=NG correct?
  [yes]
```

**Verify Keystore Created:**
```bash
ls -la android/keystore.jks
# Output: android/keystore.jks (size: 2.5K)
```

**Store Password Safely:**
- ✅ Keep in password manager
- ✅ Save in GitHub Secrets (if using CI/CD)
- ✅ Never commit to git
- ✅ Add to `.gitignore`:

```bash
# .gitignore
android/keystore.jks
service-account-key.json
.env.local
```

---

## 💻 Development Build

**Time Required:** 5-10 minutes per build  
**Use When:** Testing with Expo Dev Client on your machine

### Full Development Setup

```bash
# Terminal 1: Start Backend Server
cd tradify-backend
npm run dev
# Output: Server running on http://localhost:3000

# Terminal 2: Start Expo Dev Server
cd tradify
npm start
# Prompts: a (open Android), i (open iOS)
```

### Build Development APK

```bash
eas build --platform android --profile development
```

**Output:**
```
✅ Build queued
Waiting for build to start...
[Build logs...]
✅ Build finished
Download link: https://eas-builds.s3.us-west-2.amazonaws.com/...apk
```

### Install on Emulator/Device

```bash
# Download APK from link above, then:

# Android Emulator
adb install -r ~/Downloads/tradify-dev.apk

# Connected Device
adb install -r ~/Downloads/tradify-dev.apk
```

---

## 📱 Preview APK Build

**Time Required:** 10-15 minutes per build  
**Use When:** Sharing with testers (QA, local market testers)

### Quick Preview Build Command

```bash
eas build --platform android --profile preview --wait
```

**Flags:**
- `--wait`: Waits for build to complete and returns link
- `--platform android`: Mobile platform
- `--profile preview`: Staging environment

**Output:**
```
✅ Build succeeded
APK Download: https://eas-builds.s3.us-west-2.amazonaws.com/...apk
Copy the link and share with testers
```

### Share Preview APK with Testers

**Option 1: Email Link**
```
Subject: Tradify App - Test Build Ready

Hi Team,

Please test the latest build:
https://eas-builds.s3.us-west-2.amazonaws.com/...apk

Device Requirements:
- Android 8.0+
- 100MB free space
- Internet connection

Installation:
1. Download APK from link
2. Open file manager
3. Tap the APK to install
4. Follow prompts

Bug reports → Reply to this email

Thanks!
```

**Option 2: WhatsApp/Telegram**
```
📱 Test APK Ready!

Download: https://eas-builds.s3.us-west-2.amazonaws.com/...apk

Install & test. Report bugs in replies 🐛
```

### Monitor Build Progress

```bash
# View all builds
eas build:view

# View in browser
https://expo.dev/builds

# Get build logs
eas build:view --json > builds.json
cat builds.json | jq '.[]' | head -20
```

---

## 🎯 Production AAB Build

**Time Required:** 15-20 minutes per build  
**Use When:** Releasing to Google Play Store

### Step 1: Update Version in app.json

```bash
# Edit app.json
nano app.json

# Change version:
# "version": "1.0.0" → "1.0.1"
```

**Example app.json section:**
```json
{
  "expo": {
    "name": "Tradify",
    "version": "1.0.1",
    "android": {
      "versionCode": 1
    }
  }
}
```

**Commit Version Change:**
```bash
git add app.json
git commit -m "Release version 1.0.1"
git tag v1.0.1
```

---

### Step 2: Build Production AAB

```bash
eas build --platform android --profile production --wait
```

**Flags:**
- `--platform android`: Mobile platform
- `--profile production`: Production environment
- `--wait`: Blocks until build completes
- `--autoIncrement`: Auto-increments build number (configured in eas.json)

**Output:**
```
✅ Build succeeded
Version: 1.0.1
Build number: 1 (auto-incremented)
Build type: aab
Download: https://eas-builds.s3.us-west-2.amazonaws.com/...aab
```

---

### Step 3: Download AAB File

```bash
# From output link
https://eas-builds.s3.us-west-2.amazonaws.com/.../tradify-1.0.1.aab

# Or via CLI
eas build:view
# Select build → Copy download link → paste in browser
```

---

### Step 4: Verify AAB File

```bash
# Check file size
ls -lh ~/Downloads/tradify-1.0.1.aab
# Output: 42M tradify-1.0.1.aab

# Verify it's a valid AAB (ZIP format)
unzip -t ~/Downloads/tradify-1.0.1.aab | head -20
```

---

## 🔐 Credential Management

### View Stored Credentials

```bash
eas credentials
```

**Output:**
```
Android Keystore
├── Key alias: tradify-prod
├── Keystore path: android/keystore.jks
├── Status: Stored securely ✅
└── Last used: 2 hours ago
```

### Update Keystore Password

```bash
# Remove old credentials
eas credentials --platform android --reset

# Next build will prompt for new password
eas build --platform android --profile production

# EAS stores new credentials securely
```

### Rotate Keystore (Advanced)

**Scenario:** Compromised password or key rotation policy

```bash
# 1. Generate new keystore
keytool -genkey -v -keystore android/keystore-new.jks \
  -alias tradify-prod-v2 \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# 2. Update eas.json to reference new keystore
# "keystorePath": "android/keystore-new.jks"
# "keyAlias": "tradify-prod-v2"

# 3. Remove old credentials from EAS
eas credentials --platform android --reset

# 4. Build with new keystore
eas build --platform android --profile production

# 5. Upload new keystore to Play Store
# (Required for future updates)
```

---

## 📤 Submission to Play Store

### Step 1: Create Service Account (First-time)

```bash
# Navigate to Google Play Console
https://play.google.com/console

# Steps:
# 1. Settings → API access
# 2. Click "Create new service account"
# 3. Follow Google Cloud instructions
# 4. Download JSON key file
# 5. Save as service-account-key.json (project root)
```

**Add to .gitignore:**
```bash
echo "service-account-key.json" >> .gitignore
```

---

### Step 2: Submit AAB Automatically

```bash
eas submit --platform android --profile production
```

**Interactive Prompts:**
```
? Service account key path? ./service-account-key.json
? Release track? internal (for testing) or production (live)
? Confirm submission? yes

✅ Submission successful
Submission ID: 123456789
Status: Submitted to Google Play
```

---

### Step 3: Monitor Submission

```bash
# View submission status
eas submit:view

# Or in browser
https://play.google.com/console
→ Your app
→ Release
→ Production
→ Your build will appear here
```

---

### Step 4: Publish in Play Console

```bash
# In browser: https://play.google.com/console

# Steps:
# 1. Select your app
# 2. Release → Production
# 3. Create release
# 4. Select AAB from recent builds
# 5. Fill in release notes
# 6. Review rating classification
# 7. Save and review
# 8. Rollout (start 5%, monitor, ramp to 100%)
# 9. Publish
```

---

## 📊 Monitoring & Troubleshooting

### View Build Status

```bash
# List all builds
eas build:view

# Detailed JSON
eas build:view --json

# Filter recent
eas build:view | head -10
```

### View Build Logs

```bash
# Full logs for latest build
eas build:view --json | jq '.[0]' | grep -A 100 'logs'

# Stream logs during build
eas build --platform android --profile production
# (Don't use --wait, logs stream in real-time)
```

### Clear Cache (if build fails)

```bash
eas build --platform android --profile production --clear-cache --wait
```

### Rebuild Latest Commit

```bash
# Rebuild without changes
eas build --platform android --profile production --wait

# Force rebuild of specific commit
git commit --allow-empty -m "Force rebuild"
eas build --platform android --profile production --wait
```

---

## 🐛 Common Issues & Solutions

### Issue: "Keystore not found"

```bash
# Solution: Create keystore
keytool -genkey -v -keystore android/keystore.jks \
  -alias tradify-prod -keyalg RSA -keysize 2048 -validity 10000

# Verify
ls -la android/keystore.jks
```

### Issue: "Build failed: Invalid keystore password"

```bash
# Solution: Update credentials in EAS
eas credentials --platform android --reset

# Rebuild (EAS will ask for password)
eas build --platform android --profile production --wait
```

### Issue: "APK won't install on device"

```bash
# Solution 1: Enable unknown sources on Android device
# Settings → Apps → Special app access → Install unknown apps
# Enable for your file manager

# Solution 2: Check Android version
# APK requires Android 8.0+
# Device Settings → About → Android version

# Solution 3: Verify APK download
unzip -t ~/Downloads/tradify-preview.apk | grep "No errors"
```

### Issue: "Build succeeded but can't download"

```bash
# Solution: Use CLI to download
eas build:view
# (Select build, copy output URL)

# Manual download
wget https://eas-builds.s3.us-west-2.amazonaws.com/...apk
```

### Issue: "Slow build times"

```bash
# Solution: Clear cache between builds
eas build --platform android --profile production --clear-cache

# Check node version (should be 18.13.0)
node --version
npm --version
```

---

## ⚡ Complete Workflow - From Code to Release

### Development → Testing → Release

```bash
# 1. Make code changes
git add .
git commit -m "Feature: Add expense categories"

# 2. Test locally
npm start
# Test in Expo Dev Client

# 3. Build preview APK
eas build --platform android --profile preview --wait
# Share APK link with QA team

# 4. After QA approval, prepare release
git checkout main
git pull origin main
npm install

# 5. Update version
nano app.json
# Change version: "1.0.1" → "1.0.2"

# 6. Commit & tag
git add app.json
git commit -m "Release v1.0.2"
git tag v1.0.2
git push origin main --tags

# 7. Build production AAB
eas build --platform android --profile production --wait

# 8. Submit to Play Store
eas submit --platform android --profile production

# 9. Publish in Google Play Console
# (Manual: approve, set rollout, publish)
```

---

## 📚 Command Reference Sheet

| Task | Command |
|------|---------|
| Install EAS | `npm install -g eas-cli` |
| Login | `eas login` |
| Initialize | `eas init` |
| Create keystore | `keytool -genkey...` |
| Build development | `eas build --platform android --profile development --wait` |
| Build preview | `eas build --platform android --profile preview --wait` |
| Build production | `eas build --platform android --profile production --wait` |
| View builds | `eas build:view` |
| Check credentials | `eas credentials` |
| Submit to Play Store | `eas submit --platform android --profile production` |
| Check whoami | `eas whoami` |
| Update EAS | `npm install -g eas-cli@latest` |

---

## 🎯 Next Steps

1. ✅ Run initial setup (Step 1-4)
2. ✅ Build development APK
3. ✅ Build preview APK (share with testers)
4. ✅ Create Google Play account
5. ✅ Get Play Store API credentials
6. ✅ Build production AAB
7. ✅ Submit to Play Store
8. ✅ Publish when ready

**You're ready to deploy!** 🚀
