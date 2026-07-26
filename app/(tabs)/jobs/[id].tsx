/**
 * Job Details Screen
 *
 * Displays complete details for a single job.
 * Fetches from WatermelonDB with user scope.
 * Shows loading, not-found, and error states.
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { formatCurrency } from '@/utils/formatting';

interface Job {
  id: string;
  title: string;
  description: string;
  status: string;
  location: string;
  category: string;
  materialCost: number;
  laborFee: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  artisanNotes?: string;
  clientNotes?: string;
  scheduledDate?: number;
  startedAt?: number;
  completedAt?: number;
  dueDate?: number;
}

export const JobDetailsScreen: React.FC = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [job, setJob] = useState<Job | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const formatStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      draft: 'Draft',
      accepted: 'Accepted',
      material_sourced: 'Materials Sourced',
      in_progress: 'In Progress',
      awaiting_inspection: 'Awaiting Inspection',
      completed: 'Completed',
      paid: 'Paid',
      cancelled: 'Cancelled',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'draft':
        return '#999';
      case 'accepted':
        return '#0066cc';
      case 'material_sourced':
        return '#ff9800';
      case 'in_progress':
        return '#4caf50';
      case 'awaiting_inspection':
        return '#ff9800';
      case 'completed':
        return '#4caf50';
      case 'paid':
        return '#00b050';
      default:
        return '#666';
    }
  };

  const formatDate = (timestamp: number | undefined): string => {
    if (!timestamp) return 'Not set';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-NG', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  useEffect(() => {
    const loadJob = async () => {
      try {
        setIsLoading(true);
        setNotFound(false);
        setError(null);

        // Get authenticated user ID from SecureStore for validation
        const storedUserId = await SecureStore.getItemAsync('userId');
        if (!storedUserId) {
          setError(new Error('User not authenticated'));
          return;
        }

        if (!id) {
          setError(new Error('Job ID not provided'));
          return;
        }

        // Mock job data for demo purposes
        // In production, this would query WatermelonDB
        const mockJobs: Record<string, Job> = {
          job_1: {
            id: 'job_1',
            title: 'Fix kitchen sink leak',
            description: 'Repair the kitchen sink that has been leaking for a week. Needs full inspection and parts replacement if necessary.',
            status: 'in_progress',
            location: 'Lekki, Lagos',
            category: 'plumbing',
            materialCost: 5000,
            laborFee: 15000,
            taxAmount: 2000,
            discountAmount: 2438.50,
            totalAmount: 29562.50,
            paidAmount: 10000,
            artisanNotes: 'Materials ordered, waiting for delivery before work starts.',
            clientNotes: 'Client wants it done by Friday.',
            scheduledDate: Date.now() + 86400000,
            dueDate: Date.now() + 259200000,
          },
          job_2: {
            id: 'job_2',
            title: 'Electrical wiring inspection',
            description: 'Full house electrical system inspection to ensure safety compliance.',
            status: 'draft',
            location: 'Ikoyi, Lagos',
            category: 'electrical',
            materialCost: 0,
            laborFee: 8000,
            taxAmount: 600,
            discountAmount: 0,
            totalAmount: 8600,
            paidAmount: 0,
            artisanNotes: 'Awaiting client confirmation before scheduling.',
            clientNotes: 'Need urgent inspection before renovation starts.',
            dueDate: Date.now() + 432000000,
          },
          job_3: {
            id: 'job_3',
            title: 'Install ceiling fan',
            description: 'Install new ceiling fan in living room.',
            status: 'completed',
            location: 'VI, Lagos',
            category: 'electrical',
            materialCost: 8000,
            laborFee: 4000,
            taxAmount: 0,
            discountAmount: 0,
            totalAmount: 12000,
            paidAmount: 12000,
            artisanNotes: 'Installation completed successfully.',
            clientNotes: 'Very satisfied with the work quality.',
            completedAt: Date.now() - 604800000,
          },
        };

        const jobData = mockJobs[String(id)];

        if (!jobData) {
          setNotFound(true);
          return;
        }

        setJob(jobData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load job'));
      } finally {
        setIsLoading(false);
      }
    };

    loadJob();
  }, [id]);

  const pendingAmount = job ? job.totalAmount - job.paidAmount : 0;

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  if (notFound) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', paddingHorizontal: 24 }}>
        <MaterialCommunityIcons name="briefcase-off" size={64} color="#ddd" />
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginTop: 16 }}>
          Job not found
        </Text>
        <Text style={{ fontSize: 14, color: '#666', marginTop: 8, textAlign: 'center' }}>
          The job you're looking for doesn't exist or has been deleted.
        </Text>
        <TouchableOpacity
          style={{
            marginTop: 24,
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: '#0066cc',
            borderRadius: 6,
          }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (error || !job) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', paddingHorizontal: 24 }}>
        <MaterialCommunityIcons name="alert-circle" size={64} color="#dc3545" />
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginTop: 16 }}>
          Error loading job
        </Text>
        <Text style={{ fontSize: 14, color: '#666', marginTop: 8, textAlign: 'center' }}>
          {error?.message || 'An unexpected error occurred'}
        </Text>
        <TouchableOpacity
          style={{
            marginTop: 24,
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: '#0066cc',
            borderRadius: 6,
          }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }}>
        <View style={{ padding: 16 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 12 }}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#0066cc" />
          </TouchableOpacity>

          <Text style={{ fontSize: 20, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 }}>
            {job.title}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                backgroundColor: getStatusColor(job.status),
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 4,
              }}
            >
              <Text style={{ fontSize: 12, color: '#fff', fontWeight: '600' }}>
                {formatStatus(job.status)}
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: '#666' }}>📍 {job.location}</Text>
          </View>
        </View>
      </View>

      {/* Financial Summary */}
      <View style={{ padding: 16, backgroundColor: '#fff', marginBottom: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 12 }}>
          Financial Summary
        </Text>

        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: '#666' }}>Material Cost</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#1a1a1a' }}>
              {formatCurrency(job.materialCost)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: '#666' }}>Labor Fee</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#1a1a1a' }}>
              {formatCurrency(job.laborFee)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: '#666' }}>Tax</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#1a1a1a' }}>
              {formatCurrency(job.taxAmount)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: '#666' }}>Discount</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#4caf50' }}>
              -{formatCurrency(job.discountAmount)}
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingTop: 10,
              borderTopWidth: 1,
              borderTopColor: '#e0e0e0',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#1a1a1a' }}>Total</Text>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0066cc' }}>
              {formatCurrency(job.totalAmount)}
            </Text>
          </View>
        </View>
      </View>

      {/* Payment Status */}
      <View style={{ padding: 16, backgroundColor: '#fff', marginBottom: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 12 }}>
          Payment Status
        </Text>

        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: '#666' }}>Amount Paid</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#00b050' }}>
              {formatCurrency(job.paidAmount)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: '#666' }}>Amount Pending</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#ff9800' }}>
              {formatCurrency(pendingAmount)}
            </Text>
          </View>

          <View
            style={{
              marginTop: 12,
              backgroundColor: '#f5f5f5',
              borderRadius: 6,
              overflow: 'hidden',
              height: 8,
            }}
          >
            <View
              style={{
                height: '100%',
                backgroundColor: '#0066cc',
                width: `${(job.paidAmount / job.totalAmount) * 100}%`,
              }}
            />
          </View>

          <Text style={{ fontSize: 11, color: '#999' }}>
            {Math.round((job.paidAmount / job.totalAmount) * 100)}% paid
          </Text>
        </View>
      </View>

      {/* Dates */}
      {(job.scheduledDate || job.startedAt || job.completedAt || job.dueDate) && (
        <View style={{ padding: 16, backgroundColor: '#fff', marginBottom: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 12 }}>
            Important Dates
          </Text>

          <View style={{ gap: 10 }}>
            {job.scheduledDate && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: '#666' }}>Scheduled Date</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1a1a1a' }}>
                  {formatDate(job.scheduledDate)}
                </Text>
              </View>
            )}

            {job.startedAt && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: '#666' }}>Started</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1a1a1a' }}>
                  {formatDate(job.startedAt)}
                </Text>
              </View>
            )}

            {job.completedAt && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: '#666' }}>Completed</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#00b050' }}>
                  {formatDate(job.completedAt)}
                </Text>
              </View>
            )}

            {job.dueDate && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: '#666' }}>Due Date</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1a1a1a' }}>
                  {formatDate(job.dueDate)}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Description */}
      {job.description && (
        <View style={{ padding: 16, backgroundColor: '#fff', marginBottom: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 }}>
            Description
          </Text>
          <Text style={{ fontSize: 13, color: '#666', lineHeight: 20 }}>
            {job.description}
          </Text>
        </View>
      )}

      {/* Notes */}
      {(job.artisanNotes || job.clientNotes) && (
        <View style={{ padding: 16, backgroundColor: '#fff', marginBottom: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 12 }}>
            Notes
          </Text>

          {job.artisanNotes && (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#0066cc', marginBottom: 4 }}>
                Artisan Notes
              </Text>
              <Text style={{ fontSize: 13, color: '#666', lineHeight: 20 }}>
                {job.artisanNotes}
              </Text>
            </View>
          )}

          {job.clientNotes && (
            <View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#ff9800', marginBottom: 4 }}>
                Client Notes
              </Text>
              <Text style={{ fontSize: 13, color: '#666', lineHeight: 20 }}>
                {job.clientNotes}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={{ padding: 16, backgroundColor: '#fff', marginBottom: 24, gap: 10 }}>
        <TouchableOpacity
          style={{
            backgroundColor: '#0066cc',
            borderRadius: 8,
            paddingVertical: 12,
            alignItems: 'center',
          }}
          onPress={() => Alert.alert('Action', 'This feature is coming soon')}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Create Invoice</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: '#f5f5f5',
            borderRadius: 8,
            paddingVertical: 12,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#ddd',
          }}
          onPress={() => Alert.alert('Action', 'This feature is coming soon')}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#0066cc' }}>Edit Job</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default JobDetailsScreen;
