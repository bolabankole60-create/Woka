# Local Development Setup - Run Tradify/Woka Locally

**Get the app running on your device in 10 minutes**

---

## 📋 Prerequisites

Make sure you have installed:

```bash
# Node.js (v18+)
node --version
# Output should be: v18.13.0 or higher

# npm (v9+)
npm --version
# Output should be: v9.0.0 or higher

# Expo CLI
npm install -g eas-cli expo-cli
expo --version
# Output should be: Expo CLI version
```

If any are missing:
- **Node.js**: https://nodejs.org (Download v18 LTS)
- **Expo**: `npm install -g expo-cli`

---

## 🚀 Step 1: Navigate to Project Directory

```bash
cd C:\Users\HP-EliteBook\Tradify
# Or wherever your Tradify project is

# Verify you're in the right place
ls app/
# Should show: _layout.tsx, (auth)/, (tabs)/, etc.
```

---

## 📦 Step 2: Install Dependencies

```bash
# Install all npm packages
npm install

# This installs:
# - react-native
# - expo & expo-router
# - react-query (TanStack Query)
# - redux & redux-persist
# - expo-secure-store
# - expo-updates
# - And all other dependencies

# Takes 2-3 minutes on first install
```

**If you get errors:**
```bash
# Clear npm cache
npm cache clean --force

# Retry installation
npm install

# If still issues, try:
npm install --legacy-peer-deps
```

---

## ✅ Step 3: Verify Project Structure

Make sure these files exist:

```bash
# Check core files
ls -la app/_layout.tsx
ls -la app/(auth)/login.tsx
ls -la app/(auth)/register.tsx
ls -la app/(tabs)/index.tsx
ls -la app.json
ls -la eas.json

# All should exist with no errors
```

**If register.tsx is missing:**
```bash
# Copy it from the files we created
cp register.tsx app/(auth)/register.tsx
```

---

## 🎬 Step 4: Start Expo Dev Server

```bash
# Start the development server
npm start

# Output should show:
# ✔ Expo DevTools is running at http://localhost:19002
# 
# Android Emulator | Local | LAN | Tunnel
#
#  ↓ Press ? to see usage
```

