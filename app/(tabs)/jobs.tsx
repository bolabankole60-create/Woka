/**
 * Jobs Screen
 *
 * Lists jobs from WatermelonDB using offline-first JobService.
 * Supports filtering, creation, and pull-to-refresh sync.
 */

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { initializeDatabase } from '@/db/database';
import { useManualSync } from '@/hooks/useSync';
import type { Database } from '@nozbe/watermelondb';

/**
 * Jobs Screen Component
 */
export default function JobsScreen() {
  const router = useRouter();
  const [db, setDb] = useState<Database | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const { isLoading: isSyncing, syncNow } = useManualSync(db);

  /**
   * Initialize database and load user ID
   */
  useEffect(() => {
    (async () => {
      if (!db) {
        const database = await initializeDatabase();
        setDb(database);
      }
    })();
  }, [db]);

  /**
   * Load jobs from WatermelonDB
   */
  useEffect(() => {
    const loadJobs = async () => {
      if (!db) return;

      try {
        setIsLoading(true);
        const jobsCollection = db.get('jobs');
        const allJobs = await jobsCollection.query().fetch();

        // Filter by status if needed
        const filtered = allJobs.filter((j: any) => {
          const status = (j._raw as any).status;
          if (selectedFilter === 'all') return true;
          return status === selectedFilter;
        });

        setJobs(filtered);
      } catch (error) {
        console.error('Failed to load jobs:', error);
        Alert.alert('Error', 'Failed to load jobs');
      } finally {
        setIsLoading(false);
      }
    };

    // Reload jobs when filter changes or DB changes
    const timeout = setTimeout(loadJobs, 300);
    return () => clearTimeout(timeout);
  }, [db, selectedFilter]);

  const handleCreateJob = () => {
    router.push('/jobs/new' as Href);
  };

  const handleJobTap = (jobId: string) => {
    router.push(`/jobs/${jobId}` as Href);
  };

  const renderJobItem = ({ item }: { item: any }) => {
    const raw = item._raw as any;
    const syncStatus = raw.sync_status;
    const isLocal = syncStatus === 'local';

    return (
      <TouchableOpacity
        onPress={() => handleJobTap(raw.id)}
        style={{
          backgroundColor: '#fff',
          padding: 16,
          marginHorizontal: 16,
          marginVertical: 8,
          borderRadius: 8,
          borderLeftWidth: 4,
          borderLeftColor: isLocal ? '#ff9800' : '#4CAF50',
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', flex: 1 }}>{raw.title}</Text>
          {isLocal && <MaterialCommunityIcons name="cloud-off-outline" size={16} color="#ff9800" />}
        </View>

        <Text style={{ color: '#666', fontSize: 14, marginBottom: 6 }}>{raw.location}</Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: '#999' }}>Status: {raw.status}</Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#4CAF50' }}>₦{raw.total_amount || 0}</Text>
        </View>
      </TouchableOpacity>
    );
  };

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
          <Text style={{ fontSize: 24, fontWeight: '700', flex: 1 }}>Jobs</Text>
          <TouchableOpacity
            onPress={handleCreateJob}
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

        {/* Status Filter */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['all', 'DRAFT', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => setSelectedFilter(status)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: selectedFilter === status ? '#4CAF50' : '#e0e0e0',
              }}
            >
              <Text style={{ fontSize: 12, color: selectedFilter === status ? '#fff' : '#666' }}>
                {status === 'all' ? 'All' : status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : jobs.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <MaterialCommunityIcons name="briefcase-outline" size={48} color="#ccc" />
          <Text style={{ marginTop: 16, fontSize: 16, color: '#999' }}>No jobs yet</Text>
          <TouchableOpacity
            onPress={handleCreateJob}
            style={{ marginTop: 20, paddingHorizontal: 20, paddingVertical: 10 }}
          >
            <Text style={{ color: '#4CAF50', fontSize: 16, fontWeight: '600' }}>Create Job</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={jobs}
          renderItem={renderJobItem}
          keyExtractor={(item) => (item._raw as any).id}
          refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={syncNow} />}
          contentContainerStyle={{ paddingVertical: 12 }}
        />
      )}
    </View>
  );
}
