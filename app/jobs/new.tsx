/**
 * Create Job Screen
 * Offline-first job creation using JobService
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
import { initializeDatabase } from '@/db/database';
import { JobService } from '@/services/jobService';
import { useSyncAfterMutation } from '@/hooks/useSync';
import type { Database } from '@nozbe/watermelondb';
import * as SecureStore from 'expo-secure-store';

export default function NewJobScreen() {
  const router = useRouter();
  const [db, setDb] = useState<Database | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title required';
    if (!description.trim()) newErrors.description = 'Description required';
    if (!category.trim()) newErrors.category = 'Category required';
    if (!location.trim()) newErrors.location = 'Location required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm() || !db || !userId) return;

    try {
      setIsLoading(true);
      const service = new JobService(db, userId);

      const result = await service.createJob({
        clientId: userId,
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        location: location.trim(),
        priority: priority || undefined,
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
      });

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to create job');
        return;
      }

      // Sync in background
      await syncAfterMutation();

      // Navigate to job details
      const jobId = (result.data?._raw as any)?.id;
      if (jobId) {
        router.replace(`/jobs/${jobId}` as Href);
      } else {
        router.back();
      }
    } catch (error) {
      Alert.alert('Error', String(error));
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
        <Text style={{ marginLeft: 16, fontSize: 20, fontWeight: '700' }}>New Job</Text>
      </View>

      {/* Form */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
        {/* Title */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 }}>
          Title *
        </Text>
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
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 }}>
          Description *
        </Text>
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

        {/* Category */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 }}>
          Category *
        </Text>
        <TextInput
          value={category}
          onChangeText={setCategory}
          placeholder="e.g., plumbing, electrical"
          style={{
            backgroundColor: '#fff',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 6,
            marginBottom: 12,
            borderWidth: errors.category ? 1 : 0,
            borderColor: errors.category ? '#ff5252' : undefined,
          }}
        />
        {errors.category && <Text style={{ color: '#ff5252', fontSize: 12, marginBottom: 8 }}>{errors.category}</Text>}

        {/* Location */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 }}>
          Location *
        </Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="Job location"
          style={{
            backgroundColor: '#fff',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 6,
            marginBottom: 12,
            borderWidth: errors.location ? 1 : 0,
            borderColor: errors.location ? '#ff5252' : undefined,
          }}
        />
        {errors.location && <Text style={{ color: '#ff5252', fontSize: 12, marginBottom: 8 }}>{errors.location}</Text>}

        {/* Priority */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 }}>
          Priority (Optional)
        </Text>
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

        {/* Estimated Cost */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 }}>
          Estimated Cost (Optional)
        </Text>
        <TextInput
          value={estimatedCost}
          onChangeText={setEstimatedCost}
          placeholder="Amount in ₦"
          keyboardType="decimal-pad"
          style={{
            backgroundColor: '#fff',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 6,
            marginBottom: 12,
          }}
        />

        {/* Create Button */}
        <TouchableOpacity
          onPress={handleCreate}
          disabled={isLoading}
          style={{
            backgroundColor: isLoading ? '#ccc' : '#4CAF50',
            paddingVertical: 14,
            borderRadius: 6,
            marginTop: 8,
          }}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ textAlign: 'center', color: '#fff', fontWeight: '600', fontSize: 16 }}>
              Create Job
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
