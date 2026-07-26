#!/bin/bash

###############################################################################
# TRADIFY EAS BUILD & DEPLOYMENT - QUICK REFERENCE
#
# A collection of essential EAS commands for building and deploying the app.
# Copy and paste each section as needed for your workflow.
###############################################################################

# ============================================================================
# PHASE 1: INITIAL SETUP (Run once)
# ============================================================================

# Install EAS CLI globally
npm install -g eas-cli

# Verify installation
eas --version

# Initialize EAS project (creates eas.json)
eas init

# Login to Expo account
eas login

# Verify login
eas whoami

# ============================================================================
# PHASE 2: ANDROID PREVIEW BUILD (APK for Testers)
# ============================================================================

# Build APK for internal testing (targeting staging backend)
eas build --platform android --profile preview --wait

# View all builds
eas build:view

# Download specific build
eas build:view
# Select build number, copy download link

# ============================================================================
# PHASE 3: ANDROID PRODUCTION BUILD (AAB for Play Store)
# ============================================================================

# Before building, update version in app.json:
# "version": "1.0.0"

# Build AAB for Google Play Store (targeting production backend)
eas build --platform android --profile production --wait

# View build info
eas build:view

# Auto-increment build number (configured in eas.json)
# eas.json production profile has "autoIncrement": true
# Each build will increment: v1.0.0 (1) → v1.0.0 (2)

# ============================================================================
# PHASE 4: ANDROID KEYSTORE MANAGEMENT
# ============================================================================

# Generate keystore (one-time, for signing APKs)
keytool -genkey -v -keystore android/keystore.jks \
  -alias tradify-prod \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass your_keystore_password \
  -keypass your_key_password

# View stored credentials
eas credentials

# Remove stored credentials (if needed to update password)
eas credentials --platform android

# ============================================================================
# PHASE 5: GOOGLE PLAY STORE SUBMISSION
# ============================================================================

# Create service account key (in Google Play Console):
# 1. Go to https://play.google.com/console
# 2. Settings → API access
# 3. Create new service account
# 4. Download JSON key as service-account-key.json
# 5. Place in project root

# Submit AAB to Google Play Store
eas submit --platform android --profile production

# Manual upload (if automatic fails):
# 1. Download AAB from EAS build link
# 2. Google Play Console → Your app → Release → Production
# 3. Upload AAB file
# 4. Fill in release notes
# 5. Review and submit

# ============================================================================
# COMPLETE DEPLOYMENT WORKFLOW
# ============================================================================

# For Development (targeting localhost)
# eas build --platform android --profile development --wait

# For Staging (targeting staging-api.tradify.ng)
eas build --platform android --profile preview --wait
# Share APK link with QA team

# For Production (targeting api.tradify.ng)
# 1. Update version in app.json
git add app.json
git commit -m "Release version 1.0.0"
git tag v1.0.0

# 2. Build AAB
eas build --platform android --profile production --wait

# 3. Submit to Play Store
eas submit --platform android --profile production

# 4. Verify in Google Play Console
# 5. Publish when ready

# ============================================================================
# ENVIRONMENT VARIABLES
# ============================================================================

# Environment variables are defined in eas.json per profile:
# development:  EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
# preview:      EXPO_PUBLIC_API_URL=https://staging-api.tradify.ng
# production:   EXPO_PUBLIC_API_URL=https://api.tradify.ng

# Access in app:
# import { process } from 'process';
# const API_URL = process.env.EXPO_PUBLIC_API_URL;

# ============================================================================
# TROUBLESHOOTING
# ============================================================================

# Check build status
eas build:view

# View build logs
eas build:view --json

# Clear build cache
eas build --platform android --profile production --clear-cache

# Prebuild locally (to test before cloud build)
npx expo prebuild --clean

# Update EAS CLI
npm install -g eas-cli@latest

# ============================================================================
# USEFUL LINKS
# ============================================================================

# Expo Dashboard: https://expo.dev
# EAS Build: https://expo.dev/builds
# Google Play Console: https://play.google.com/console
# EAS Docs: https://docs.expo.dev/eas/introduction/

###############################################################################
# END OF QUICK REFERENCE
###############################################################################
