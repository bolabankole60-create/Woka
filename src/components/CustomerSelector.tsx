/**
 * Customer Selector Component
 * Displays list of customers with search capability for selection
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Database } from '@nozbe/watermelondb';

interface CustomerSelectorProps {
  db: Database | null;
  selectedCustomerId: string | null;
  onSelect: (customerId: string | null) => void;
  placeholder?: string;
}

export function CustomerSelector({ db, selectedCustomerId, onSelect, placeholder = 'Select Customer' }: CustomerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  useEffect(() => {
    if (!db || !isOpen) return;

    const loadCustomers = async () => {
      try {
        setIsLoading(true);
        const customersCollection = db.get('customers');
        const allCustomers = await customersCollection.query().fetch();
        setCustomers(allCustomers);
        setFilteredCustomers(allCustomers);

        if (selectedCustomerId) {
          const selected = allCustomers.find((c: any) => c.id === selectedCustomerId) || null;
          setSelectedCustomer(selected);
        }
      } catch (error) {
        console.error('Failed to load customers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomers();
  }, [db, isOpen, selectedCustomerId]);

  const handleSearch = (text: string) => {
    setSearchText(text);
    const search = text.toLowerCase();
    const filtered = customers.filter((c: any) => {
      const raw = c._raw;
      return raw.name?.toLowerCase().includes(search) || raw.phone?.includes(search);
    });
    setFilteredCustomers(filtered);
  };

  const handleSelectCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    onSelect(customer.id);
    setIsOpen(false);
    setSearchText('');
  };

  const handleClearSelection = () => {
    setSelectedCustomer(null);
    onSelect(null);
    setIsOpen(false);
    setSearchText('');
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        style={{
          backgroundColor: '#fff',
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 6,
          marginBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ fontSize: 14, color: selectedCustomer ? '#000' : '#999' }}>
          {selectedCustomer ? (selectedCustomer._raw as any).name : placeholder}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color="#666" />
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ flex: 1, marginTop: 80, backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            {/* Header */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '700' }}>Select Customer</Text>
                <TouchableOpacity onPress={() => setIsOpen(false)}>
                  <MaterialCommunityIcons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Search */}
            <TextInput
              value={searchText}
              onChangeText={handleSearch}
              placeholder="Search by name or phone..."
              style={{
                marginHorizontal: 16,
                marginVertical: 12,
                backgroundColor: '#f5f5f5',
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 6,
                fontSize: 14,
              }}
            />

            {/* Clear Selection */}
            {selectedCustomer && (
              <TouchableOpacity
                onPress={handleClearSelection}
                style={{
                  marginHorizontal: 16,
                  marginBottom: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <MaterialCommunityIcons name="close-circle-outline" size={16} color="#999" />
                <Text style={{ marginLeft: 8, fontSize: 14, color: '#666' }}>No customer</Text>
              </TouchableOpacity>
            )}

            {/* Customer List */}
            {isLoading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#4CAF50" />
              </View>
            ) : filteredCustomers.length === 0 ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <MaterialCommunityIcons name="account-multiple-outline" size={48} color="#ccc" />
                <Text style={{ marginTop: 12, fontSize: 14, color: '#999' }}>No customers found</Text>
              </View>
            ) : (
              <FlatList
                data={filteredCustomers}
                renderItem={({ item }) => {
                  const raw = item._raw as any;
                  const isSelected = selectedCustomer?.id === item.id;
                  return (
                    <TouchableOpacity
                      onPress={() => handleSelectCustomer(item)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: '#eee',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: isSelected ? '#f0f8ff' : '#fff',
                      }}
                    >
                      <View>
                        <Text style={{ fontSize: 16, fontWeight: isSelected ? '600' : '500' }}>{raw.name}</Text>
                        <Text style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{raw.phone}</Text>
                      </View>
                      {isSelected && <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />}
                    </TouchableOpacity>
                  );
                }}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}
