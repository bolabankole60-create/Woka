/**
 * Customers List Screen
 *
 * Displays all customers for the authenticated artisan using offline-first WatermelonDB.
 * Features:
 * - Reactive list from WatermelonDB
 * - Search by name or phone (local)
 * - Filter by archive status
 * - Create new customer
 * - View/edit customer details
 * - Manual sync trigger
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { initializeDatabase } from '@/db/database';
import { useSearchCustomers } from '@/hooks/useCustomers';
import { useManualSync } from '@/hooks/useSync';
import { formatPhoneDisplay } from '@/utils/formatting';
import * as SecureStore from 'expo-secure-store';
import type Customer from '@/models/Customer';
import type { Database } from '@nozbe/watermelondb';

export default function CustomersScreen() {
  const router = useRouter();
  const [db, setDb] = useState<Database | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const { isLoading: isSyncing, syncNow } = useManualSync(db);

  // Initialize database and load user ID
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

  // Load customers from WatermelonDB reactively
  const customers = useSearchCustomers(db, userId, search, showArchived);

  const handleAddCustomer = () => {
    router.push('/customers/new' as Href);
  };

  const handleEditCustomer = (customerId: string) => {
    router.push(`/customers/${customerId}` as Href);
  };

  const handleRefresh = async () => {
    await syncNow();
  };

  const renderCustomerItem = ({ item }: { item: Customer }) => (
    <TouchableOpacity
      onPress={() => handleEditCustomer(item.id)}
      style={{
        backgroundColor: '#fff',
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: item.isArchived ? '#ccc' : '#4CAF50',
        opacity: item.isArchived ? 0.6 : 1,
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: '600',
          color: item.isArchived ? '#999' : '#000',
          marginBottom: 8,
        }}
      >
        {item.name}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <MaterialCommunityIcons name="phone" size={14} color="#666" />
        <Text style={{ marginLeft: 8, color: '#666', fontSize: 14 }}>
          {formatPhoneDisplay(item.phone)}
        </Text>
      </View>

      {item.email && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <MaterialCommunityIcons name="email" size={14} color="#666" />
          <Text style={{ marginLeft: 8, color: '#666', fontSize: 14 }}>{item.email}</Text>
        </View>
      )}

      {item.address && (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons name="map-marker" size={14} color="#666" />
          <Text style={{ marginLeft: 8, color: '#666', fontSize: 12 }} numberOfLines={1}>
            {item.address}
          </Text>
        </View>
      )}

      {item.isArchived && (
        <Text
          style={{
            marginTop: 8,
            fontSize: 12,
            color: '#ff9800',
            fontWeight: '500',
          }}
        >
          Archived
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: '#fff',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#eee',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 24, fontWeight: '700', flex: 1 }}>Customers</Text>
          <TouchableOpacity
            onPress={handleAddCustomer}
            style={{
              backgroundColor: '#4CAF50',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 6,
            }}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <TextInput
          placeholder="Search by name, phone, email..."
          value={search}
          onChangeText={setSearch}
          style={{
            backgroundColor: '#f0f0f0',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 6,
            fontSize: 14,
            marginBottom: 8,
          }}
          placeholderTextColor="#999"
        />

        {/* Archive Filter */}
        <TouchableOpacity
          onPress={() => setShowArchived(!showArchived)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 8,
            paddingVertical: 6,
          }}
        >
          <MaterialCommunityIcons
            name={showArchived ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={18}
            color={showArchived ? '#4CAF50' : '#999'}
          />
          <Text style={{ marginLeft: 8, color: showArchived ? '#4CAF50' : '#999' }}>
            Show Archived Only
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {!customers ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={{ marginTop: 16, fontSize: 14, color: '#999' }}>Loading customers...</Text>
        </View>
      ) : customers.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <MaterialCommunityIcons name="account-group-outline" size={48} color="#ccc" />
          <Text style={{ marginTop: 16, fontSize: 16, color: '#999' }}>
            {search || showArchived ? 'No customers found' : 'No customers yet'}
          </Text>
          {!search && !showArchived && (
            <TouchableOpacity
              onPress={handleAddCustomer}
              style={{ marginTop: 20, paddingHorizontal: 20, paddingVertical: 10 }}
            >
              <Text style={{ color: '#4CAF50', fontSize: 16, fontWeight: '600' }}>
                Add Your First Customer
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={customers}
          renderItem={renderCustomerItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isSyncing}
              onRefresh={handleRefresh}
            />
          }
          contentContainerStyle={{ paddingVertical: 12 }}
        />
      )}
    </View>
  );
}
