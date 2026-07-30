/**
 * New Customer Screen
 *
 * Create a new customer using offline-first WatermelonDB writes.
 * Saves locally first, queues for sync, navigates immediately.
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { isValidNigerianPhone } from '@/utils/phoneFormatter';
import { CustomerService } from '@/services/customerService';
import { useSyncAfterMutation } from '@/hooks/useSync';
import { initializeDatabase } from '@/db/database';
import * as SecureStore from 'expo-secure-store';
import type { Database } from '@nozbe/watermelondb';

export default function NewCustomerScreen() {
  const router = useRouter();

  const [db, setDb] = useState<Database | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const syncAfterMutation = useSyncAfterMutation(db);

  // Initialize database
  useEffect(() => {
    if (!db) {
      initializeDatabase().then(setDb).catch(console.error);
    }
  }, [db]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (!isValidNigerianPhone(phone)) {
      newErrors.phone = 'Invalid Nigerian phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);

      if (!db) {
        Alert.alert('Error', 'Database not initialized');
        return;
      }

      // Get authenticated user ID
      const userId = await SecureStore.getItemAsync('userId');
      if (!userId) {
        Alert.alert('Error', 'Not authenticated');
        return;
      }

      // Create service
      const service = new CustomerService(db, userId);

      // Create customer locally (writes to WatermelonDB + queues operation)
      const result = await service.createCustomer({
        name,
        phone,
        email: email || undefined,
        address: address || undefined,
        notes: notes || undefined,
      });

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to create customer');
        return;
      }

      // Navigate to details screen and sync in background
      const customerId = result.data.id;
      router.replace(`/customers/${customerId}` as Href);
      await syncAfterMutation(customerId);
    } catch (error) {
      Alert.alert('Error', `Failed to create customer: ${String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f5f5f5' }}
      contentContainerStyle={{ paddingBottom: 30 }}
    >
      {/* Header */}
      <View
        style={{
          backgroundColor: '#fff',
          paddingHorizontal: 16,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#eee',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={{ marginLeft: 16, fontSize: 20, fontWeight: '700' }}>New Customer</Text>
      </View>

      {/* Form */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
        {/* Name */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 }}>
          Name *
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Customer name"
          style={{
            backgroundColor: '#fff',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 6,
            marginBottom: 12,
            borderWidth: errors.name ? 1 : 0,
            borderColor: errors.name ? '#ff5252' : undefined,
          }}
        />
        {errors.name && <Text style={{ color: '#ff5252', fontSize: 12, marginBottom: 8 }}>{errors.name}</Text>}

        {/* Phone */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 }}>
          Phone *
        </Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="e.g. 0701234567 or +2347012345678"
          keyboardType="phone-pad"
          style={{
            backgroundColor: '#fff',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 6,
            marginBottom: 12,
            borderWidth: errors.phone ? 1 : 0,
            borderColor: errors.phone ? '#ff5252' : undefined,
          }}
        />
        {errors.phone && <Text style={{ color: '#ff5252', fontSize: 12, marginBottom: 8 }}>{errors.phone}</Text>}

        {/* Email */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 }}>
          Email (Optional)
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="customer@example.com"
          keyboardType="email-address"
          style={{
            backgroundColor: '#fff',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 6,
            marginBottom: 12,
          }}
        />

        {/* Address */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 }}>
          Address (Optional)
        </Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="Customer address"
          multiline
          numberOfLines={3}
          style={{
            backgroundColor: '#fff',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 6,
            marginBottom: 12,
          }}
        />

        {/* Notes */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 }}>
          Notes (Optional)
        </Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Internal notes about this customer"
          multiline
          numberOfLines={3}
          style={{
            backgroundColor: '#fff',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 6,
            marginBottom: 20,
          }}
        />

        {/* Buttons */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: '#ddd',
            }}
          >
            <Text style={{ textAlign: 'center', color: '#666', fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCreate}
            disabled={isLoading}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 6,
              backgroundColor: '#4CAF50',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={{ textAlign: 'center', color: '#fff', fontWeight: '600' }}>
                Create Customer
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
