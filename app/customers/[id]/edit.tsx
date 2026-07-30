/**
 * Edit Customer Screen
 *
 * Edit an existing customer using offline-first WatermelonDB writes.
 * Updates locally first, queues for sync, updates UI immediately.
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { isValidNigerianPhone } from '@/utils/phoneFormatter';
import { CustomerService } from '@/services/customerService';
import { useCustomerById } from '@/hooks/useCustomers';
import * as SecureStore from 'expo-secure-store';
import { initializeDatabase } from '@/db/database';

export default function EditCustomerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [userId, setUserId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [db, setDb] = useState<any>(null);

  // Initialize database and load user ID
  useEffect(() => {
    (async () => {
      const userId = await SecureStore.getItemAsync('userId');
      setUserId(userId);

      if (!db) {
        const database = await initializeDatabase();
        setDb(database);
      }
    })();
  }, []);

  // Load customer from WatermelonDB
  const customer = useCustomerById(db, id || null);

  // Populate form when customer loads
  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setPhone(customer.phone);
      setEmail(customer.email || '');
      setAddress(customer.address || '');
      setNotes(customer.notes || '');
    }
  }, [customer]);

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

  const handleSave = async () => {
    if (!validateForm() || !id || !userId) return;

    try {
      setIsSaving(true);

      if (!db) {
        Alert.alert('Error', 'Database not initialized');
        return;
      }

      const service = new CustomerService(db, userId);

      // Update customer locally (writes to WatermelonDB + queues operation)
      const result = await service.updateCustomer(id, {
        name,
        phone,
        email: email || undefined,
        address: address || undefined,
        notes: notes || undefined,
      });

      if (!result.success) {
        if (result.error?.includes('already exists')) {
          Alert.alert('Duplicate', 'Another customer has this phone number');
        } else {
          Alert.alert('Error', result.error || 'Failed to update customer');
        }
        return;
      }

      // Navigate back (local customer is now updated in WatermelonDB)
      router.back();
    } catch (error) {
      Alert.alert('Error', `Failed to update customer: ${String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!customer) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

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
        <Text style={{ marginLeft: 16, fontSize: 20, fontWeight: '700' }}>Edit Customer</Text>
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
          placeholder="Nigerian phone number"
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
          placeholder="Internal notes"
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
            onPress={handleSave}
            disabled={isSaving}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 6,
              backgroundColor: '#4CAF50',
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={{ textAlign: 'center', color: '#fff', fontWeight: '600' }}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
