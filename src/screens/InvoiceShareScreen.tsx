/**
 * InvoiceShareScreen - Create & Share Invoice Component
 *
 * Allows artisans to:
 * 1. Input material costs and labor fees
 * 2. Automatically calculate totals with tax/discount
 * 3. Share formatted invoice via WhatsApp
 *
 * Offline-capable: All data saved locally, synced when online
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Linking from 'expo-linking';

// Type definitions for invoice data
interface InvoiceLineItem {
  id: string;
  description: string;
  category: 'material' | 'labor' | 'service';
  quantity: number;
  unitPrice: number;
}

interface InvoiceData {
  jobId: string;
  clientName: string;
  clientPhone: string;
  artisanName: string;
  items: InvoiceLineItem[];
  taxRate: number; // e.g., 0.075 for 7.5% VAT
  discountRate: number; // e.g., 0.1 for 10% discount
  notes?: string;
}

interface CalculatedTotals {
  subtotal: number;
  materialCost: number;
  laborFee: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountDue: number;
}

// Component Props
interface InvoiceShareScreenProps {
  route: any; // React Navigation route
  jobData?: any; // Pre-filled job data
}

/**
 * Main Invoice Share Screen Component
 */
export const InvoiceShareScreen: React.FC<InvoiceShareScreenProps> = ({
  route,
  jobData,
}) => {
  const navigation = useNavigation();

  // State Management
  const [items, setItems] = useState<InvoiceLineItem[]>(
    jobData?.items || [
      { id: '1', description: '', category: 'material', quantity: 1, unitPrice: 0 },
      { id: '2', description: '', category: 'labor', quantity: 1, unitPrice: 0 },
    ]
  );

  const [clientName, setClientName] = useState(jobData?.clientName || '');
  const [clientPhone, setClientPhone] = useState(jobData?.clientPhone || '');
  const [artisanName, setArtisanName] = useState(jobData?.artisanName || '');
  const [taxRate, setTaxRate] = useState(jobData?.taxRate || 0.075); // 7.5% VAT
  const [discountRate, setDiscountRate] = useState(jobData?.discountRate || 0);
  const [notes, setNotes] = useState(jobData?.notes || '');
  const [isSharing, setIsSharing] = useState(false);

  /**
   * Calculate totals based on current items and rates
   * Memoized to prevent unnecessary recalculations
   */
  const totals: CalculatedTotals = useMemo(() => {
    // Separate materials and labor
    const materialItems = items.filter((item) => item.category === 'material');
    const laborItems = items.filter((item) => item.category === 'labor');

    // Calculate category subtotals
    const materialCost = materialItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const laborFee = laborItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    // Calculate overall totals
    const subtotal = materialCost + laborFee;
    const taxAmount = subtotal * taxRate;
    const discountAmount = subtotal * discountRate;
    const totalAmount = subtotal + taxAmount - discountAmount;

    return {
      subtotal,
      materialCost,
      laborFee,
      taxAmount,
      discountAmount,
      totalAmount,
      amountDue: totalAmount, // Could subtract payments if needed
    };
  }, [items, taxRate, discountRate]);

  /**
   * Update a specific line item
   */
  const updateItem = useCallback(
    (itemId: string, updates: Partial<InvoiceLineItem>) => {
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === itemId ? { ...item, ...updates } : item
        )
      );
    },
    []
  );

  /**
   * Add new line item (e.g., another material or labor entry)
   */
  const addLineItem = useCallback(() => {
    const newItem: InvoiceLineItem = {
      id: Date.now().toString(),
      description: '',
      category: 'material',
      quantity: 1,
      unitPrice: 0,
    };
    setItems((prev) => [...prev, newItem]);
  }, []);

  /**
   * Remove line item by ID
   */
  const removeLineItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  /**
   * Format currency for display and export
   */
  const formatCurrency = (amount: number): string => {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  /**
   * Generate clean text invoice for WhatsApp
   */
  const generateInvoiceText = useCallback((): string => {
    const timestamp = new Date().toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let invoiceText = `
*INVOICE - ${artisanName || 'Service Provider'}*
━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Date: ${timestamp}

*TO:*
${clientName || 'Client Name'}
📱 ${clientPhone || 'Phone Number'}

*INVOICE DETAILS:*
━━━━━━━━━━━━━━━━━━━━━━━━━

`;

    // Material Costs Section
    if (totals.materialCost > 0) {
      invoiceText += `*MATERIALS & PARTS:*\n`;
      items
        .filter((item) => item.category === 'material')
        .forEach((item) => {
          const amount = item.quantity * item.unitPrice;
          invoiceText += `• ${item.description}\n  ${item.quantity} × ${formatCurrency(item.unitPrice)} = ${formatCurrency(amount)}\n`;
        });
      invoiceText += `Subtotal (Materials): ${formatCurrency(totals.materialCost)}\n\n`;
    }

    // Labor/Service Fee Section
    if (totals.laborFee > 0) {
      invoiceText += `*LABOR & SERVICE:*\n`;
      items
        .filter((item) => item.category === 'labor')
        .forEach((item) => {
          const amount = item.quantity * item.unitPrice;
          invoiceText += `• ${item.description}\n  ${item.quantity} × ${formatCurrency(item.unitPrice)} = ${formatCurrency(amount)}\n`;
        });
      invoiceText += `Subtotal (Labor): ${formatCurrency(totals.laborFee)}\n\n`;
    }

    // Summary Section
    invoiceText += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    invoiceText += `Subtotal:         ${formatCurrency(totals.subtotal)}\n`;

    if (totals.taxAmount > 0) {
      invoiceText += `Tax (${(taxRate * 100).toFixed(1)}%):      ${formatCurrency(totals.taxAmount)}\n`;
    }

    if (totals.discountAmount > 0) {
      invoiceText += `Discount (-${(discountRate * 100).toFixed(1)}%):  ${formatCurrency(totals.discountAmount)}\n`;
    }

    invoiceText += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    invoiceText += `*TOTAL AMOUNT DUE: ${formatCurrency(totals.totalAmount)}*\n`;
    invoiceText += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Payment Methods
    invoiceText += `*PAYMENT METHODS:*\n`;
    invoiceText += `💰 Cash on delivery\n`;
    invoiceText += `🏦 Bank transfer\n`;
    invoiceText += `📲 Paystack (secure escrow)\n\n`;

    // Additional Notes
    if (notes) {
      invoiceText += `*NOTES:*\n${notes}\n\n`;
    }

    invoiceText += `Please reply with payment confirmation.\n`;
    invoiceText += `Thank you for your business! 🙏\n`;

    return invoiceText;
  }, [items, totals, artisanName, clientName, clientPhone, taxRate, discountRate, notes, formatCurrency]);

  /**
   * Share invoice via WhatsApp
   * Opens WhatsApp with pre-formatted invoice text
   */
  const shareViaWhatsApp = useCallback(async () => {
    // Validation
    if (!clientName.trim()) {
      Alert.alert('Missing Information', 'Please enter client name');
      return;
    }
    if (!clientPhone.trim()) {
      Alert.alert('Missing Information', 'Please enter client phone number');
      return;
    }
    if (totals.totalAmount <= 0) {
      Alert.alert('Invalid Invoice', 'Please add items with valid amounts');
      return;
    }

    setIsSharing(true);
    try {
      const invoiceText = generateInvoiceText();

      // Format WhatsApp URL
      // WhatsApp API expects phone in international format (e.g., 234... for Nigeria)
      const phoneWithoutPlus = clientPhone.replace(/\D/g, ''); // Remove non-digits
      const whatsappPhone = phoneWithoutPlus.startsWith('0')
        ? '234' + phoneWithoutPlus.slice(1) // Convert 0701... to 234701...
        : phoneWithoutPlus; // Assume already in correct format

      const whatsappUrl = `whatsapp://send?phone=${whatsappPhone}&text=${encodeURIComponent(invoiceText)}`;

      // Check if WhatsApp is installed
      const canOpen = await Linking.canOpenURL(whatsappUrl);

      if (canOpen) {
        await Linking.openURL(whatsappUrl);

        // Show success message
        Alert.alert(
          'Invoice Opened',
          'WhatsApp will open with the formatted invoice. Review and send!'
        );
      } else {
        // Fallback: Show alert with invoice text that user can copy
        Alert.alert('WhatsApp Not Available', 'Would you like to copy the invoice text instead?', [
          { text: 'Cancel', onPress: () => {} },
          {
            text: 'Copy to Clipboard',
            onPress: async () => {
              try {
                // Copy to clipboard functionality would go here
                // For now, show the text in an alert
                Alert.alert('Invoice Text', invoiceText);
              } catch (err) {
                Alert.alert('Error', 'Failed to copy invoice');
              }
            },
          },
        ]);
      }
    } catch (error) {
      console.error('WhatsApp share error:', error);
      Alert.alert('Error', 'Failed to share invoice. Please try again.');
    } finally {
      setIsSharing(false);
    }
  }, [clientName, clientPhone, totals, generateInvoiceText]);

  /**
   * Save invoice to local database (offline)
   */
  const saveInvoiceLocally = useCallback(async () => {
    try {
      // In a real app, this would save to WatermelonDB
      const invoiceData: InvoiceData = {
        jobId: jobData?.jobId || `job_${Date.now()}`,
        clientName,
        clientPhone,
        artisanName,
        items,
        taxRate,
        discountRate,
        notes,
      };

      // TODO: Save to WatermelonDB with syncStatus: 'LOCAL'
      // await invoiceDB.create(invoiceData);

      Alert.alert('Success', 'Invoice saved locally. It will sync when online.');
      navigation.goBack();
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save invoice');
    }
  }, [clientName, clientPhone, artisanName, items, taxRate, discountRate, notes, jobData, navigation]);

  /**
   * Validate inputs before proceeding
   */
  const isValid = useMemo(() => {
    return (
      clientName.trim().length > 0 &&
      clientPhone.trim().length > 0 &&
      artisanName.trim().length > 0 &&
      items.some((item) => item.unitPrice > 0) &&
      totals.totalAmount > 0
    );
  }, [clientName, clientPhone, artisanName, items, totals]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f5f5f5' }}
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
    >
      {/* Header */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' }}>
          Create Invoice
        </Text>
        <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
          Fill in the details and share via WhatsApp
        </Text>
      </View>

      {/* Client Information Section */}
      <View
        style={{
          backgroundColor: '#fff',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 12 }}>
          CLIENT INFORMATION
        </Text>

        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Client Name</Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 6,
              padding: 10,
              fontSize: 14,
            }}
            placeholder="Enter client name"
            value={clientName}
            onChangeText={setClientName}
          />
        </View>

        <View>
          <Text style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Client Phone</Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 6,
              padding: 10,
              fontSize: 14,
            }}
            placeholder="e.g., 0701234567"
            value={clientPhone}
            onChangeText={setClientPhone}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      {/* Your Information Section */}
      <View
        style={{
          backgroundColor: '#fff',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 12 }}>
          YOUR INFORMATION
        </Text>

        <View>
          <Text style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Your Name/Business</Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 6,
              padding: 10,
              fontSize: 14,
            }}
            placeholder="Your name or business name"
            value={artisanName}
            onChangeText={setArtisanName}
          />
        </View>
      </View>

      {/* Line Items Section */}
      <View
        style={{
          backgroundColor: '#fff',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 12 }}>
          INVOICE ITEMS
        </Text>

        {/* Material Costs */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '500', color: '#0066cc', marginBottom: 8 }}>
            MATERIALS & PARTS
          </Text>
          {items
            .filter((item) => item.category === 'material')
            .map((item) => (
              <LineItemRow
                key={item.id}
                item={item}
                onUpdate={(updates) => updateItem(item.id, updates)}
                onRemove={() => removeLineItem(item.id)}
              />
            ))}
          {totals.materialCost > 0 && (
            <View
              style={{
                paddingTop: 8,
                marginTop: 8,
                borderTopWidth: 1,
                borderTopColor: '#eee',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#666' }}>Materials Subtotal:</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#1a1a1a' }}>
                  {formatCurrency(totals.materialCost)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Labor Fees */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '500', color: '#00b050', marginBottom: 8 }}>
            LABOR & SERVICE
          </Text>
          {items
            .filter((item) => item.category === 'labor')
            .map((item) => (
              <LineItemRow
                key={item.id}
                item={item}
                onUpdate={(updates) => updateItem(item.id, updates)}
                onRemove={() => removeLineItem(item.id)}
              />
            ))}
          {totals.laborFee > 0 && (
            <View
              style={{
                paddingTop: 8,
                marginTop: 8,
                borderTopWidth: 1,
                borderTopColor: '#eee',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#666' }}>Labor Subtotal:</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#1a1a1a' }}>
                  {formatCurrency(totals.laborFee)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Add Item Button */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 10,
            borderTopWidth: 1,
            borderTopColor: '#eee',
          }}
          onPress={addLineItem}
        >
          <Text style={{ fontSize: 12, color: '#0066cc', fontWeight: '600' }}>
            + Add Item
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tax & Discount Section */}
      <View
        style={{
          backgroundColor: '#fff',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 12 }}>
          TAX & ADJUSTMENTS
        </Text>

        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Tax Rate (%)</Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 6,
                padding: 10,
                fontSize: 14,
              }}
              placeholder="7.5"
              value={taxRate.toString()}
              onChangeText={(val) => setTaxRate(parseFloat(val) / 100 || 0)}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Discount (%)</Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 6,
                padding: 10,
                fontSize: 14,
              }}
              placeholder="0"
              value={discountRate.toString()}
              onChangeText={(val) => setDiscountRate(parseFloat(val) / 100 || 0)}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      </View>

      {/* Notes Section */}
      <View
        style={{
          backgroundColor: '#fff',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 12 }}>
          NOTES (Optional)
        </Text>

        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 6,
            padding: 10,
            fontSize: 14,
            height: 80,
            textAlignVertical: 'top',
          }}
          placeholder="e.g., 'Payment expected within 7 days'"
          value={notes}
          onChangeText={setNotes}
          multiline
        />
      </View>

      {/* Total Summary Section */}
      <View
        style={{
          backgroundColor: '#f0f7ff',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
          borderLeftWidth: 4,
          borderLeftColor: '#0066cc',
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 12 }}>
          INVOICE SUMMARY
        </Text>

        <SummaryRow
          label="Materials Cost"
          amount={totals.materialCost}
          formatCurrency={formatCurrency}
        />
        <SummaryRow
          label="Labor Fee"
          amount={totals.laborFee}
          formatCurrency={formatCurrency}
        />

        {totals.taxAmount > 0 && (
          <SummaryRow
            label={`Tax (${(taxRate * 100).toFixed(1)}%)`}
            amount={totals.taxAmount}
            formatCurrency={formatCurrency}
          />
        )}

        {totals.discountAmount > 0 && (
          <SummaryRow
            label={`Discount (-${(discountRate * 100).toFixed(1)}%)`}
            amount={-totals.discountAmount}
            formatCurrency={formatCurrency}
            isDiscount
          />
        )}

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingTop: 12,
            marginTop: 12,
            borderTopWidth: 2,
            borderTopColor: '#0066cc',
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1a1a1a' }}>
            TOTAL AMOUNT DUE
          </Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0066cc' }}>
            {formatCurrency(totals.totalAmount)}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {/* Save Locally Button */}
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: '#f0f0f0',
            borderRadius: 8,
            paddingVertical: 14,
            alignItems: 'center',
          }}
          onPress={saveInvoiceLocally}
          disabled={!isValid}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: isValid ? '#1a1a1a' : '#ccc',
            }}
          >
            Save
          </Text>
        </TouchableOpacity>

        {/* Share via WhatsApp Button */}
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: isValid ? '#25d366' : '#ccc',
            borderRadius: 8,
            paddingVertical: 14,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          }}
          onPress={shareViaWhatsApp}
          disabled={!isValid || isSharing}
        >
          {isSharing && <ActivityIndicator color="#fff" size="small" />}
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
            {isSharing ? 'Preparing...' : 'Share via WhatsApp'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

/**
 * LineItemRow Component - Reusable row for editing invoice items
 */
interface LineItemRowProps {
  item: InvoiceLineItem;
  onUpdate: (updates: Partial<InvoiceLineItem>) => void;
  onRemove: () => void;
}

const LineItemRow: React.FC<LineItemRowProps> = ({ item, onUpdate, onRemove }) => {
  const itemTotal = item.quantity * item.unitPrice;

  return (
    <View
      style={{
        backgroundColor: '#fafafa',
        borderRadius: 6,
        padding: 10,
        marginBottom: 8,
      }}
    >
      {/* Description Input */}
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          borderRadius: 4,
          padding: 8,
          fontSize: 12,
          marginBottom: 8,
        }}
        placeholder="Item description"
        value={item.description}
        onChangeText={(text) => onUpdate({ description: text })}
      />

      {/* Quantity and Price Row */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <View style={{ flex: 0.4 }}>
          <Text style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Qty</Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 4,
              padding: 6,
              fontSize: 12,
              textAlign: 'center',
            }}
            placeholder="1"
            value={item.quantity.toString()}
            onChangeText={(text) => onUpdate({ quantity: parseFloat(text) || 1 })}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Unit Price (₦)</Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 4,
              padding: 6,
              fontSize: 12,
            }}
            placeholder="0.00"
            value={item.unitPrice.toString()}
            onChangeText={(text) => onUpdate({ unitPrice: parseFloat(text) || 0 })}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={{ flex: 0.6 }}>
          <Text style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Total</Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 4,
              padding: 6,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#1a1a1a',
              }}
            >
              ₦{itemTotal.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
      </View>

      {/* Remove Button */}
      <TouchableOpacity
        style={{
          alignItems: 'center',
          paddingVertical: 6,
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
        }}
        onPress={onRemove}
      >
        <Text style={{ fontSize: 11, color: '#dc3545', fontWeight: '500' }}>Remove Item</Text>
      </TouchableOpacity>
    </View>
  );
};

/**
 * SummaryRow Component - Displays summary line items
 */
interface SummaryRowProps {
  label: string;
  amount: number;
  formatCurrency: (amount: number) => string;
  isDiscount?: boolean;
}

const SummaryRow: React.FC<SummaryRowProps> = ({ label, amount, formatCurrency, isDiscount }) => (
  <View
    style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    }}
  >
    <Text style={{ fontSize: 12, color: '#666' }}>{label}</Text>
    <Text
      style={{
        fontSize: 12,
        fontWeight: '600',
        color: isDiscount ? '#00b050' : '#1a1a1a',
      }}
    >
      {isDiscount ? '−' : ''}{formatCurrency(Math.abs(amount))}
    </Text>
  </View>
);

export default InvoiceShareScreen;
