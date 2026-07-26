# EAS Environment Variable Injection & Configuration

Complete guide to configuring environment variables across all three build profiles in Expo Application Services.

---

## 🎯 Overview

Environment variables are injected into your compiled app during the EAS Cloud Build process. This allows you to:
- ✅ Target different API endpoints per build profile
- ✅ Enable/disable features by environment
- ✅ Keep secrets out of version control
- ✅ Deploy same app code to multiple environments

---

## 📝 Understanding EXPO_PUBLIC_ Prefix

**Critical Rule:** All environment variables must start with `EXPO_PUBLIC_` to be accessible in your React Native app.

```json
{
  "env": {
    "EXPO_PUBLIC_API_URL": "https://api.tradify.ng",
    // ✅ Accessible in app
    
    "SECRET_KEY": "sk_live_xyz",
    // ❌ NOT accessible in app (no EXPO_PUBLIC_ prefix)
  }
}
```

**Why?** React Native apps are compiled to JavaScript bundles that ship with the APK/AAB. Environment variables without the `EXPO_PUBLIC_` prefix are considered secrets and are never bundled.

---

## 🌍 Three Build Profiles & Their URLs

### **Development Profile** (Local Testing)

```json
{
  "development": {
    "env": {
      "EXPO_PUBLIC_API_URL": "http://192.168.1.100:3000",
      "EXPO_PUBLIC_ENVIRONMENT": "development"
    }
  }
}
```

**Details:**
- **API URL**: `http://192.168.1.100:3000`
  - Replace `192.168.1.100` with your machine's local network IP
  - Used when developing with Expo Dev Client
  - Backend must be running: `npm run dev`

**How to find your IP:**
```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows (PowerShell)
ipconfig | findstr "IPv4"

# Result example:
# IPv4 Address: 192.168.1.100
```

**Usage:**
```bash
eas build --platform android --profile development
```

---

### **Preview Profile** (QA Testing)

```json
{
  "preview": {
    "env": {
      "EXPO_PUBLIC_API_URL": "https://staging-api.tradify.ng",
      "EXPO_PUBLIC_ENVIRONMENT": "staging"
    }
  }
}
```

**Details:**
- **API URL**: `https://staging-api.tradify.ng`
- **Distribution**: Internal (APK download link via email)
- **No Expo Account Required**: Testers download and install directly
- **Use Case**: Share with QA team, early adopters

**Features:**
- ✅ Standalone APK (no Expo dev client needed)
- ✅ Full-featured production build
- ✅ Connects to staging backend
- ✅ Can be shared via WhatsApp/email

**Usage:**
```bash
eas build --platform android --profile preview --wait
# Outputs download link → share with testers
```

---

### **Production Profile** (Google Play Store)

```json
{
  "production": {
    "env": {
      "EXPO_PUBLIC_API_URL": "https://api.tradify.ng",
      "EXPO_PUBLIC_ENVIRONMENT": "production"
    }
  }
}
```

**Details:**
- **API URL**: `https://api.tradify.ng`
- **Distribution**: Google Play Store
- **Build Type**: AAB (Android App Bundle)
- **Version**: Auto-increments with each build

**Features:**
- ✅ Optimized & minified
- ✅ Play Store compliant
- ✅ Smaller download size
- ✅ Automatic rollout management

**Usage:**
```bash
eas build --platform android --profile production --wait
eas submit --platform android --profile production
```

---

## 📲 Accessing Variables in Your App

### **Basic Access**

```typescript
// In any React Native component
import { useEffect } from 'react';

export function MyComponent() {
  useEffect(() => {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    console.log('API URL:', apiUrl);
    // development: http://192.168.1.100:3000
    // preview: https://staging-api.tradify.ng
    // production: https://api.tradify.ng
  }, []);
  
  return null;
}
```

### **In API Client**

```typescript
// src/services/api.ts
const baseURL = process.env.EXPO_PUBLIC_API_URL;

export const apiClient = new APIClient({
  baseURL: baseURL || 'https://api.tradify.ng', // Fallback
  timeout: 10000,
});

export default apiClient;
```

### **In Redux Slice**

```typescript
// src/store/slices/authSlice.ts
import { createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '@/services/api';

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials) => {
    // apiClient uses EXPO_PUBLIC_API_URL
    const response = await apiClient.post('/api/v1/auth/login', credentials);
    return response.data;
  }
);
```

### **Type-Safe Environment Variables**

```typescript
// env.ts
export const ENV = {
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'https://api.tradify.ng',
  ENVIRONMENT: process.env.EXPO_PUBLIC_ENVIRONMENT || 'production',
  PAYSTACK_PUBLIC_KEY: process.env.EXPO_PUBLIC_PAYSTACK_KEY || '',
} as const;

// Usage in app
import { ENV } from '@/env';

console.log(ENV.API_URL);
console.log(ENV.ENVIRONMENT);
```

---

## 🔧 Setting Up Environment Variables

### **Option 1: In eas.json** (Recommended)

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.tradify.ng",
        "EXPO_PUBLIC_PAYSTACK_KEY": "pk_live_xyz"
      }
    }
  }
}
```

**Pros:**
- ✅ Version controlled
- ✅ Tracked in git
- ✅ Clear per-profile configuration
- ✅ Automatic injection during build

**Cons:**
- ❌ Public values only (no secrets)
- ❌ Requires code review for URL changes

---

### **Option 2: Environment Variables File** (.env)

```bash
# .env (in project root)
EXPO_PUBLIC_API_URL=https://api.tradify.ng
EXPO_PUBLIC_PAYSTACK_KEY=pk_live_xyz
```

```bash
# Load in shell before building
export $(cat .env | xargs)
eas build --platform android --profile production
```

**Pros:**
- ✅ Separate from version control
- ✅ Local overrides possible
- ✅ CI/CD friendly

**Cons:**
- ❌ Extra step required
- ❌ Easy to forget to load
- ❌ Not in eas.json (profile separation unclear)

---

### **Option 3: GitHub Actions / CI/CD**

```yaml
# .github/workflows/build.yml
name: EAS Build

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build with EAS
        env:
          EXPO_PUBLIC_API_URL: ${{ secrets.PRODUCTION_API_URL }}
          EXPO_PUBLIC_PAYSTACK_KEY: ${{ secrets.PAYSTACK_KEY }}
        run: |
          npm install -g eas-cli
          eas build --platform android --profile production
