# EAS Quick Reference Card

**Tradify - Expo Application Services Build & Deployment**

---

## 🚀 First Time Setup (Copy & Paste)

```bash
# 1. Install EAS globally
npm install -g eas-cli

# 2. Verify installation
eas --version

# 3. Login to Expo
eas login
# Prompts: email, password

# 4. Verify login
eas whoami

# 5. Initialize project
eas init
# Prompts: Expo ID, project name

# 6. Create Android keystore (one-time)
keytool -genkey -v -keystore android/keystore.jks \
  -alias tradify-prod \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass MyPassword123 \
  -keypass MyPassword456
```

---

## 📝 eas.json Configuration

**Location:** Project root (`tradify/eas.json`)

**Three Profiles:**

| Profile | Environment | Build Type | API URL | When to Use |
|---------|------------|-----------|---------|------------|
| **development** | Local | APK | `http://192.168.1.100:3000` | Dev testing |
| **preview** | Staging | APK | `https://staging-api.tradify.ng` | QA testing |
| **production** | Live | AAB | `https://api.tradify.ng` | Play Store |

**Key Settings:**
- `developmentClient`: Dev client vs standalone
- `distribution`: internal vs store
- `buildType`: apk vs aab
- `EXPO_PUBLIC_API_URL`: API endpoint (injected into app)
- `autoIncrement`: Production builds auto-increment version

---

## 🔑 Environment Variables

**Rule:** All variables must start with `EXPO_PUBLIC_` to be accessible in the app.

**In eas.json:**
```json
{
  "env": {
    "EXPO_PUBLIC_API_URL": "https://api.tradify.ng",
    "EXPO_PUBLIC_ENVIRONMENT": "production"
  }
}
```

**Access in App:**
```typescript
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
// development: http://192.168.1.100:3000
// preview: https://staging-api.tradify.ng
// production: https://api.tradify.ng
```

---

## 🏗️ Build Commands (Copy & Paste)

### Development (Local Testing)

```bash
eas build --platform android --profile development --wait
```

### Preview (QA Testers)

```bash
eas build --platform android --profile preview --wait
```

### Production (Play Store)

```bash
eas build --platform android --profile production --wait
```

---

## 📤 Play Store Submission (Copy & Paste)

### Step 1: Get Service Account Key

```
https://play.google.com/console
→ Settings → API access → Create service account
→ Download JSON → Save as service-account-key.json
```

### Step 2: Submit Build

```bash
eas submit --platform android --profile production
```

**Prompts:**
- Service account key path: `./service-account-key.json`
- Release track: `internal` (test) or `production` (live)
- Confirm: `yes`

---

## 📋 Quick Checklist

### Before Preview Build
- [ ] Backend running: `npm run dev` (port 3000)
- [ ] eas.json has staging URL
- [ ] Keystore exists: `ls android/keystore.jks`
- [ ] app.json has version

### Before Production Build
- [ ] Version incremented in app.json
- [ ] Preview APK tested successfully
- [ ] eas.json has production URL
- [ ] Git tag created: `git tag v1.0.0`
- [ ] Service account JSON ready

### After Production Build
- [ ] AAB downloaded
- [ ] Uploaded to Play Console
- [ ] Release notes filled
- [ ] Rollout strategy set (5% → 100%)
- [ ] Ready to publish

---

## 🔍 View Build Status

```bash
# List all builds
eas build:view

# View in browser
https://expo.dev/builds

# View JSON output
eas build:view --json

# Check credentials
eas credentials
```

---

## 🐛 Common Problems & Quick Fixes

| Problem | Fix |
|---------|-----|
| Keystore not found | `keytool -genkey...` (create keystore) |
| Build fails | `eas build --clear-cache --platform android --profile production --wait` |
| APK won't install | Android Settings → Apps → Special app access → Install unknown apps |
| Wrong API URL in app | Check eas.json `env` section, verify profile name in build command |
| Credentials error | `eas credentials --platform android --reset` (then rebuild) |
| Slow build | Clear cache: `eas build --clear-cache...` |

