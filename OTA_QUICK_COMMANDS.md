# OTA Updates - Quick Command Reference

**Expo Updates Deployment Commands**

---

## 📋 Setup (One-Time)

```bash
# 1. Update app.json with expo-updates
cp app-with-updates.json app.json

# 2. Update eas.json with channels
cp eas-with-channels.json eas.json

# 3. Add UpdateCheck component
cp UpdateCheck.tsx src/components/UpdateCheck.tsx

# 4. Import in root layout (app/_layout.tsx)
# Add: import UpdateCheck from '@/components/UpdateCheck';
# Add: <UpdateCheck /> in JSX

# 5. Build base APK with channels
eas build --platform android --profile preview --wait
```

---

## 🚀 Publish Updates

### Deploy to Preview Channel (QA Testers)

```bash
# Basic
eas update --channel preview

# With message
eas update --channel preview \
  --message "Bug fix: HMAC signature verification"

# Dry run (test without publishing)
eas update --channel preview --dry-run
```

### Deploy to Production Channel (All Users)

```bash
# Basic
eas update --channel production

# With message
eas update --channel production \
  --message "Hotfix: Payment processing edge case"
```

---

## 📊 Monitor Updates

### View All Updates

```bash
# List recent updates
eas update:list

# List by channel
eas update:list --branch preview
eas update:list --branch production

# View specific update
eas update:view --update-id xxxxx
```

### View in Browser

```bash
# Expo Dashboard
https://expo.dev/projects/YOUR_PROJECT_ID

# Navigation:
# → Updates tab
# → Select channel
# → View status, dates, message
```

---

## 🔄 Rollback / Delete Updates

```bash
# Delete specific update (prevents distribution)
eas update:delete --update-id xxxxx

# Users revert to previous version on next startup
```

---

## 🔧 Get Your Project ID

```bash
# Method 1: From config
expo config --type public | jq '.projectId'

# Method 2: From app.json
cat app.json | jq '.extra.eas.projectId'

# Method 3: From Expo dashboard
https://expo.dev
# → Your projects
# → Select Tradify
# → Copy from URL or settings
```

---

## 📱 Build APK (After Setup)

### Initial Build (with channels)

```bash
# First build - will ask for keystore password
eas build --platform android --profile preview --wait

# Output:
# → Channel: preview
# → Download link: [APK download URL]
# → Share with testers

# Result: Testers' phones now check "preview" channel for updates
```

### Subsequent Builds

```bash
# Just deploy code changes, no new build needed
eas update --channel preview

# Only build new APK if:
# - Native dependencies change (Paystack SDK)
# - Permissions change
# - Android SDK updated
# - Dependency versions updated
```

---

## 🔐 Authentication

```bash
# Login to Expo
eas login

# Verify login
eas whoami

# Logout
eas logout
```

---

## 📝 Common Workflow

### Fix Bug → Deploy Update

```bash
# 1. Fix code
nano src/services/api.ts
# Make changes

# 2. Test locally
npm start
# Verify fix works

# 3. Deploy to preview
eas update --channel preview \
  --message "Fixed: API timeout handling"

# 4. QA tests
# All testers get update automatically

# 5. If approved, deploy to production
eas update --channel production \
  --message "Fixed: API timeout handling"

# Done! Users get update instantly
```

---

## 🎯 Quick Reference Table

| Task | Command | Time |
|------|---------|------|
| Deploy to preview | `eas update --channel preview` | 1 min |
| Deploy to production | `eas update --channel production` | 1 min |
| View updates | `eas update:list` | 10 sec |
| Check specific update | `eas update:view --update-id xxxxx` | 10 sec |
| Rollback (delete) | `eas update:delete --update-id xxxxx` | 10 sec |
| Build new APK | `eas build --platform android --profile preview --wait` | 15 min |

---

## 🐛 Quick Troubleshooting

### Update not received

```bash
# Check it was published
eas update:list

# Verify channel name
cat eas.json | grep channel

# Check build channel matches
eas build --platform android --profile preview --wait
# Should show "channel: preview"
```

### Users still see old version

```bash
# Wait for next app startup (update checks on start)
# Or user taps "Reload" button (UpdateCheck.tsx)
# Or restart app manually

# Time to reach users: Usually 1-5 seconds
```

### App crashed after update

```bash
# Rollback immediately
eas update:delete --update-id xxxxx

# Fix the bug
nano src/services/api.ts

# Deploy hotfix
eas update --channel production \
  --message "Rollback fix: Null check"
```

---

## 📊 What Changes Require What

| Change Type | APK Rebuild | OTA Update |
|-------------|-----------|-----------|
| Bug fix (logic) | ❌ | ✅ |
| UI change | ❌ | ✅ |
| API call change | ❌ | ✅ |
| Feature flag change | ❌ | ✅ |
| Dependency upgrade | ✅ | ❌ |
| New native module | ✅ | ❌ |
| Permission change | ✅ | ❌ |
| SDK version bump | ✅ | ❌ |

---

## ⚡ Performance Tips

### Fast Deployment

```bash
# Just push update (no message)
eas update --channel preview
# Result: Published in ~10 seconds

# With message (takes same time)
eas update --channel preview --message "Fix: X"
```

### Rollback Speed

```bash
# Delete update immediately if errors
eas update:delete --update-id xxxxx

# Users revert to previous on next startup
# No need to rebuild APK
# Users never see broken version
```

---

## 🎓 Example: Full Workflow

```bash
# 1. Start with base APK (already built and distributed)
# Testers have: v1.0.0, channel: preview

# 2. Day 1: Bug found, fix it
git add src/services/api.ts
git commit -m "Fix: HMAC timeout"

# 3. Deploy update
eas update --channel preview --message "Fixed HMAC timeout"

# 4. Testers get update automatically on next app start
# Testers see: v1.0.0 with updated code

# 5. QA approves, deploy to production
eas update --channel production --message "Fixed HMAC timeout"

# 6. Users get update automatically
# Users see: v1.0.0 with updated code

# 7. Monitor
eas update:list
# Shows: 2 updates (preview, production)

# 8. Repeat for next fix
# No new APK builds needed!
```

---

## 🚀 You're Ready!

Key Commands:
- Deploy: `eas update --channel preview`
- Monitor: `eas update:list`
- Rollback: `eas update:delete --update-id xxxxx`

That's it! 🎉