```

**Pros:**
- ✅ Secrets stored securely in GitHub
- ✅ Automatic builds on push
- ✅ No local credentials needed

**Cons:**
- ❌ Requires GitHub Actions setup
- ❌ More complex configuration

---

## 🔐 Secrets Management

### **Non-Secret Variables** (OK to commit to git)
- `EXPO_PUBLIC_API_URL` - API endpoint
- `EXPO_PUBLIC_ENVIRONMENT` - Environment name (dev/staging/prod)
- `EXPO_PUBLIC_PAYSTACK_KEY` - Paystack public key (public by design)

### **Secret Variables** (Never commit)
- `PAYSTACK_SECRET_KEY` - Backend only
- `JWT_SECRET` - Backend only
- `DATABASE_PASSWORD` - Backend only

**Store secrets in:**
1. `.env.local` (git-ignored)
2. GitHub Secrets
3. Environment management service (Vercel, AWS Secrets Manager)

---

## 📋 Complete eas.json Template with Variables

```json
{
  "cli": {
    "version": ">= 5.0.0",
    "requireCommit": false,
    "appVersionSource": "local"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_URL": "http://192.168.1.100:3000",
        "EXPO_PUBLIC_ENVIRONMENT": "development",
        "EXPO_PUBLIC_PAYSTACK_KEY": "pk_test_xyz"
      },
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "developmentClient": false,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_URL": "https://staging-api.tradify.ng",
        "EXPO_PUBLIC_ENVIRONMENT": "staging",
        "EXPO_PUBLIC_PAYSTACK_KEY": "pk_test_xyz"
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "developmentClient": false,
      "distribution": "store",
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.tradify.ng",
        "EXPO_PUBLIC_ENVIRONMENT": "production",
        "EXPO_PUBLIC_PAYSTACK_KEY": "pk_live_xyz"
      },
      "android": {
        "buildType": "aab",
        "autoIncrement": true
      }
    }
  }
}
```

---

## ✅ Verification Checklist

### Before Building Preview APK

```bash
# 1. Check environment variables in eas.json
cat eas.json | grep EXPO_PUBLIC_API_URL
# Should output: https://staging-api.tradify.ng

# 2. Verify app can access variable
grep -r "EXPO_PUBLIC_API_URL" src/
# Should find references in api client

# 3. Test with development build first
eas build --platform android --profile development

# 4. Build preview
eas build --platform android --profile preview --wait
```

### Before Building Production AAB

```bash
# 1. Check production URL is correct
cat eas.json | grep -A 10 '"production"' | grep EXPO_PUBLIC_API_URL
# Should output: https://api.tradify.ng

# 2. Version is incremented
cat app.json | grep version
# Should be: "1.0.1" (increment from previous)

# 3. No hardcoded URLs in code
grep -r "localhost" src/
# Should output nothing

# 4. API client uses environment variable
grep -r "process.env.EXPO_PUBLIC_API_URL" src/
# Should find usage in API client initialization
```

---

## 🚀 Quick Reference

### **Development**
```
URL: http://YOUR_IP:3000
Use when: Local testing with Expo Dev Client
Build: eas build --platform android --profile development
```

### **Preview**
```
URL: https://staging-api.tradify.ng
Use when: Sharing APK with testers (no Expo account needed)
Build: eas build --platform android --profile preview
```

### **Production**
```
URL: https://api.tradify.ng
Use when: Google Play Store release
Build: eas build --platform android --profile production
```

---

## 🔍 Troubleshooting

### Issue: "EXPO_PUBLIC_API_URL is undefined"

**Problem:** Variable not injected into build

**Solution:**
1. Verify `eas.json` has `EXPO_PUBLIC_` prefix
2. Check profile name matches build command
3. Clear cache: `eas build --clear-cache --platform android --profile production`
4. Rebuild: `eas build --platform android --profile production --wait`

### Issue: "App connecting to wrong API"

**Problem:** Environment variable not being used

**Solution:**
1. Check app is using `process.env.EXPO_PUBLIC_API_URL`
2. Verify API client initialization
3. Look for hardcoded URLs in code
4. Search for "localhost" or hardcoded IPs

```bash
grep -r "http://" src/ | grep -v "http://localhost"
grep -r "https://" src/ | grep -v "process.env"
```

### Issue: "Different URL per profile not working"

**Problem:** Build using same URL for all profiles

**Solution:**
1. Separate profiles in eas.json
2. Verify each profile has unique `env` block
3. Use correct profile name in build command

```bash
# Correct
eas build --platform android --profile production

# Incorrect (uses default, not your profile)
eas build --platform android
```

---

## 📚 Additional Resources

- **Expo Environment Variables**: https://docs.expo.dev/build-reference/variables/
- **EAS Build Reference**: https://docs.expo.dev/eas-update/getting-started/
- **React Native Environment**: https://reactnative.dev/docs/environment-setup

---

**All three profiles are now configured and ready to inject correct API URLs into your builds!** 🎉
