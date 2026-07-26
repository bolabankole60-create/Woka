/**
 * Invoice Creation Modal
 *
 * Modal route for creating and sharing invoices.
 * Wraps the InvoiceShareScreen component.
 * Opened via router.push('/invoice/new') from the dashboard FAB.
 */

import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import the invoice component
import InvoiceShareScreen from '@/screens/InvoiceShareScreen';

/**
 * Invoice Modal Wrapper
 *
 * Provides a modal interface for invoice creation with a close button.
 */
export const InvoiceModal: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  /**
   * Handle modal close
   */
  const handleClose = () => {
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* Close Button */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          paddingTop: insets.top + 8,
          backgroundColor: '#f5f5f5',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: '#e0e0e0',
        }}
      >
        <TouchableOpacity
          onPress={handleClose}
          style={{
            padding: 8,
            marginLeft: -8,
          }}
        >
          <MaterialCommunityIcons name="close" size={24} color="#1a1a1a" />
        </TouchableOpacity>
      </View>

      {/* Invoice Screen */}
      <View style={{ flex: 1 }}>
        <InvoiceShareScreen
          route={{
            params: {
              jobData: {
                jobId: `job_${Date.now()}`,
                clientName: '',
                clientPhone: '',
                artisanName: 'Chidike Okafor', // Pre-fill with logged-in user
              },
            },
          }}
        />
      </View>
    </View>
  );
};

export default InvoiceModal;
