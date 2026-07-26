/**
 * Dashboard Screen
 *
 * Main dashboard showing:
 * - Greeting to the artisan
 * - Summary cards (pending invoices, today's expenses)
 * - Quick actions (New Invoice FAB)
 * - Recent jobs/activity
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDashboardData } from '@/src/hooks/useDashboardData';
import { formatCurrency } from '@/src/utils/formatting';

// Types
interface SummaryData {
  pendingInvoiceCount: number;
  pendingInvoiceTotal: number;
  todayExpenseTotal: number;
  todayExpenseCount: number;
  recentJobs: any[];
}

/**
 * Dashboard Screen Component
 */
export const DashboardScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Get reactive dashboard data from WatermelonDB
  const dashboardData = useDashboardData();

  // Transform dashboard data to summary format
  const summary: SummaryData = {
    pendingInvoiceCount: dashboardData.error ? 0 : (dashboardData.recentJobs.length > 0 ? 1 : 0),
    pendingInvoiceTotal: dashboardData.pendingInvoiceTotal,
    todayExpenseTotal: dashboardData.todayExpensesTotal,
    todayExpenseCount: 0,
    recentJobs: dashboardData.recentJobs.map((job) => ({
      id: job.id,
      title: job.title,
      status: job.status,
      location: '', // Not available in dashboard data
    })),
  };

  /**
   * Handle New Invoice button press
   * Opens invoice creation modal
   */
  const handleNewInvoice = () => {
    router.push('/invoice/new');
  };

  /**
   * Format job status for display
   */
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

  /**
   * Get status badge color
   */
  const getStatusColor = (status: string): string => {
    switch (status) {
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
        return '#999';
    }
  };

  // Show loading spinner only on initial load
  if (dashboardData.isLoading && dashboardData.recentJobs.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  // Show error if present but still display available data
  if (dashboardData.error) {
    console.warn('[Dashboard] Error:', dashboardData.error.message);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Greeting */}
        <View style={{ backgroundColor: '#0066cc', paddingHorizontal: 16, paddingVertical: 24 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 4 }}>
            Welcome back, Chidike 👋
          </Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
            {new Date().toLocaleDateString('en-NG', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>

        {/* Summary Cards */}
        <View style={{ paddingHorizontal: 16, marginTop: 16, gap: 12 }}>
          {/* Pending Invoices Card */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/jobs')}
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#666', marginBottom: 8, fontWeight: '500' }}>
                  💰 PENDING INVOICES
                </Text>
                <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#0066cc', marginBottom: 4 }}>
                  {formatCurrency(summary.pendingInvoiceTotal)}
                </Text>
                <Text style={{ fontSize: 12, color: '#999' }}>
                  {summary.pendingInvoiceCount} invoice{summary.pendingInvoiceCount !== 1 ? 's' : ''}
                </Text>
              </View>
              <MaterialCommunityIcons name="file-document" size={32} color="#0066cc" />
            </View>
          </TouchableOpacity>

          {/* Today's Expenses Card */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/expenses')}
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#666', marginBottom: 8, fontWeight: '500' }}>
                  ⛽ TODAY'S EXPENSES
                </Text>
                <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#ff9800', marginBottom: 4 }}>
                  {formatCurrency(summary.todayExpenseTotal)}
                </Text>
                <Text style={{ fontSize: 12, color: '#999' }}>
                  {summary.todayExpenseCount} transaction{summary.todayExpenseCount !== 1 ? 's' : ''}
                </Text>
              </View>
              <MaterialCommunityIcons name="gas-cylinder" size={32} color="#ff9800" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Recent Jobs Section */}
        {summary.recentJobs.length > 0 && (
          <View style={{ marginTop: 24, paddingHorizontal: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1a1a1a' }}>
                Recent Jobs
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/jobs')}>
                <Text style={{ fontSize: 12, color: '#0066cc', fontWeight: '600' }}>
                  View All →
                </Text>
              </TouchableOpacity>
            </View>

            {/* Jobs List */}
            {summary.recentJobs.map((job) => (
              <TouchableOpacity
                key={job.id}
                activeOpacity={0.7}
                onPress={() => router.push(`/(tabs)/jobs/${job.id}`)}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 8,
                  borderLeftWidth: 4,
                  borderLeftColor: getStatusColor(job.status),
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1a1a1a', flex: 1 }}>
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
                    <Text style={{ fontSize: 10, color: '#fff', fontWeight: '600' }}>
                      {formatStatus(job.status)}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: '#666' }}>📍 {job.location}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty State */}
        {summary.recentJobs.length === 0 && (
          <View style={{ marginTop: 40, paddingHorizontal: 24, alignItems: 'center' }}>
            <MaterialCommunityIcons name="briefcase-outline" size={64} color="#ddd" />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginTop: 16 }}>
              No active jobs
            </Text>
            <Text style={{ fontSize: 14, color: '#666', marginTop: 8, textAlign: 'center' }}>
              Create a new job or invoice to get started
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button (New Invoice) */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleNewInvoice}
        style={{
          position: 'absolute',
          bottom: 24 + insets.bottom,
          right: 16,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#0066cc',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>

      {/* FAB Label (appears on hover in some designs, or always visible) */}
      <View
        style={{
          position: 'absolute',
          bottom: 90 + insets.bottom,
          right: 16,
          backgroundColor: '#1a1a1a',
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 4,
          opacity: 0.9,
        }}
      >
        <Text style={{ fontSize: 12, color: '#fff', fontWeight: '600' }}>
          New Invoice
        </Text>
      </View>
    </View>
  );
};

export default DashboardScreen;
