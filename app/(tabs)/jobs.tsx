/**
 * Jobs Screen
 *
 * Lists all active jobs for the artisan.
 * Allows filtering by status, viewing details, and creating new jobs.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Job {
  id: string;
  title: string;
  status: string;
  location: string;
  totalAmount: number;
  paidAmount: number;
}

/**
 * Jobs Screen Component
 */
export const JobsScreen: React.FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('all');

  /**
   * Load jobs data
   */
  useEffect(() => {
    const loadJobs = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Mock jobs data
        setJobs([
          {
            id: 'job_1',
            title: 'Fix kitchen sink leak',
            status: 'in_progress',
            location: 'Lekki, Lagos',
            totalAmount: 29562.50,
            paidAmount: 10000,
          },
          {
            id: 'job_2',
            title: 'Electrical wiring inspection',
            status: 'draft',
            location: 'Ikoyi, Lagos',
            totalAmount: 8600,
            paidAmount: 0,
          },
          {
            id: 'job_3',
            title: 'Install ceiling fan',
            status: 'completed',
            location: 'VI, Lagos',
            totalAmount: 12000,
            paidAmount: 12000,
          },
        ]);
      } catch (error) {
        console.error('[Jobs] Load error:', error);
        Alert.alert('Error', 'Failed to load jobs');
      } finally {
        setIsLoading(false);
      }
    };

    loadJobs();
  }, []);

  /**
   * Filter jobs by status
   */
  const filteredJobs = jobs.filter((job) => {
    if (selectedFilter === 'all') return true;
    return job.status === selectedFilter;
  });

  /**
   * Format currency
   */
  const formatCurrency = (amount: number): string => {
    return `₦${amount.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  /**
   * Get status color
   */
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'in_progress':
        return '#ffa500';
      case 'completed':
        return '#4caf50';
      case 'paid':
        return '#00b050';
      case 'draft':
        return '#999';
      default:
        return '#666';
    }
  };

  /**
   * Format status for display
   */
  const formatStatus = (status: string): string => {
    const map: Record<string, string> = {
      draft: 'Draft',
      in_progress: 'In Progress',
      completed: 'Completed',
      paid: 'Paid',
    };
    return map[status] || status;
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Filter Tabs */}
        <View
          style={{
            backgroundColor: '#fff',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#e0e0e0',
            flexDirection: 'row',
            gap: 8,
          }}
        >
          {['all', 'draft', 'in_progress', 'completed'].map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setSelectedFilter(filter)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor:
                  selectedFilter === filter ? '#0066cc' : '#f0f0f0',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color:
                    selectedFilter === filter ? '#fff' : '#666',
                }}
              >
                {filter === 'all' ? 'All' : formatStatus(filter)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Jobs List */}
        <View style={{ padding: 16, gap: 12 }}>
          {filteredJobs.length > 0 ? (
            filteredJobs.map((job) => (
              <TouchableOpacity
                key={job.id}
                activeOpacity={0.7}
                onPress={() => router.push({
                  pathname: '/(tabs)/jobs/[id]',
                  params: { id: job.id },
                })}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  padding: 16,
                  borderLeftWidth: 4,
                  borderLeftColor: getStatusColor(job.status),
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                {/* Header */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: '#1a1a1a',
                      flex: 1,
                    }}
                  >
                    {job.title}
                  </Text>
                  <View
                    style={{
                      backgroundColor: getStatusColor(job.status),
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        color: '#fff',
                        fontWeight: '600',
                      }}
                    >
                      {formatStatus(job.status)}
                    </Text>
                  </View>
                </View>

                {/* Location */}
                <Text style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
                  📍 {job.location}
                </Text>

                {/* Amount Info */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: '#f0f0f0',
                  }}
                >
                  <View>
                    <Text
                      style={{
                        fontSize: 11,
                        color: '#999',
                        marginBottom: 4,
                      }}
                    >
                      Total
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#1a1a1a',
                      }}
                    >
                      {formatCurrency(job.totalAmount)}
                    </Text>
                  </View>
                  <View>
                    <Text
                      style={{
                        fontSize: 11,
                        color: '#999',
                        marginBottom: 4,
                      }}
                    >
                      Paid
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#00b050',
                      }}
                    >
                      {formatCurrency(job.paidAmount)}
                    </Text>
                  </View>
                  <View>
                    <Text
                      style={{
                        fontSize: 11,
                        color: '#999',
                        marginBottom: 4,
                      }}
                    >
                      Pending
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#ff9800',
                      }}
                    >
                      {formatCurrency(job.totalAmount - job.paidAmount)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <MaterialCommunityIcons
                name="briefcase-outline"
                size={64}
                color="#ddd"
              />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#1a1a1a',
                  marginTop: 16,
                }}
              >
                No jobs found
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: '#666',
                  marginTop: 8,
                  textAlign: 'center',
                }}
              >
                Create a new job to get started
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default JobsScreen;
