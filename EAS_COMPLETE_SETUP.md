# EAS Configuration & Deployment - Complete Setup ✅

Production-ready Expo App Services configuration for building Android APKs and Play Store AAB bundles.

---

## 📦 What Has Been Created

### **1. eas.json** (Root Directory)
A complete, production-grade EAS configuration file with three build profiles:

**Development Profile**
- For active development with Expo dev client
- Targets: http://192.168.1.100:3000 (local backend)
- Output: APK
- Distribution: Internal

**Preview Profile**
- For QA testing (standalone APK, no Expo account needed)
- Targets: https://staging-api.tradify.ng (staging backend)
- Output: APK
- Distribution: Internal
- Perfect for sharing with testers

**Production Profile**
- For Google Play Store release
- Targets: https://api.tradify.ng (production backend)
- Output: AAB (Android App Bundle)
- Distribution: Store
- Auto-increment version on each build

### **2. EAS_DEPLOYMENT_GUIDE.md**
Comprehensive 300+ line guide covering:
- Build profile explanations
- Environment variable setup
- Step-by-step deployment workflow
- Android keystore management
- Google Play Store submission
- Troubleshooting guide
- Complete checklist

### **3. EAS_QUICK_COMMANDS.sh**
Quick reference shell script with:
- All essential EAS CLI commands
- Copy-paste ready workflows
- Phase-by-phase breakdown
- Environment variable reference
- Troubleshooting shortcuts

---

## 🎯 Build Profiles at a Glance

| Profile | Purpose | Build Type | Backend | Distribution | APK? |
|---------|---------|-----------|---------|--------------|------|
| **development** | Dev with hot reload | APK | localhost:3000 | Internal | ✅ |
| **preview** | QA testing | APK | staging-api | Internal | ✅ |
| **production** | Play Store release | AAB | api.tradify.ng | Store | ❌ |

---

## 🔧 Key Configuration Features

### Environment Variable Injection

Each profile automatically injects `EXPO_PUBLIC_API_URL`:

```typescript
// In your app
const apiClient = new APIClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL
});

// Results:
// development: http://192.168.1.100:3000
// preview: https://staging-api.tradify.ng
// production: https://api.tradify.ng
```

### Android Keystore Signing

All profiles configured with:
- **Keystore path**: `android/keystore.jks`
- **Key alias**: `tradify-dev`, `tradify-staging`, `tradify-prod`
- **Algorithm**: RSA-2048
- **Validity**: 10,000 days

### Auto-Versioning

Production profile includes:
```json
"autoIncrement": true
```

Version automatically increments for each build:
- v1.0.0 (1) → v1.0.0 (2) → v1.0.0 (3)

---

## 📱 Step-by-Step Deployment

### **Quick Start (5 minutes)**

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login to Expo
eas login

# 3. Initialize project
eas init

# 4. Build preview APK (for testers)
eas build --platform android --profile preview --wait

# 5. Share download link with QA team ✅
```

### **Full Production Release**

```bash
# 1. Update version in app.json
# "version": "1.0.0"

# 2. Commit & tag
git add app.json eas.json
git commit -m "Release v1.0.0"
git tag v1.0.0

# 3. Build production AAB
eas build --platform android --profile production --wait

# 4. Get download link from output
# https://eas-builds.s3.us-west-2.amazonaws.com/.../...aab

# 5. Upload to Google Play Console
eas submit --platform android --profile production

# 6. Review & publish
# → Google Play Console → Your app → Release → Publish
```

---

## 🔐 Credential Management

### Generate Android Keystore (One-time)

```bash
keytool -genkey -v -keystore android/keystore.jks \
  -alias tradify-prod \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass your_keystore_password \
  -keypass your_key_password
```

### Store in EAS (Secure)

```bash
# First build will prompt for passwords
eas build --platform android --profile production

# EAS stores them securely for future builds
# Future builds use stored credentials automatically
```

### View Stored Credentials

```bash
eas credentials

