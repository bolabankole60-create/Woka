/**
 * Customer Details Screen
 *
 * View/edit customer details using offline-first WatermelonDB.
 * Features:
 * - View customer info from local database
 * - Archive/restore customer locally with sync
 * - Call and WhatsApp actions
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams, Href } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCustomerById } from '@/hooks/useCustomers';
import { useSyncAfterMutation } from '@/hooks/useSync';
import { initializeDatabase } from '@/db/database';
import { CustomerService } from '@/services/customerService';
import * as SecureStore from 'expo-secure-store';
import type { Database } from '@nozbe/watermelondb';

export default function CustomerDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [db, setDb] = useState<Database | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const syncAfterMutation = useSyncAfterMutation(db);

  // Initialize database and user
  useEffect(() => {
    (async () => {
      const uid = await SecureStore.getItemAsync('userId');
      if (uid) setUserId(uid);

      if (!db) {
        const database = await initializeDatabase();
        setDb(database);
      }
    })();
  }, [db]);

  // Load customer from WatermelonDB
  const customer = useCustomerById(db, id || null);

  const handleArchive = async () => {
    if (!customer || !db || !userId) return;

    Alert.alert('Archive Customer', 'This customer will be archived.', [
      { text: 'Cancel' },
      {
        text: 'Archive',
        onPress: async () => {
          try {
            setIsProcessing(true);
            const service = new CustomerService(db, userId);
            const result = await service.archiveCustomer(customer.id);

            if (result.success) {
              Alert.alert('Success', 'Customer archived');
              await syncAfterMutation(customer.id);
            } else {
              Alert.alert('Error', result.error || 'Failed to archive');
            }
          } catch (error) {
            Alert.alert('Error', String(error));
          } finally {
            setIsProcessing(false);
          }
        },
      },
    ]);
  };

  const handleRestore = async () => {
    if (!customer || !db || !userId) return;

    try {
      setIsProcessing(true);
      const service = new CustomerService(db, userId);
      const result = await service.restoreCustomer(customer.id);

      if (result.success) {
        Alert.alert('Success', 'Customer restored');
      } else {
        Alert.alert('Error', result.error || 'Failed to restore');
      }
    } catch (error) {
      Alert.alert('Error', String(error));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCall = () => {
    if (!customer) return;
    Linking.openURL(`tel:${customer.normalizedPhone}`);
  };

  const handleWhatsApp = () => {
    if (!customer) return;
    const phone = customer.normalizedPhone.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/${phone}`);
  };

  if (!customer) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }} contentContainerStyle={{ paddingBottom: 30 }}>
      {/* Header */}
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={{ marginTop: 12, fontSize: 22, fontWeight: '700', marginBottom: 4 }}>{customer.name}</Text>
        {customer.isArchived && <Text style={{ color: '#ff9800', fontSize: 12 }}>Archived</Text>}
      </View>

      {/* Contact Info */}
      <View style={{ backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 12, borderRadius: 8, padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <MaterialCommunityIcons name="phone" size={20} color="#4CAF50" />
          <Text style={{ marginLeft: 12, fontSize: 16, flex: 1 }}>{customer.phone}</Text>
        </View>
        {customer.email && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <MaterialCommunityIcons name="email" size={20} color="#4CAF50" />
            <Text style={{ marginLeft: 12, fontSize: 14, flex: 1 }}>{customer.email}</Text>
          </View>
        )}
        {customer.address && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <MaterialCommunityIcons name="map-marker" size={20} color="#4CAF50" style={{ marginRight: 12 }} />
            <Text style={{ fontSize: 14, flex: 1 }}>{customer.address}</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={handleCall} style={{ flex: 1, paddingVertical: 12, borderRadius: 6, backgroundColor: '#4CAF50' }}>
            <MaterialCommunityIcons name="phone" size={20} color="#fff" style={{ textAlign: 'center' }} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleWhatsApp} style={{ flex: 1, paddingVertical: 12, borderRadius: 6, backgroundColor: '#25D366' }}>
            <MaterialCommunityIcons name="whatsapp" size={20} color="#fff" style={{ textAlign: 'center' }} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {
            router.push(`/customers/${customer.id}/edit` as Href);
          }} style={{ flex: 1, paddingVertical: 12, borderRadius: 6, backgroundColor: '#2196F3' }}>
            <MaterialCommunityIcons name="pencil" size={20} color="#fff" style={{ textAlign: 'center' }} />
          </TouchableOpacity>
        </View>

        {customer.isArchived ? (
          <TouchableOpacity onPress={handleRestore} disabled={isProcessing} style={{ paddingVertical: 12, borderRadius: 6, backgroundColor: '#FF9800' }}>
            <Text style={{ textAlign: 'center', color: '#fff', fontWeight: '600' }}>Restore</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleArchive} disabled={isProcessing} style={{ paddingVertical: 12, borderRadius: 6, borderWidth: 1, borderColor: '#FF5252' }}>
            <Text style={{ textAlign: 'center', color: '#FF5252', fontWeight: '600' }}>Archive</Text>
          </TouchableOpacity>
        )}
      </View>

      {customer.notes && (
        <View style={{ backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 12, borderRadius: 8, padding: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 8 }}>Notes</Text>
          <Text style={{ fontSize: 14, color: '#333' }}>{customer.notes}</Text>
        </View>
      )}
    </ScrollView>
  );
}
