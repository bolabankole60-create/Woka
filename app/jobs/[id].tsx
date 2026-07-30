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

        if (result.success) {
          setJob(result.data);
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

  const raw = job._raw as any;
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
      </View>
    </ScrollView>
  );
}
