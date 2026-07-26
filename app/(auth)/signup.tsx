/**
 * Signup Screen
 *
 * User registration screen for new artisans.
 * Collects personal, contact, and business information.
 * On successful signup, tokens are stored and user is redirected to dashboard.
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
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { apiClient } from '@/services/api';

export const SignupScreen: React.FC = () => {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [trade, setTrade] = useState('plumber');
  const [state, setState] = useState('Lagos');
  const [city, setCity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isValidEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const isValidPhone = (value: string): boolean => {
    const phoneRegex = /^[0-9]{10,15}$/;
    return phoneRegex.test(value.replace(/\D/g, ''));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!isValidPhone(phone)) {
      newErrors.phone = 'Invalid phone number';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!city.trim()) {
      newErrors.city = 'City is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const user = await apiClient.signup({
        firstName,
        lastName,
        email,
        phone,
        password,
        role: 'artisan',
        trade,
        state,
        city,
      });

      console.log('[Signup] Success:', user.email);

      router.replace('/(tabs)');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Signup failed';
      Alert.alert('Signup Error', errorMessage);
      console.error('[Signup] Error:', error);
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
      <View style={{ marginBottom: 24, alignItems: 'center' }}>
        <MaterialCommunityIcons name="hammer-wrench" size={48} color="#0066cc" />
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', marginTop: 8 }}>
          Join Tradify
        </Text>
        <Text style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
          Register as an artisan
        </Text>
      </View>

      {/* First Name Input */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginBottom: 6 }}>
          First Name
        </Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: errors.firstName ? '#dc3545' : '#ddd',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#fafafa',
          }}
        >
          <MaterialCommunityIcons name="account" size={18} color="#666" />
          <TextInput
            style={{ flex: 1, marginLeft: 10, fontSize: 15, color: '#1a1a1a' }}
            placeholder="Your first name"
            placeholderTextColor="#999"
            value={firstName}
            onChangeText={setFirstName}
            editable={!isLoading}
          />
        </View>
        {errors.firstName && (
          <Text style={{ fontSize: 11, color: '#dc3545', marginTop: 4 }}>
            {errors.firstName}
          </Text>
        )}
      </View>

      {/* Last Name Input */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginBottom: 6 }}>
          Last Name
        </Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: errors.lastName ? '#dc3545' : '#ddd',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#fafafa',
          }}
        >
          <MaterialCommunityIcons name="account" size={18} color="#666" />
          <TextInput
            style={{ flex: 1, marginLeft: 10, fontSize: 15, color: '#1a1a1a' }}
            placeholder="Your last name"
            placeholderTextColor="#999"
            value={lastName}
            onChangeText={setLastName}
            editable={!isLoading}
          />
        </View>
        {errors.lastName && (
          <Text style={{ fontSize: 11, color: '#dc3545', marginTop: 4 }}>
            {errors.lastName}
          </Text>
        )}
      </View>

      {/* Email Input */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginBottom: 6 }}>
          Email Address
        </Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: errors.email ? '#dc3545' : '#ddd',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#fafafa',
          }}
        >
          <MaterialCommunityIcons name="email" size={18} color="#666" />
          <TextInput
            style={{ flex: 1, marginLeft: 10, fontSize: 15, color: '#1a1a1a' }}
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
          <Text style={{ fontSize: 11, color: '#dc3545', marginTop: 4 }}>
            {errors.email}
          </Text>
        )}
      </View>

      {/* Phone Input */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginBottom: 6 }}>
          Phone Number
        </Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: errors.phone ? '#dc3545' : '#ddd',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#fafafa',
          }}
        >
          <MaterialCommunityIcons name="phone" size={18} color="#666" />
          <TextInput
            style={{ flex: 1, marginLeft: 10, fontSize: 15, color: '#1a1a1a' }}
            placeholder="+234XXXXXXXXXX"
            placeholderTextColor="#999"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={!isLoading}
          />
        </View>
        {errors.phone && (
          <Text style={{ fontSize: 11, color: '#dc3545', marginTop: 4 }}>
            {errors.phone}
          </Text>
        )}
      </View>

      {/* Trade Picker */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginBottom: 6 }}>
          Trade/Profession
        </Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 8,
            overflow: 'hidden',
            backgroundColor: '#fafafa',
          }}
        >
          <Picker
            selectedValue={trade}
            onValueChange={setTrade}
            enabled={!isLoading}
          >
            <Picker.Item label="Plumber" value="plumber" />
            <Picker.Item label="Electrician" value="electrician" />
            <Picker.Item label="Carpenter" value="carpenter" />
            <Picker.Item label="Painter" value="painter" />
            <Picker.Item label="Welder" value="welder" />
            <Picker.Item label="Mechanic" value="mechanic" />
            <Picker.Item label="Mason" value="mason" />
            <Picker.Item label="Other" value="other" />
          </Picker>
        </View>
      </View>

      {/* State Picker */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginBottom: 6 }}>
          State
        </Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 8,
            overflow: 'hidden',
            backgroundColor: '#fafafa',
          }}
        >
          <Picker
            selectedValue={state}
            onValueChange={setState}
            enabled={!isLoading}
          >
            <Picker.Item label="Lagos" value="Lagos" />
            <Picker.Item label="Abuja" value="Abuja" />
            <Picker.Item label="Rivers" value="Rivers" />
            <Picker.Item label="Kano" value="Kano" />
            <Picker.Item label="Edo" value="Edo" />
            <Picker.Item label="Enugu" value="Enugu" />
            <Picker.Item label="Other" value="Other" />
          </Picker>
        </View>
      </View>

      {/* City Input */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginBottom: 6 }}>
          City
        </Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: errors.city ? '#dc3545' : '#ddd',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#fafafa',
          }}
        >
          <MaterialCommunityIcons name="map-marker" size={18} color="#666" />
          <TextInput
            style={{ flex: 1, marginLeft: 10, fontSize: 15, color: '#1a1a1a' }}
            placeholder="Your city"
            placeholderTextColor="#999"
            value={city}
            onChangeText={setCity}
            editable={!isLoading}
          />
        </View>
        {errors.city && (
          <Text style={{ fontSize: 11, color: '#dc3545', marginTop: 4 }}>
            {errors.city}
          </Text>
        )}
      </View>

      {/* Password Input */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginBottom: 6 }}>
          Password
        </Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: errors.password ? '#dc3545' : '#ddd',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#fafafa',
          }}
        >
          <MaterialCommunityIcons name="lock" size={18} color="#666" />
          <TextInput
            style={{ flex: 1, marginLeft: 10, marginRight: 10, fontSize: 15, color: '#1a1a1a' }}
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
              size={18}
              color="#666"
            />
          </TouchableOpacity>
        </View>
        {errors.password && (
          <Text style={{ fontSize: 11, color: '#dc3545', marginTop: 4 }}>
            {errors.password}
          </Text>
        )}
      </View>

      {/* Confirm Password Input */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginBottom: 6 }}>
          Confirm Password
        </Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: errors.confirmPassword ? '#dc3545' : '#ddd',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#fafafa',
          }}
        >
          <MaterialCommunityIcons name="lock-check" size={18} color="#666" />
          <TextInput
            style={{ flex: 1, marginLeft: 10, marginRight: 10, fontSize: 15, color: '#1a1a1a' }}
            placeholder="••••••••"
            placeholderTextColor="#999"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            editable={!isLoading}
          />
        </View>
        {errors.confirmPassword && (
          <Text style={{ fontSize: 11, color: '#dc3545', marginTop: 4 }}>
            {errors.confirmPassword}
          </Text>
        )}
      </View>

      {/* Signup Button */}
      <TouchableOpacity
        style={{
          backgroundColor: '#0066cc',
          borderRadius: 8,
          paddingVertical: 12,
          alignItems: 'center',
          marginBottom: 12,
          opacity: isLoading ? 0.6 : 1,
        }}
        onPress={handleSignup}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>Create Account</Text>
        )}
      </TouchableOpacity>

      {/* Login Link */}
      <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
        <Text style={{ fontSize: 13, color: '#666' }}>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#0066cc' }}>Sign in</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default SignupScreen;
