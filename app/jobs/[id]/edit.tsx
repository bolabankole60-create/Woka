/**
 * Edit Job Screen
 * Update job with offline-first sync
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
import { initializeDatabase } from '@/db/database';
import { JobService } from '@/services/jobService';
import { useSyncAfterMutation } from '@/hooks/useSync';
import type { Database } from '@nozbe/watermelondb';
import * as SecureStore from 'expo-secure-store';

export default function EditJobScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [db, setDb] = useState<Database | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [job, setJob] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
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
      if (!db || !id || !userId) return;

      try {
        setIsLoading(true);
        const service = new JobService(db, userId);
        const result = await service.getJob(id);

        if (result.success && result.data) {
          const raw = (result.data._raw as any);
          setJob(result.data);
          setTitle(raw.title || '');
          setDescription(raw.description || '');
          setPriority(raw.priority || '');
          setNotes(raw.notes || '');
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title required';
    if (!description.trim()) newErrors.description = 'Description required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm() || !db || !userId || !job) return;

    try {
      setIsSaving(true);
      const service = new JobService(db, userId);

      const result = await service.updateJob(id!, {
        title: title.trim(),
        description: description.trim(),
        priority: priority || undefined,
        notes: notes || undefined,
      });

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to update job');
        return;
      }

      // Sync in background
      await syncAfterMutation();

      // Navigate back
      router.back();
    } catch (error) {
      Alert.alert('Error', String(error));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
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
        <Text style={{ marginLeft: 16, fontSize: 20, fontWeight: '700' }}>Edit Job</Text>
      </View>

      {/* Form */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
        {/* Title */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 }}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Job title"
          style={{
            backgroundColor: '#fff',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 6,
            marginBottom: 12,
            borderWidth: errors.title ? 1 : 0,
            borderColor: errors.title ? '#ff5252' : undefined,
          }}
        />
        {errors.title && <Text style={{ color: '#ff5252', fontSize: 12, marginBottom: 8 }}>{errors.title}</Text>}

        {/* Description */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 }}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Job description"
          multiline
          numberOfLines={4}
          style={{
            backgroundColor: '#fff',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 6,
            marginBottom: 12,
            borderWidth: errors.description ? 1 : 0,
            borderColor: errors.description ? '#ff5252' : undefined,
          }}
        />
        {errors.description && (
          <Text style={{ color: '#ff5252', fontSize: 12, marginBottom: 8 }}>{errors.description}</Text>
        )}

        {/* Priority */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 }}>Priority</Text>
        <TextInput
          value={priority}
          onChangeText={setPriority}
          placeholder="high, medium, low"
          style={{
            backgroundColor: '#fff',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 6,
            marginBottom: 12,
          }}
        />

        {/* Notes */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 }}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Add notes"
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

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          style={{
            backgroundColor: isSaving ? '#ccc' : '#4CAF50',
            paddingVertical: 14,
            borderRadius: 6,
            marginTop: 8,
          }}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ textAlign: 'center', color: '#fff', fontWeight: '600', fontSize: 16 }}>
              Save Changes
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
