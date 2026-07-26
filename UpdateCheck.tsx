/**
 * UpdateCheck.tsx
 *
 * Over-The-Air (OTA) Update Handler Component
 *
 * Silently checks for updates on app startup using expo-updates.
 * Downloads updates in background and notifies user when ready.
 *
 * Features:
 * - Automatic check on app startup
 * - Silent background download
 * - Non-intrusive notification banner
 * - Instant reload capability
 * - Network resilience (fallback to cache)
 * - Nigerian network friendly (3 second timeout)
 *
 * Usage:
 * 1. Add <UpdateCheck /> to your root layout (_layout.tsx)
 * 2. Place near top of component tree
 * 3. No props required
 * 4. Runs automatically in background
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  AppState,
  AppStateStatus,
} from 'react-native';
import * as Updates from 'expo-updates';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface UpdateState {
  isAvailable: boolean;
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
}

// ============================================================================
// UPDATE CHECK COMPONENT
// ============================================================================

export function UpdateCheck() {
  // ======================================================================
  // STATE MANAGEMENT
  // ======================================================================

  // Track update availability and loading state
  const [updateState, setUpdateState] = useState<UpdateState>({
    isAvailable: false,
    isLoading: false,
    hasError: false,
  });

  // Reference to prevent duplicate check requests
  const isCheckingRef = useRef(false);

  // Track app state (foreground/background)
  const appState = useRef(AppState.currentState);

  // ======================================================================
  // EFFECT 1: CHECK FOR UPDATES ON APP START
  // ======================================================================

  useEffect(() => {
    // Check for updates when component mounts (app starts)
    checkForUpdates();

    // Setup listener for app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      // Cleanup listener on unmount
      subscription.remove();
    };
  }, []);

  // ======================================================================
  // EFFECT 2: AUTO-DOWNLOAD UPDATE IF AVAILABLE
  // ======================================================================

  useEffect(() => {
    // If update found, silently download in background
    if (updateState.isAvailable && !updateState.isLoading) {
      downloadUpdate();
    }
  }, [updateState.isAvailable]);

  // ======================================================================
  // FUNCTION: CHECK FOR UPDATES
  // ======================================================================

  const checkForUpdates = async () => {
    // Prevent duplicate checks
    if (isCheckingRef.current) {
      return;
    }

    isCheckingRef.current = true;

    try {
      // Query Expo servers for available updates
      // This checks the channel specified in app.json
      // Respects fallbackToCacheTimeout (3 seconds)
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        // Update found on remote server
        console.log('✅ Update available:', {
          manifestId: update.manifest?.id,
          runtimeVersion: update.manifest?.runtimeVersion,
        });

        // Set state to show notification banner
        setUpdateState({
          isAvailable: true,
          isLoading: false,
          hasError: false,
        });
      } else {
        // App is up to date
        console.log('✅ App is up to date');

        setUpdateState({
          isAvailable: false,
          isLoading: false,
          hasError: false,
        });
      }
    } catch (error) {
      // Handle errors (network timeout, Expo server down, etc.)
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error checking for updates';

      console.warn('⚠️ Update check failed:', errorMessage);

      // Log error but don't block app functionality
      // This is important for poor network conditions
      setUpdateState({
        isAvailable: false,
        isLoading: false,
        hasError: true,
        errorMessage,
      });
    } finally {
      isCheckingRef.current = false;
    }
  };

  // ======================================================================
  // FUNCTION: DOWNLOAD UPDATE IN BACKGROUND
  // ======================================================================

  const downloadUpdate = async () => {
    // Prevent download if already downloading
    if (updateState.isLoading) {
      return;
    }

    setUpdateState((prev) => ({
      ...prev,
      isLoading: true,
    }));

    try {
      // Download update from Expo servers
      // Progress is silent (no callback to user)
      // Typical size: 10-20MB over 3G
      await Updates.fetchUpdateAsync();

      console.log('✅ Update downloaded successfully');

      // Update downloaded and ready to apply
      setUpdateState({
        isAvailable: true,
        isLoading: false,
        hasError: false,
      });

      // Show banner with "Tap to reload" button
      // User can choose when to reload (non-intrusive)
    } catch (error) {
      // Download failed (network error, space issue, etc.)
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error downloading update';

      console.warn('⚠️ Update download failed:', errorMessage);

      setUpdateState({
        isAvailable: false,
        isLoading: false,
        hasError: true,
        errorMessage,
      });
    }
  };

  // ======================================================================
  // FUNCTION: RELOAD APP WITH NEW UPDATE
  // ======================================================================

  const reloadApp = async () => {
    try {
      console.log('🔄 Reloading app with new update...');

      // Replace current JavaScript bundle with downloaded update
      // User sees loading screen briefly
      // App restarts with new code
      await Updates.reloadAsync();
    } catch (error) {
      // Reload failed (critical error)
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error reloading app';

      console.error('❌ Failed to reload app:', errorMessage);

      Alert.alert('Update Error', 'Could not apply update. Please restart the app manually.');
    }
  };

  // ======================================================================
  // FUNCTION: HANDLE APP STATE CHANGES
  // ======================================================================

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    // When app comes to foreground (user returns from another app)
    // Check for updates again
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      console.log('📱 App returned to foreground, checking for updates...');
      checkForUpdates();
    }

    appState.current = nextAppState;
  };

  // ======================================================================
  // RENDER: UPDATE NOTIFICATION BANNER
  // ======================================================================

  // Only show banner if update available and downloaded
  if (!updateState.isAvailable) {
    return null; // Render nothing (no notification)
  }

  return (
    <View style={styles.bannerContainer}>
      {/* Status indicator */}
      <View style={styles.statusIndicator} />

      {/* Message and action button */}
      <View style={styles.contentContainer}>
        <Text style={styles.bannerText}>
          {updateState.isLoading
            ? '⏳ Downloading update...'
            : '✅ New version available! Tap to update your pricing catalog.'}
        </Text>
      </View>

      {/* Reload button */}
      {!updateState.isLoading && (
        <TouchableOpacity
          style={styles.reloadButton}
          onPress={reloadApp}
          activeOpacity={0.7}
        >
          <Text style={styles.reloadButtonText}>Reload</Text>
        </TouchableOpacity>
      )}

      {/* Dismiss button (optional) */}
      {!updateState.isLoading && (
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={() =>
            setUpdateState({
              isAvailable: false,
              isLoading: false,
              hasError: false,
            })
          }
          activeOpacity={0.7}
        >
          <Text style={styles.dismissButtonText}>Later</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================================
// STYLING
// ============================================================================

const styles = StyleSheet.create({
  // Main banner container
  // Positioned at top of screen, below status bar
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9', // Light green background
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#4CAF50', // Green border
    gap: 12,
  },

  // Green indicator dot
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50', // Green
  },

  // Text and button container
  contentContainer: {
    flex: 1,
  },

  // Banner message text
  bannerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1B5E20', // Dark green
    lineHeight: 20,
  },

  // "Reload" button
  reloadButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },

  reloadButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // "Later" button
  dismissButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  dismissButtonText: {
    color: '#1B5E20',
    fontSize: 13,
    fontWeight: '500',
  },
});

export default UpdateCheck;