# Output shows:
# Android Keystore
# ├── Key alias: tradify-prod
# ├── Keystore path: android/keystore.jks
# └── Status: Stored securely ✅
```

---

## 📊 Build Output Comparison

### Preview APK
```
File: tradify-preview.apk
Size: ~50-60 MB
Distribution: Internal only
Installation: Direct download on Android device
Tester Account Required: No ❌
Backend: Staging
Use Case: QA testing
```

### Production AAB
```
File: tradify.aab
Size: ~40-50 MB (smaller than APK)
Distribution: Google Play Store only
Installation: Via Play Store app
Tester Account Required: No (public release)
Backend: Production
Use Case: Public release
```

---

## ✅ Deployment Checklist

### Before Preview Build
- [ ] Backend server running and accessible
- [ ] `EXPO_PUBLIC_API_URL` in eas.json targets staging
- [ ] Android keystore created (`android/keystore.jks`)
- [ ] Credentials stored in EAS (`eas credentials`)
- [ ] `app.json` has valid version

### Before Production Build
- [ ] Preview APK tested successfully by QA
- [ ] `EXPO_PUBLIC_API_URL` targets production
- [ ] Version number updated in `app.json`
- [ ] Git tag created
- [ ] Service account JSON downloaded from Google Play Console

### After Production Build
- [ ] AAB downloaded and verified
- [ ] Uploaded to Google Play Console
- [ ] Release notes filled in
- [ ] Rollout strategy set (start 5%, ramp to 100%)
- [ ] QA sign-off received
- [ ] Ready to publish ✅

---

## 🚀 Environment Variables Quick Reference

### Development
```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
EXPO_PUBLIC_ENVIRONMENT=development
```

### Preview (Staging)
```env
EXPO_PUBLIC_API_URL=https://staging-api.tradify.ng
EXPO_PUBLIC_ENVIRONMENT=staging
```

### Production
```env
EXPO_PUBLIC_API_URL=https://api.tradify.ng
EXPO_PUBLIC_ENVIRONMENT=production
```

---

## 📋 Configuration Files

### eas.json (Root)
```json
{
  "build": {
    "development": { ... },
    "preview": { ... },
    "production": { ... }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./service-account-key.json"
      }
    }
  }
}
```

### app.json (App Metadata)
```json
{
  "expo": {
    "version": "1.0.0",
    "android": {
      "versionCode": 1
    }
  }
}
```

### Credentials
- `android/keystore.jks` - Signing key (git-ignored)
- `service-account-key.json` - Google Play access (git-ignored)

---

## 🐛 Common Issues & Solutions

### Issue: "Keystore not found"
```bash
# Solution: Create keystore
keytool -genkey -v -keystore android/keystore.jks \
  -alias tradify-prod -keyalg RSA -keysize 2048 -validity 10000
```

### Issue: "Environment variable not available in app"
```bash
# Solution: Must start with EXPO_PUBLIC_
# ❌ API_URL=...
# ✅ EXPO_PUBLIC_API_URL=...
```

### Issue: "APK won't install on device"
```
On Android:
Settings → Apps → Special app access → Install unknown apps
Enable for your file manager
Tap APK to install
```

### Issue: "Version not incrementing"
```json
// Solution: Ensure autoIncrement is true
{
  "production": {
    "autoIncrement": true
  }
}
```

---

## 🎯 Typical Workflows

### Daily Development
```bash
eas build --platform android --profile development --wait
# Install on emulator/device
# Test against localhost:3000
```

### QA Testing
```bash
eas build --platform android --profile preview --wait
# Copy download link
# Share with QA team
# Test against staging backend
```

### Production Release
```bash
# Update version, commit, tag
git add app.json
git commit -m "Release v1.0.1"
git tag v1.0.1

# Build & submit
eas build --platform android --profile production --wait
eas submit --platform android --profile production

# Publish in Google Play Console
```

---

## 📚 Reference Commands

```bash
# Installation & Setup
npm install -g eas-cli
eas login
eas init
eas whoami

# Building
eas build --platform android --profile development
eas build --platform android --profile preview --wait
eas build --platform android --profile production --wait

# Management
eas build:view
eas credentials
eas analytics

# Submission
eas submit --platform android --profile production

# Updates
npm install -g eas-cli@latest
```

---

## ✨ Key Features of This Setup

✅ **Three Build Profiles**
- Development for dev client testing
- Preview for QA testing (standalone APK)
- Production for Play Store releases

✅ **Environment Variable Injection**
- Automatically targets correct backend per profile
- No hardcoding required

✅ **Secure Credential Management**
- Keystore stored locally, never committed
- Passwords stored securely in EAS
- Service account key for Play Store

✅ **Automatic Versioning**
- Production profile auto-increments build number
- Each release gets unique version

✅ **Production-Ready**
- Minification & optimization enabled
- Proper signing configuration
- Google Play Store integration ready

---

## 🚀 You're Ready to Deploy!

Your eas.json is fully configured and ready for:
1. ✅ Building preview APKs for testers
2. ✅ Building production AABs for Play Store
3. ✅ Managing credentials securely
4. ✅ Automatic version incrementing
5. ✅ Environment variable injection

**Next steps:**
1. Review `eas.json` (saved to project root)
2. Create Android keystore: `keytool -genkey...`
3. Run `eas init` in your Expo project
4. Build preview: `eas build --platform android --profile preview --wait`
5. Share with QA and test
6. When ready, release to Play Store

Happy releasing! 🎉
