/**
 * Auth Layout
 *
 * Stack layout for authentication screens (login, signup).
 * Shown to unauthenticated users before they can access the main app.
 */

import React from 'react';
import { Stack } from 'expo-router';

export const AuthLayout: React.FC = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Login screen (first screen) */}
      <Stack.Screen
        name="login"
        options={{
          title: 'Login',
        }}
      />

      {/* Signup screen (optional) */}
      <Stack.Screen
        name="signup"
        options={{
          title: 'Create Account',
        }}
      />
    </Stack>
  );
};

export default AuthLayout;
