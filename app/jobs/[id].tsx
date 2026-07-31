/**
 * Job Details Screen
 * View and manage job with offline-first sync
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, Href } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { initializeDatabase } from '@/db/database';
import { JobService } from '@/services/jobService';
import { useSyncAfterMutation } from '@/hooks/useSync';
import { calculateOutstandingBalance } from '@/services/financialService';
import type { Database } from '@nozbe/watermelondb';
import * as SecureStore from 'expo-secure-store';

export default function JobDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [db, setDb] = useState<Database | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [job, setJob] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const syncAfterMutation = useSyncAfterMutation(db);

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

  useEffect(() => {
    const loadJob = async () => {
      if (!db || !id) return;

      try {
        setIsLoading(true);
        const service = new JobService(db, userId);
        const result = await service.getJob(id);

        if (result.success && result.data) {
          setJob(result.data);

          // Load customer if assigned
          const raw = result.data._raw as any;
          if (raw.customer_id) {
            try {
              const customersCollection = db.get('customers');
              const cust = await customersCollection.find(raw.customer_id).catch(() => null);
              setCustomer(cust);
            } catch (error) {
              console.error('Failed to load customer:', error);
            }
          }

          // Load invoice if exists
          try {
            const invoicesCollection = db.get('invoices');
            const invoices = await invoicesCollection.query().fetch().catch(() => []);
            const inv = invoices.find((i: any) => i._raw?.job_id === raw.id) || null;
            setInvoice(inv);

            // Load payments if invoice exists
            if (inv) {
              const paymentsCollection = db.get('payments');
              const pmts = await paymentsCollection.query().fetch().catch(() => []);
              const filteredPayments = pmts.filter((p: any) => p._raw?.invoice_id === inv.id);
              setPayments(filteredPayments);
            }
          } catch (error) {
            console.error('Failed to load invoice/payments:', error);
          }
        } else {
          Alert.alert('Error', result.error || 'Failed to load job');
        }
      } catch (error) {
        console.error('Failed to load job:', error);
        Alert.alert('Error', String(error));
      } finally {
        setIsLoading(false);
      }
    };

    loadJob();
  }, [db, id, userId]);

  const handleComplete = async () => {
    if (!job || !db || !userId) return;

    try {
      setIsProcessing(true);
      const service = new JobService(db, userId);
      const result = await service.completeJob(id!);

      if (result.success) {
        Alert.alert('Success', 'Job completed');
        setJob(result.data);
        await syncAfterMutation();
      } else {
        Alert.alert('Error', result.error || 'Failed to complete job');
      }
    } catch (error) {
      Alert.alert('Error', String(error));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = () => {
    router.push(`/jobs/${id}/edit` as Href);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 16, color: '#999' }}>Job not found</Text>
      </View>
    );
  }

  const raw = job._raw;
  const syncStatus = raw.sync_status;
  const isLocal = syncStatus === 'local';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }} contentContainerStyle={{ paddingBottom: 30 }}>
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
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: '700' }}>{raw.title}</Text>
          {isLocal && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <MaterialCommunityIcons name="cloud-off-outline" size={12} color="#ff9800" />
              <Text style={{ marginLeft: 4, fontSize: 11, color: '#ff9800' }}>Offline</Text>
            </View>
          )}
        </View>
      </View>

      {/* Details */}
      <View style={{ backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 12, borderRadius: 8, padding: 16 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 }}>Status</Text>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 16 }}>{raw.status}</Text>

        <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 }}>Description</Text>
        <Text style={{ fontSize: 14, color: '#333', marginBottom: 16 }}>{raw.description}</Text>

        <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 }}>Category</Text>
        <Text style={{ fontSize: 14, color: '#333', marginBottom: 16 }}>{raw.category}</Text>

        <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 }}>Location</Text>
        <Text style={{ fontSize: 14, color: '#333', marginBottom: 16 }}>{raw.location}</Text>

        {raw.priority && (
          <>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 }}>Priority</Text>
            <Text style={{ fontSize: 14, color: '#333', marginBottom: 16 }}>{raw.priority}</Text>
          </>
        )}

        {raw.total_amount ? (
          <>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 }}>Estimated Cost</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#4CAF50' }}>₦{raw.total_amount}</Text>
          </>
        ) : null}
      </View>

      {/* Customer Info */}
      {customer ? (
        <View style={{ backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 12, borderRadius: 8, padding: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 8 }}>Customer</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600' }}>{(customer._raw as any).name}</Text>
              <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{(customer._raw as any).phone}</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push(`/customers/${customer.id}` as Href)}
              style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f0f0f0', borderRadius: 4 }}
            >
              <Text style={{ fontSize: 12, color: '#4CAF50', fontWeight: '600' }}>View</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : raw.customer_id ? (
        <View style={{ backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 12, borderRadius: 8, padding: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 8 }}>Customer</Text>
          <Text style={{ fontSize: 14, color: '#999' }}>Customer not available locally</Text>
        </View>
      ) : (
        <View style={{ backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 12, borderRadius: 8, padding: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 8 }}>Customer</Text>
          <Text style={{ fontSize: 14, color: '#999' }}>No customer linked</Text>
        </View>
      )}

      {/* Invoice & Payments */}
      {invoice ? (() => {
        const invoiceRaw = invoice._raw as any;
        const outstanding = calculateOutstandingBalance({
          invoiceTotal: invoiceRaw.total_amount,
          invoiceAmountPaid: invoiceRaw.amount_paid,
        });
        return (
          <View style={{ backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 12, borderRadius: 8, padding: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 8 }}>Invoice</Text>
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 12, color: '#999' }}>Invoice #</Text>
              <Text style={{ fontSize: 14, fontWeight: '600' }}>{invoiceRaw.invoice_number}</Text>
            </View>
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 12, color: '#999' }}>Total Amount</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#4CAF50' }}>₦{invoiceRaw.total_amount}</Text>
            </View>
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 12, color: '#999' }}>Amount Paid</Text>
              <Text style={{ fontSize: 14, fontWeight: '600' }}>₦{invoiceRaw.amount_paid}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 12, color: '#999' }}>Outstanding Balance</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: outstanding > 0 ? '#ff9800' : '#4CAF50' }}>
                ₦{outstanding.toFixed(2)}
              </Text>
            </View>
            {payments.length > 0 && (
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 8 }}>Payments ({payments.length})</Text>
                {payments.map((p: any) => (
                  <View key={p.id} style={{ marginBottom: 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: '#333' }}>₦{(p._raw as any).amount}</Text>
                      <Text style={{ fontSize: 11, color: '#999' }}>{(p._raw as any).status}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })() : null}

      {/* Actions */}
      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        <TouchableOpacity
          onPress={handleEdit}
          disabled={isProcessing}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            borderRadius: 6,
            backgroundColor: '#2196F3',
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons name="pencil" size={20} color="#fff" />
          <Text style={{ marginLeft: 8, color: '#fff', fontWeight: '600' }}>Edit Job</Text>
        </TouchableOpacity>

        {raw.status !== 'COMPLETED' && (
          <TouchableOpacity
            onPress={handleComplete}
            disabled={isProcessing}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderRadius: 6,
              backgroundColor: isProcessing ? '#ccc' : '#4CAF50',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name="check" size={20} color="#fff" />
            <Text style={{ marginLeft: 8, color: '#fff', fontWeight: '600' }}>
              {isProcessing ? 'Processing...' : 'Mark Complete'}
            </Text>
          </TouchableOpacity>
        )}

        {raw.status === 'COMPLETED' && (
          <TouchableOpacity
            onPress={async () => {
              if (!job || !db || !userId) return;
              try {
                setIsProcessing(true);
                const { JobService } = await import('@/services/jobService');
                const service = new JobService(db, userId);
                const result = await service.reopenJob(id!);
                if (result.success) {
                  Alert.alert('Success', 'Job reopened');
                  setJob(result.data);
                  const { useSyncAfterMutation } = await import('@/hooks/useSync');
                  const syncAfterMutation = useSyncAfterMutation(db);
                  await syncAfterMutation();
                }
              } catch (error) {
                Alert.alert('Error', String(error));
              } finally {
                setIsProcessing(false);
              }
            }}
            disabled={isProcessing}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderRadius: 6,
              backgroundColor: isProcessing ? '#ccc' : '#FF9800',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name="refresh" size={20} color="#fff" />
            <Text style={{ marginLeft: 8, color: '#fff', fontWeight: '600' }}>Reopen</Text>
          </TouchableOpacity>
        )}

        {!raw.is_archived && (
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Archive Job',
                'Are you sure you want to archive this job?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Archive',
                    onPress: async () => {
                      if (!job || !db || !userId) return;
                      try {
                        setIsProcessing(true);
                        const { JobService } = await import('@/services/jobService');
                        const service = new JobService(db, userId);
                        const result = await service.archiveJob(id!);
                        if (result.success) {
                          Alert.alert('Success', 'Job archived');
                          setJob(result.data);
                          const { useSyncAfterMutation } = await import('@/hooks/useSync');
                          const syncAfterMutation = useSyncAfterMutation(db);
                          await syncAfterMutation();
                        }
                      } catch (error) {
                        Alert.alert('Error', String(error));
                      } finally {
                        setIsProcessing(false);
                      }
                    },
                  },
                ]
              );
            }}
            disabled={isProcessing}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderRadius: 6,
              backgroundColor: isProcessing ? '#ccc' : '#9C27B0',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name="archive" size={20} color="#fff" />
            <Text style={{ marginLeft: 8, color: '#fff', fontWeight: '600' }}>Archive</Text>
          </TouchableOpacity>
        )}

        {raw.is_archived && (
          <TouchableOpacity
            onPress={async () => {
              if (!job || !db || !userId) return;
              try {
                setIsProcessing(true);
                const { JobService } = await import('@/services/jobService');
                const service = new JobService(db, userId);
                const result = await service.restoreJob(id!);
                if (result.success) {
                  Alert.alert('Success', 'Job restored');
                  setJob(result.data);
                  const { useSyncAfterMutation } = await import('@/hooks/useSync');
                  const syncAfterMutation = useSyncAfterMutation(db);
                  await syncAfterMutation();
                }
              } catch (error) {
                Alert.alert('Error', String(error));
              } finally {
                setIsProcessing(false);
              }
            }}
            disabled={isProcessing}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderRadius: 6,
              backgroundColor: isProcessing ? '#ccc' : '#2196F3',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name="restore" size={20} color="#fff" />
            <Text style={{ marginLeft: 8, color: '#fff', fontWeight: '600' }}>Restore</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}