---

## 📱 Download Links

### Preview APK
After build completes:
```
https://eas-builds.s3.us-west-2.amazonaws.com/...apk
```
Share with testers (no Expo account needed)

### Production AAB
After build completes:
```
https://eas-builds.s3.us-west-2.amazonaws.com/...aab
```
Upload to Google Play Console

---

## 🎯 Complete Release Workflow

```bash
# 1. Update version
nano app.json  # "1.0.0" → "1.0.1"

# 2. Commit & tag
git add app.json
git commit -m "Release v1.0.1"
git tag v1.0.1

# 3. Build production
eas build --platform android --profile production --wait

# 4. Submit to Play Store
eas submit --platform android --profile production

# 5. Publish in Google Play Console
# (Manual: settings → rollout → publish)
```

---

## 💾 File Locations

| File | Purpose |
|------|---------|
| `eas.json` | EAS build config (root) |
| `app.json` | Expo app config |
| `android/keystore.jks` | Signing key (git-ignored) |
| `service-account-key.json` | Google Play access (git-ignored) |
| `.env.local` | Local environment (git-ignored) |

---

## 🔐 Credentials Storage

✅ **Safe Locations:**
- GitHub Secrets (for CI/CD)
- `.env.local` (git-ignored)
- Password manager
- EAS Credentials (auto-stored after first build)

❌ **Never Commit:**
- Keystore passwords
- API keys
- Service account JSON
- `.env` with secrets

---

## 📊 Build Profile Comparison

```
DEVELOPMENT
├─ Client: Dev client
├─ Distribution: Internal
├─ Build type: APK
├─ API: localhost:3000
└─ Use: Active development

PREVIEW
├─ Client: Standalone
├─ Distribution: Internal
├─ Build type: APK
├─ API: staging-api.tradify.ng
└─ Use: QA testing (no account needed)

PRODUCTION
├─ Client: Standalone
├─ Distribution: Play Store
├─ Build type: AAB
├─ API: api.tradify.ng
└─ Use: Public release
```

---

## 🚀 First Build (Step by Step)

```bash
# Prerequisites
npm install -g eas-cli
eas login
eas init

# Create keystore
keytool -genkey -v -keystore android/keystore.jks \
  -alias tradify-prod -keyalg RSA -keysize 2048 -validity 10000

# Test build
eas build --platform android --profile development --wait

# Share APK
eas build --platform android --profile preview --wait
# → Copy download link → Share with testers

# When ready for Play Store
eas build --platform android --profile production --wait
eas submit --platform android --profile production
# → Publish in Google Play Console
```

---

## 📞 Helpful Links

| Resource | URL |
|----------|-----|
| EAS Docs | https://docs.expo.dev/eas/ |
| Google Play Console | https://play.google.com/console |
| Expo Dashboard | https://expo.dev |
| Paystack Dashboard | https://dashboard.paystack.com |
| Android Developer | https://developer.android.com |

---

## ✨ Key Points to Remember

1. **EXPO_PUBLIC_ prefix** - All public vars must start with this
2. **Three profiles** - dev, preview, production (each separate config)
3. **APK vs AAB** - APK for testing, AAB for Play Store only
4. **Keystore once** - Create keystore once, reuse for all builds
5. **Version matters** - Increment for each Play Store release
6. **Idempotent** - Same code + same profile = same URL injected
7. **Download link** - Always copy the link at end of build

---

**Ready to build and release!** 🎉

For detailed guides:
- Setup → [BACKEND_SETUP.md](BACKEND_SETUP.md)
- Deployment → [EAS_DEPLOYMENT_GUIDE.md](EAS_DEPLOYMENT_GUIDE.md)
- Terminal Commands → [EAS_TERMINAL_COMMANDS.md](EAS_TERMINAL_COMMANDS.md)
- Environment Variables → [EAS_ENVIRONMENT_VARIABLES.md](EAS_ENVIRONMENT_VARIABLES.md)
