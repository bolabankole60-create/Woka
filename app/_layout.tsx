/**
 * Root Layout Component
 *
 * Sets up global providers and handles authentication routing.
 * - TanStack Query for server state & sync
 * - WatermelonDB provider for local database
 * - SafeAreaProvider for edge-to-edge layout
 * - Authentication check and conditional routing
 */

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';

// Services
import { initializeAPI } from '@/services/api';
import { initializeDatabase } from '@/db/database';
import { useAutomaticSync } from '@/hooks/useSync';

// Types
interface RootLayoutProps {}

// Create a client for TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
    mutations: {
      retry: 1,
    },
  },
});

/**
 * RootLayout Component
 *
 * Provides global context and handles routing based on auth state.
 * Flow:
 * 1. Initialize API client and restore tokens
 * 2. Check authentication status
 * 3. Redirect to auth or main app based on auth state
 */
export const RootLayout: React.FC<RootLayoutProps> = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [db, setDb] = useState<any>(null);
  const router = useRouter();
  const segments = useSegments();

  /**
   * Initialize app: restore tokens, check auth status, initialize database
   */
  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize API client and restore tokens from SecureStore
        await initializeAPI();

        // Initialize WatermelonDB
        const database = await initializeDatabase();
        setDb(database);

        // Check if we have a valid token
        const token = await SecureStore.getItemAsync('accessToken');
        const isAuth = !!token;

        setIsAuthenticated(isAuth);
        console.log(`[Auth] User is ${isAuth ? 'authenticated' : 'not authenticated'}`);
      } catch (error) {
        console.error('[Auth] Initialization error:', error);
        setIsAuthenticated(false);
      } finally {
        setIsInitialized(true);
      }
    };

    initialize();
  }, []);

  /**
   * Mount automatic sync when database is ready and user is authenticated
   */
  useAutomaticSync(isAuthenticated ? db : null);

  /**
   * Handle routing based on authentication state
   * This runs after isInitialized and isAuthenticated are set
   */
  useEffect(() => {
    if (!isInitialized) return; // Wait for initialization

    // Determine which route we're currently on
    const inAuthGroup = segments[0] === '(auth)';

    /**
     * Redirect logic:
     * - If authenticated AND in auth group → go to dashboard
     * - If not authenticated AND NOT in auth group → go to login
     */
    if (isAuthenticated && inAuthGroup) {
      // User logged in, redirect away from auth
      router.replace('/(tabs)');
    } else if (!isAuthenticated && !inAuthGroup) {
      // User not logged in, redirect to auth
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isInitialized, segments]);

  /**
   * Show loading screen while initializing
   */
  if (!isInitialized) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#ffffff',
        }}
      >
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  /**
   * Render app with providers
   * TanStack Query → SafeAreaProvider → Slot (route content)
   */
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Slot />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
};

export default RootLayout;