**Keep this terminal open!** (Don't close it)

---

## 📱 Step 5: Open on Your Device

### **Option A: Emulator (Easiest)**

```bash
# In the running Expo terminal, press: a

# This opens Android Emulator
# Waits for build
# App opens automatically

# Time: 1-2 minutes
```

### **Option B: Physical Phone**

```bash
# Download "Expo Go" app
# iOS: App Store
# Android: Google Play Store

# In the running Expo terminal, press: i or s (depending on your phone)

# Scan the QR code with your phone
# (Android: Use Expo Go app to scan)
# (iOS: Use iPhone camera)

# App opens in Expo Go

# Time: 30 seconds
```

### **Option C: Web Preview (Limited)**

```bash
# In the running Expo terminal, press: w

# Opens web preview in browser
# Note: React Native doesn't run perfectly in browser
# But you can see the UI layout

# Time: 30 seconds
```

---

## 🧪 Step 6: Test the Registration Screen

Once the app opens:

```
1. You should see the LOGIN screen:
   ├─ Woka logo
   ├─ Email input
   ├─ Password input
   └─ [Login] [Register] buttons

2. Tap [Register] button
   ↓
   You should see STEP 1 (Personal Details):
   ├─ "Step 1 of 3: Your Details" header
   ├─ Full Name input (placeholder: "e.g., Chidike Okafor")
   ├─ Business Name input
   ├─ Phone Number input (with +234 formatting)
   ├─ Helper text: "Format: +234 801 234 5678"
   ├─ Progress bar at top (33% filled)
   └─ [Continue to Trade Selection] button

3. Enter test data:
   ├─ Full Name: "John Smith"
   ├─ Business Name: "Smith Plumbing"
   ├─ Phone: "08012345678"
      └─ Watch it auto-format to "+234 801 234 5678"
   └─ Tap [Continue]

4. You should see STEP 2 (Trade Selection):
   ├─ "Step 2 of 3: Select Your Trade" header
   ├─ Search box (try searching "elec")
   ├─ 2-column grid of 7 trades:
   │  ├─ ⚡ Electrician
   │  ├─ 🚰 Plumber
   │  ├─ 🔧 Auto Mechanic
   │  ├─ 🔨 Welder/Fabricator
   │  ├─ 🪵 Carpenter
   │  ├─ 🎨 Painter
   │  └─ ❄️ AC Technician
   ├─ Progress bar (66% filled)
   └─ Tap "Plumber" (shows blue border + checkmark)

5. Tap [Continue to Rates] button

6. You should see STEP 3 (Pricing):
   ├─ "Step 3 of 3: Set Your Rates" header
   ├─ Toggle buttons:
   │  ├─ [⏱️ Hourly Rate] (active - blue)
   │  └─ [📋 Fixed Fee]
   ├─ Input field: "Base Hourly Rate (₦)"
   ├─ Currency symbol: ₦
   ├─ Helper tip
   ├─ Summary card:
   │  ├─ Name: John Smith
   │  ├─ Business: Smith Plumbing
   │  ├─ Trade: Plumber
   │  └─ Rate: ₦[amount]/hour
   ├─ Progress bar (100% filled)
   └─ [Complete Registration ✓] button

7. Enter "5000" in rate field
   └─ Summary updates to "₦5000/hour"

8. Tap [Complete Registration ✓]
   ├─ Button shows loading spinner
   ├─ Waits 1.5 seconds
   ├─ Token stored securely
   └─ Navigate to Dashboard (you're now logged in! ✅)

9. You should see DASHBOARD:
   ├─ Welcome message
   ├─ Job cards
   ├─ Bottom navigation tabs
   └─ Everything working!
```

---

## 🔄 Live Editing (Hot Reload)

**Best part about Expo:** Changes appear instantly!

```bash
# 1. App is running
# 2. Edit any file (e.g., register.tsx)
# 3. Save the file
# 4. App updates automatically (within 1 second)
# 5. No need to restart

# Try it:
nano app/(auth)/register.tsx
# Change: "Step 1 of 3" to "Step 1 of 3: HELLO"
# Save file
# Watch phone - text updates instantly!
```

---

## 🐛 Troubleshooting

### Issue: "npm install" fails

```bash
# Try these steps in order:

# 1. Clear cache
npm cache clean --force

# 2. Delete node_modules
rm -rf node_modules
rm package-lock.json

# 3. Reinstall
npm install

# 4. If still failing, check Node version
node --version
# Should be 18+ (not 16 or older)

# 5. Last resort - use legacy peer deps
npm install --legacy-peer-deps
```

### Issue: Emulator doesn't open

```bash
# Option 1: Start emulator first
# Android Studio → AVD Manager → Start emulator

# Option 2: Use physical phone instead
# Download Expo Go app → Scan QR code

# Option 3: Try web preview
# In Expo terminal, press: w
```

### Issue: App doesn't load

```bash
# 1. Check Expo terminal for errors
# Read red error messages carefully

# 2. Try clearing cache and restarting
npm start -- --clear

# 3. Check if register.tsx is in correct location
ls app/(auth)/register.tsx

# 4. Check TypeScript errors
npm run type-check

# 5. Restart Expo terminal and device
# Press Ctrl+C in terminal
# Kill and restart emulator
# Run: npm start again
```

### Issue: Phone number not formatting

```bash
# 1. Check that you're typing in the Phone Number field
# 2. Try typing slowly: "0", "8", "0", "1"...
# 3. Watch it format in real-time to "+234 801..."
# 4. If not working, check register.tsx line ~350
#    Make sure handlePhoneChange is connected to TextInput
```

### Issue: Can't navigate to dashboard after registration

```bash
# The mock registration should work immediately
# If it hangs on "loading spinner":

# 1. Check Expo terminal for errors
# 2. Wait 2-3 seconds (mock delay is 1.5s)
# 3. If still stuck, press back and try again
# 4. Check that (tabs) layout exists
#    ls app/(tabs)/_layout.tsx
```

---

## 📊 What to Test

### ✅ Manual Testing Checklist

```bash
☐ App starts and shows Login screen
☐ Tap Register button → See Step 1
☐ Enter name and business → No errors
☐ Type phone "08012345678" → Auto-formats to "+234 801 234 5678"
☐ Leave phone blank → Try to continue → See error
☐ Fill all Step 1 fields → Click Continue → See Step 2
☐ Step 2 shows 7 trade cards in 2-column grid
☐ Click trade → Blue border + checkmark appears
☐ Search "plumb" → Only shows Plumber
☐ Click trade → Click Continue → See Step 3
☐ Step 3 shows hourly/fixed toggle
☐ Click "Fixed Fee" → Input changes to "Project Fee"
☐ Click "Hourly Rate" → Input changes to hourly
☐ Enter rate "5000" → Summary updates
☐ Click "Complete Registration" → Loading spinner shows
☐ After 1.5s → Navigate to Dashboard
☐ Dashboard shows welcome message → Success! ✅
```

---

## 🚀 Common Development Commands

```bash
# Start dev server
npm start

# Start with cleared cache
npm start -- --clear

# Type checking
npm run type-check

# Lint code
npm run lint

# View Expo configuration
expo config

# Build production APK (later)
eas build --platform android --profile preview --wait

# Deploy OTA update (later)
eas update --channel preview
```

---

## 💡 Tips for Development

### 1. Use Physical Phone (Recommended)

```
Advantages:
✓ See real UI rendering
✓ Test touch interactions
✓ See actual screen sizes
✓ Test on real network (3G/4G)

How:
- Download Expo Go app
- When you see QR code, scan it
- App opens instantly on your phone
```

### 2. Keep Dev Tools Open

```bash
# In same directory, open second terminal
expo-cli logs

# Shows real-time logs from app
# Helps debug issues
```

### 3. Edit Files with Hot Reload

```bash
# Changes appear instantly (usually)
# If not, refresh manually:
# - Android: Shake phone → Tap "Reload"
# - iOS: Shake phone → Tap "Reload"
# - Emulator: Ctrl+R or Cmd+R
```

### 4. Test Different Scenarios

```bash
# Try invalid data:
- Phone: "123" → Error (too short)
- Phone: "12345678901234" → Error (too long)
- Name: "" → Error (required)

# Try edge cases:
- Phone: "0801234567" → "+234 801 234 567" ✓
- Phone: "2348012345678" → "+234 801 234 5678" ✓
```

---

## 📋 Final Checklist

Before showing to QA:

```bash
☐ npm install completed without errors
☐ npm start shows "Expo DevTools is running"
☐ App opens on emulator or phone
☐ Login screen displays
☐ Register button navigates to Step 1
☐ Step 1 form fills and validates
☐ Phone formats automatically
☐ Step 2 shows trade grid
☐ Trade selection works
☐ Step 3 shows pricing
☐ Registration completes
☐ Dashboard loads after registration
☐ No console errors in Expo terminal
☐ No red error screens on device
```

---

## 🎉 You're Ready!

Everything is set up to run locally. Just:

```bash
cd C:\Users\HP-EliteBook\Tradify
npm install
npm start
```

Then open on your phone/emulator and test!

**Questions?** Check the Troubleshooting section above, or run:
```bash
expo doctor
# Shows any setup issues
```

---

**Happy testing!** 🚀

See the registration screen live on your device! 📱
