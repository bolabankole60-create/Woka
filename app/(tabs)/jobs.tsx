/**
 * Jobs Screen
 *
 * Lists jobs from WatermelonDB using offline-first JobService.
 * Supports filtering, search, creation, and pull-to-refresh sync.
 */

import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { useRouter, Href, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { initializeDatabase } from '@/db/database';
import { useManualSync } from '@/hooks/useSync';
import { CustomerSelector } from '@/components/CustomerSelector';
import type { Database } from '@nozbe/watermelondb';

/**
 * Jobs Screen Component
 */
export default function JobsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filteredCustomerId?: string }>();
  const [db, setDb] = useState<Database | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState<string | null>(params.filteredCustomerId || null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [archivedFilter, setArchivedFilter] = useState(false);
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
   * Load jobs and customers from WatermelonDB
   */
  useEffect(() => {
    const loadData = async () => {
      if (!db) return;

      try {
        setIsLoading(true);
        const jobsCollection = db.get('jobs');
        const customersCollection = db.get('customers');

        const allJobs = await jobsCollection.query().fetch();
        const allCustomers = await customersCollection.query().fetch();

        setJobs(allJobs);
        setCustomers(allCustomers);
      } catch (error) {
        console.error('Failed to load data:', error);
        Alert.alert('Error', 'Failed to load jobs');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [db]);

  /**
   * Filter jobs based on search and filter criteria
   */
  const filteredJobs = useMemo(() => {
    return jobs.filter((j: any) => {
      const raw = j._raw as any;

      // Status filter
      if (statusFilter !== 'all' && raw.status !== statusFilter) return false;

      // Customer filter
      if (customerFilter && raw.customer_id !== customerFilter) return false;

      // Priority filter
      if (priorityFilter && raw.priority !== priorityFilter) return false;

      // Archived filter
      if (raw.is_archived !== archivedFilter) return false;

      // Search filter (title or description)
      if (searchText) {
        const search = searchText.toLowerCase();
        const matchesTitle = raw.title?.toLowerCase().includes(search);
        const matchesDesc = raw.description?.toLowerCase().includes(search);
        if (!matchesTitle && !matchesDesc) return false;
      }

      return true;
    });
  }, [jobs, statusFilter, customerFilter, priorityFilter, archivedFilter, searchText]);

  const handleCreateJob = () => {
    router.push('/jobs/new' as Href);
  };

  const handleJobTap = (jobId: string) => {
    router.push(`/jobs/${jobId}` as Href);
  };

  const getSyncStatusIcon = (syncStatus: string) => {
    switch (syncStatus) {
      case 'local':
        return { icon: 'cloud-off-outline', color: '#ff9800', label: 'Local' };
      case 'synced':
        return { icon: 'cloud-check-outline', color: '#4CAF50', label: 'Synced' };
      case 'failed':
        return { icon: 'cloud-alert-outline', color: '#f44336', label: 'Failed' };
      default:
        return { icon: 'cloud-outline', color: '#999', label: 'Pending' };
    }
  };

  const renderJobItem = ({ item }: { item: any }) => {
    const raw = item._raw as any;
    const syncStatus = raw.sync_status;
    const syncInfo = getSyncStatusIcon(syncStatus);
    const customerName = customers.find((c: any) => c.id === raw.customer_id)?._raw?.name;

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
          borderLeftColor: raw.is_archived ? '#ccc' : (syncStatus === 'local' ? '#ff9800' : '#4CAF50'),
          opacity: raw.is_archived ? 0.6 : 1,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>{raw.title}</Text>
            {customerName && <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Customer: {customerName}</Text>}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialCommunityIcons name={syncInfo.icon as any} size={14} color={syncInfo.color} />
            {raw.is_archived && <MaterialCommunityIcons name="archive-outline" size={14} color="#999" />}
          </View>
        </View>

        <Text style={{ color: '#666', fontSize: 13, marginBottom: 8 }}>{raw.location}</Text>
        {raw.priority && <Text style={{ fontSize: 11, color: '#999', marginBottom: 6 }}>Priority: {raw.priority}</Text>}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: '#999' }}>{raw.status}</Text>
          <Text style={{ fontSize: 11, color: syncInfo.color }}>{syncInfo.label}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const hasActiveFilters =
    statusFilter !== 'all' || customerFilter || priorityFilter || archivedFilter || searchText;

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

        {/* Search Bar */}
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search by title or description..."
          style={{
            backgroundColor: '#f5f5f5',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 6,
            marginBottom: 12,
            fontSize: 14,
          }}
        />

        {/* Status Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {['all', 'DRAFT', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => setStatusFilter(status)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: statusFilter === status ? '#4CAF50' : '#e0e0e0',
                marginRight: 8,
              }}
            >
              <Text style={{ fontSize: 12, color: statusFilter === status ? '#fff' : '#666' }}>
                {status === 'all' ? 'All' : status}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Customer Filter using Selector */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 }}>Filter by Customer</Text>
          <CustomerSelector db={db} selectedCustomerId={customerFilter} onSelect={setCustomerFilter} placeholder="All Customers" />
        </View>

        {/* Additional Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>

          {/* Priority Filter */}
          <TouchableOpacity
            onPress={() => setPriorityFilter(priorityFilter ? null : 'high')}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: priorityFilter ? '#FF9800' : '#e0e0e0',
              marginRight: 8,
            }}
          >
            <Text style={{ fontSize: 12, color: priorityFilter ? '#fff' : '#666' }}>
              {priorityFilter ? 'Priority: ' + priorityFilter : 'Priority'}
            </Text>
          </TouchableOpacity>

          {/* Archived Filter */}
          <TouchableOpacity
            onPress={() => setArchivedFilter(!archivedFilter)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: archivedFilter ? '#9C27B0' : '#e0e0e0',
              marginRight: 8,
            }}
          >
            <Text style={{ fontSize: 12, color: archivedFilter ? '#fff' : '#666' }}>
              {archivedFilter ? 'Archived' : 'Active'}
            </Text>
          </TouchableOpacity>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <TouchableOpacity
              onPress={() => {
                setSearchText('');
                setStatusFilter('all');
                setCustomerFilter(null);
                setPriorityFilter(null);
                setArchivedFilter(false);
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: '#f44336',
              }}
            >
              <Text style={{ fontSize: 12, color: '#fff' }}>Clear</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : filteredJobs.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <MaterialCommunityIcons name="briefcase-outline" size={48} color="#ccc" />
          <Text style={{ marginTop: 16, fontSize: 16, color: '#999' }}>
            {jobs.length === 0 ? 'No jobs yet' : 'No jobs match your filters'}
          </Text>
          <TouchableOpacity
            onPress={handleCreateJob}
            style={{ marginTop: 20, paddingHorizontal: 20, paddingVertical: 10 }}
          >
            <Text style={{ color: '#4CAF50', fontSize: 16, fontWeight: '600' }}>
              {jobs.length === 0 ? 'Create Job' : 'Clear Filters'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          renderItem={renderJobItem}
          keyExtractor={(item) => (item._raw as any).id}
          refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={syncNow} />}
          contentContainerStyle={{ paddingVertical: 12 }}
        />
      )}
    </View>
  );
}
