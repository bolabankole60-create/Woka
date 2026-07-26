/**
 * Login Screen
 *
 * User authentication screen with email/password login.
 * On successful login, tokens are stored in SecureStore and user is redirected to dashboard.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { apiClient } from '@/services/api';

export const LoginScreen: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState('okafor.plumber@gmail.com');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Validate email format
   */
  const isValidEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  /**
   * Validate form inputs
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle login submission
   */
  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Call API to login (mock server will accept any credentials)
      const user = await apiClient.login(email, password);

      console.log('[Login] Success:', user.email);

      // Redirect to dashboard
      router.replace('/(tabs)');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      Alert.alert('Login Error', errorMessage);
      console.error('[Login] Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#ffffff' }}
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
    >
      {/* Logo/Header */}
      <View style={{ marginBottom: 40, alignItems: 'center' }}>
        <MaterialCommunityIcons name="hammer-wrench" size={64} color="#0066cc" />
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1a1a1a', marginTop: 12 }}>
          Tradify
        </Text>
        <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
          Artisan Marketplace
        </Text>
      </View>

      {/* Welcome Text */}
      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 20, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 }}>
          Welcome Back
        </Text>
        <Text style={{ fontSize: 14, color: '#666' }}>
          Sign in to manage your jobs and invoices
        </Text>
      </View>

      {/* Email Input */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 }}>
          Email Address
        </Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: errors.email ? '#dc3545' : '#ddd',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#fafafa',
          }}
        >
          <MaterialCommunityIcons name="email" size={20} color="#666" />
          <TextInput
            style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#1a1a1a' }}
            placeholder="your.email@example.com"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isLoading}
          />
        </View>
        {errors.email && (
          <Text style={{ fontSize: 12, color: '#dc3545', marginTop: 6 }}>
            {errors.email}
          </Text>
        )}
      </View>

      {/* Password Input */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 }}>
          Password
        </Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: errors.password ? '#dc3545' : '#ddd',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#fafafa',
          }}
        >
          <MaterialCommunityIcons name="lock" size={20} color="#666" />
          <TextInput
            style={{ flex: 1, marginLeft: 12, marginRight: 12, fontSize: 16, color: '#1a1a1a' }}
            placeholder="••••••••"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            editable={!isLoading}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <MaterialCommunityIcons
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        </View>
        {errors.password && (
          <Text style={{ fontSize: 12, color: '#dc3545', marginTop: 6 }}>
            {errors.password}
          </Text>
        )}
      </View>

      {/* Demo Credentials Info */}
      <View
        style={{
          backgroundColor: '#f0f7ff',
          borderLeftWidth: 4,
          borderLeftColor: '#0066cc',
          padding: 12,
          borderRadius: 4,
          marginBottom: 24,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#0066cc', marginBottom: 4 }}>
          Demo Credentials
        </Text>
        <Text style={{ fontSize: 12, color: '#666' }}>
          Email: okafor.plumber@gmail.com
        </Text>
        <Text style={{ fontSize: 12, color: '#666' }}>Password: password123</Text>
      </View>

      {/* Login Button */}
      <TouchableOpacity
        style={{
          backgroundColor: '#0066cc',
          borderRadius: 8,
          paddingVertical: 14,
          alignItems: 'center',
          marginBottom: 16,
          opacity: isLoading ? 0.6 : 1,
        }}
        onPress={handleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>Sign In</Text>
        )}
      </TouchableOpacity>

      {/* Signup Link */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 12 }}>
        <Text style={{ fontSize: 14, color: '#666' }}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#0066cc' }}>Sign up</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default LoginScreen;
