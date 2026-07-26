/**
 * app/(auth)/register.tsx
 *
 * Trade Onboarding & Registration Screen for Woka
 *
 * Features:
 * - 3-step registration flow (Personal → Trade → Rates)
 * - Phone number formatting for Nigerian numbers (+234)
 * - Trade selection with search capability
 * - Rate configuration with dual pricing models
 * - Form validation at each step
 * - Secure token storage via SecureStore
 * - Accessible UI for varying screen sizes
 * - Full TypeScript support
 *
 * Artisan Flow:
 * 1. Enter name, business name, phone (with auto +234 formatting)
 * 2. Select trade from grid (Electrician, Plumber, Mechanic, etc.)
 * 3. Set hourly rate or fixed project fee
 * 4. Register → Store token → Navigate to dashboard
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

type RegistrationStep = 1 | 2 | 3;

type TradeType =
  | 'electrician'
  | 'plumber'
  | 'mechanic'
  | 'welder'
  | 'carpenter'
  | 'painter'
  | 'ac_technician';

interface Trade {
  id: TradeType;
  name: string;
  icon: string; // Emoji for display
  description: string;
}

interface RegistrationForm {
  fullName: string;
  businessName: string;
  phoneNumber: string;
  trade: TradeType | null;
  hourlyRate: string;
  useFixedFee: boolean;
  fixedFeeAmount: string;
}

interface ValidationError {
  field: keyof RegistrationForm;
  message: string;
}

// Available trades for Nigerian artisans
const AVAILABLE_TRADES: Trade[] = [
  {
    id: 'electrician',
    name: 'Electrician',
    icon: '⚡',
    description: 'Electrical installation & repairs',
  },
  {
    id: 'plumber',
    name: 'Plumber',
    icon: '🚰',
    description: 'Plumbing & water systems',
  },
  {
    id: 'mechanic',
    name: 'Auto Mechanic',
    icon: '🔧',
    description: 'Vehicle repair & maintenance',
  },
  {
    id: 'welder',
    name: 'Welder/Fabricator',
    icon: '🔨',
    description: 'Metal fabrication & welding',
  },
  {
    id: 'carpenter',
    name: 'Carpenter',
    icon: '🪵',
    description: 'Woodwork & carpentry',
  },
  {
    id: 'painter',
    name: 'Painter',
    icon: '🎨',
    description: 'Painting & decoration',
  },
  {
    id: 'ac_technician',
    name: 'AC Technician',
    icon: '❄️',
    description: 'Air conditioning & cooling',
  },
];

// Color scheme for Woka
const COLORS = {
  primary: '#0066cc', // Primary Action Blue
  primaryLight: '#E3F2FD',
  success: '#4CAF50',
  error: '#F44336',
  neutral: '#F5F5F5',
  border: '#E0E0E0',
  text: '#212121',
  textLight: '#757575',
  white: '#FFFFFF',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// REGISTRATION COMPONENT
// ============================================================================

export default function RegisterScreen() {
  // ======================================================================
  // HOOKS & STATE
  // ======================================================================

  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Step tracking
  const [currentStep, setCurrentStep] = useState<RegistrationStep>(1);

  // Form data
  const [form, setForm] = useState<RegistrationForm>({
    fullName: '',
    businessName: '',
    phoneNumber: '',
    trade: null,
    hourlyRate: '',
    useFixedFee: false,
    fixedFeeAmount: '',
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [tradeSearchQuery, setTradeSearchQuery] = useState('');
  const [errors, setErrors] = useState<ValidationError[]>();

  // ======================================================================
  // VALIDATION FUNCTIONS
  // ======================================================================

  /**
   * Validate Step 1: Personal Details
   * - Full name: non-empty
   * - Business name: non-empty
   * - Phone: exactly 10 or 11 digits (Nigerian format)
   */
  const validateStep1 = (): boolean => {
    const newErrors: ValidationError[] = [];

    if (!form.fullName.trim()) {
      newErrors.push({
        field: 'fullName',
        message: 'Full name is required',
      });
    }

    if (!form.businessName.trim()) {
      newErrors.push({
        field: 'businessName',
        message: 'Business name is required',
      });
    }

    const phoneDigits = form.phoneNumber.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      newErrors.push({
        field: 'phoneNumber',
        message: 'Phone number must be 10 or 11 digits',
      });
    }

    setErrors(newErrors.length > 0 ? newErrors : undefined);
    return newErrors.length === 0;
  };

  /**
   * Validate Step 2: Trade Selection
   * - Trade must be selected
   */
  const validateStep2 = (): boolean => {
    const newErrors: ValidationError[] = [];

    if (!form.trade) {
      newErrors.push({
        field: 'trade',
        message: 'Please select your trade',
      });
    }

    setErrors(newErrors.length > 0 ? newErrors : undefined);
    return newErrors.length === 0;
  };

  /**
   * Validate Step 3: Pricing
   * - If hourly: rate must be > 0
   * - If fixed fee: amount must be > 0
   */
  const validateStep3 = (): boolean => {
    const newErrors: ValidationError[] = [];

    if (!form.useFixedFee) {
      if (!form.hourlyRate || parseFloat(form.hourlyRate) <= 0) {
        newErrors.push({
          field: 'hourlyRate',
          message: 'Please enter a valid hourly rate',
        });
      }
    } else {
      if (!form.fixedFeeAmount || parseFloat(form.fixedFeeAmount) <= 0) {
        newErrors.push({
          field: 'fixedFeeAmount',
          message: 'Please enter a valid project fee',
        });
      }
    }

    setErrors(newErrors.length > 0 ? newErrors : undefined);
    return newErrors.length === 0;
  };

  const getErrorMessage = (field: keyof RegistrationForm): string | undefined => {
    return errors?.find((err) => err.field === field)?.message;
  };

  // ======================================================================
  // STEP NAVIGATION FUNCTIONS
  // ======================================================================

  const handleNextStep = () => {
    let isValid = false;

    switch (currentStep) {
      case 1:
        isValid = validateStep1();
        break;
      case 2:
        isValid = validateStep2();
        break;
      case 3:
        isValid = validateStep3();
        break;
    }

    if (isValid) {
      if (currentStep < 3) {
        setCurrentStep((currentStep + 1) as RegistrationStep);
      } else {
        handleSubmit();
      }
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as RegistrationStep);
      setErrors(undefined);
    }
  };

  // ======================================================================
  // PHONE NUMBER FORMATTING
  // ======================================================================

  /**
   * Format Nigerian phone number with automatic +234 prefix
   * Input: "08012345678" → Output: "+234 801 234 5678"
   * Input: "2348012345678" → Output: "+234 801 234 5678"
   */
  const handlePhoneChange = (text: string) => {
    // Remove all non-digits
    let digits = text.replace(/\D/g, '');

    // Remove leading 0 (common in Nigeria)
    if (digits.startsWith('0')) {
      digits = digits.substring(1);
    }

    // Remove leading country code if present
    if (digits.startsWith('234')) {
      digits = digits.substring(3);
    }

    // Limit to 10 digits (Nigerian phone numbers after country code)
    digits = digits.substring(0, 10);

    // Format with spaces for readability
    let formatted = '';
    if (digits.length <= 3) {
      formatted = digits;
    } else if (digits.length <= 6) {
      formatted = `${digits.slice(0, 3)} ${digits.slice(3)}`;
    } else {
      formatted = `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }

    // Prepend +234
    if (digits.length > 0) {
      formatted = `+234 ${formatted}`;
    }

    setForm({ ...form, phoneNumber: formatted });
  };

  // ======================================================================
  // SEARCH FILTERED TRADES
  // ======================================================================

  const filteredTrades = useMemo(() => {
    if (!tradeSearchQuery.trim()) {
      return AVAILABLE_TRADES;
    }

    const query = tradeSearchQuery.toLowerCase();
    return AVAILABLE_TRADES.filter(
      (trade) =>
        trade.name.toLowerCase().includes(query) ||
        trade.description.toLowerCase().includes(query)
    );
  }, [tradeSearchQuery]);

  // ======================================================================
  // REGISTRATION SUBMISSION
  // ======================================================================

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      // Prepare registration payload
      const payload = {
        fullName: form.fullName.trim(),
        businessName: form.businessName.trim(),
        phoneNumber: form.phoneNumber.replace(/\D/g, ''), // Store only digits
        trade: form.trade,
        hourlyRate: form.useFixedFee ? null : parseFloat(form.hourlyRate),
        fixedFeeAmount: form.useFixedFee ? parseFloat(form.fixedFeeAmount) : null,
        currency: 'NGN', // Nigerian Naira
        registeredAt: new Date().toISOString(),
      };

      // Mock API call (replace with real API when ready)
      console.log('📝 Registration payload:', payload);

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock successful response
      const mockResponse = {
        success: true,
        token: 'mock_jwt_token_' + Date.now(),
        user: {
          id: 'user_' + Date.now(),
          ...payload,
        },
      };

      // Store token securely
      await SecureStore.setItemAsync('authToken', mockResponse.token);
      await SecureStore.setItemAsync('userId', mockResponse.user.id);
      await SecureStore.setItemAsync('userTrade', form.trade!);

      // Navigation: Replace to prevent back button showing login
      router.replace('/(tabs)');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';

      Alert.alert('Registration Error', errorMessage, [
        {
          text: 'Try Again',
          onPress: () => {
            setIsLoading(false);
          },
        },
      ]);

      console.error('❌ Registration error:', error);
      setIsLoading(false);
    }
  };

  // ======================================================================
  // RENDER: STEP 1 - PERSONAL DETAILS
  // ======================================================================

  const renderStep1 = () => (
    <ScrollView
      style={styles.stepContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Step indicator */}
      <View style={styles.stepIndicator}>
        <Text style={styles.stepTitle}>Step 1 of 3: Your Details</Text>
        <Text style={styles.stepDescription}>Tell us about yourself and your business</Text>
      </View>

      {/* Full Name Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Full Name *</Text>
        <TextInput
          style={[
            styles.textInput,
            getErrorMessage('fullName') && styles.inputError,
          ]}
          placeholder="e.g., Chidike Okafor"
          placeholderTextColor="#999"
          value={form.fullName}
          onChangeText={(text) => setForm({ ...form, fullName: text })}
          editable={!isLoading}
          maxLength={50}
        />
        {getErrorMessage('fullName') && (
          <Text style={styles.errorText}>{getErrorMessage('fullName')}</Text>
        )}
      </View>

      {/* Business Name Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Business Name *</Text>
        <TextInput
          style={[
            styles.textInput,
            getErrorMessage('businessName') && styles.inputError,
          ]}
          placeholder="e.g., Chi's Quality Plumbing"
          placeholderTextColor="#999"
          value={form.businessName}
          onChangeText={(text) => setForm({ ...form, businessName: text })}
          editable={!isLoading}
          maxLength={50}
        />
        {getErrorMessage('businessName') && (
          <Text style={styles.errorText}>{getErrorMessage('businessName')}</Text>
        )}
      </View>

      {/* Phone Number Input with Automatic Formatting */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Phone Number (Nigerian) *</Text>
        <TextInput
          style={[
            styles.textInput,
            getErrorMessage('phoneNumber') && styles.inputError,
          ]}
          placeholder="Enter your phone number"
          placeholderTextColor="#999"
          value={form.phoneNumber}
          onChangeText={handlePhoneChange}
          keyboardType="phone-pad"
          editable={!isLoading}
          maxLength={20}
        />
        <Text style={styles.helperText}>
          📱 Format: +234 801 234 5678 (auto-formatted)
        </Text>
        {getErrorMessage('phoneNumber') && (
          <Text style={styles.errorText}>{getErrorMessage('phoneNumber')}</Text>
        )}
      </View>

      {/* Navigation Buttons */}
      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={handleNextStep}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Loading...' : 'Continue to Trade Selection'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ======================================================================
  // RENDER: STEP 2 - TRADE SELECTION
  // ======================================================================

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      {/* Step indicator */}
      <View style={styles.stepIndicator}>
        <Text style={styles.stepTitle}>Step 2 of 3: Select Your Trade</Text>
        <Text style={styles.stepDescription}>What's your primary trade?</Text>
      </View>

      {/* Trade Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search trades..."
          placeholderTextColor="#999"
          value={tradeSearchQuery}
          onChangeText={setTradeSearchQuery}
          editable={!isLoading}
        />
      </View>

      {/* Trade Grid */}
      <FlatList
        data={filteredTrades}
        keyExtractor={(item) => item.id}
        numColumns={2}
        scrollEnabled={false}
        contentContainerStyle={styles.tradeGrid}
        columnWrapperStyle={styles.tradeGridRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.tradeCard,
              form.trade === item.id && styles.tradeCardSelected,
            ]}
            onPress={() => {
              setForm({ ...form, trade: item.id });
              setErrors(undefined);
            }}
            activeOpacity={0.7}
            disabled={isLoading}
          >
            {/* Trade Icon */}
            <Text style={styles.tradeIcon}>{item.icon}</Text>

            {/* Trade Name */}
            <Text style={styles.tradeName}>{item.name}</Text>

            {/* Trade Description */}
            <Text style={styles.tradeDescription}>{item.description}</Text>

            {/* Selection Indicator */}
            {form.trade === item.id && (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />

      {getErrorMessage('trade') && (
        <Text style={styles.errorText}>{getErrorMessage('trade')}</Text>
      )}

      {/* Navigation Buttons */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handlePreviousStep}
          disabled={isLoading}
        >
          <Text style={styles.secondaryButtonText}>← Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.primaryButton,
            !form.trade && styles.buttonDisabled,
          ]}
          onPress={handleNextStep}
          disabled={isLoading || !form.trade}
        >
          <Text style={styles.buttonText}>Continue to Rates →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ======================================================================
  // RENDER: STEP 3 - PRICING CONFIGURATION
  // ======================================================================

  const renderStep3 = () => (
    <ScrollView
      style={styles.stepContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Step indicator */}
      <View style={styles.stepIndicator}>
        <Text style={styles.stepTitle}>Step 3 of 3: Set Your Rates</Text>
        <Text style={styles.stepDescription}>How much do you charge for your work?</Text>
      </View>

      {/* Pricing Mode Toggle */}
      <View style={styles.modeToggleContainer}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            !form.useFixedFee && styles.modeButtonActive,
          ]}
          onPress={() => setForm({ ...form, useFixedFee: false })}
          disabled={isLoading}
        >
          <Text
            style={[
              styles.modeButtonText,
              !form.useFixedFee && styles.modeButtonTextActive,
            ]}
          >
            ⏱️ Hourly Rate
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeButton,
            form.useFixedFee && styles.modeButtonActive,
          ]}
          onPress={() => setForm({ ...form, useFixedFee: true })}
          disabled={isLoading}
        >
          <Text
            style={[
              styles.modeButtonText,
              form.useFixedFee && styles.modeButtonTextActive,
            ]}
          >
            📋 Fixed Fee
          </Text>
        </TouchableOpacity>
      </View>

      {/* Hourly Rate Input (conditional) */}
      {!form.useFixedFee && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Base Hourly Rate (₦) *</Text>
          <View style={styles.currencyInput}>
            <Text style={styles.currencySymbol}>₦</Text>
            <TextInput
              style={styles.currencyField}
              placeholder="e.g., 5000"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              value={form.hourlyRate}
              onChangeText={(text) =>
                setForm({ ...form, hourlyRate: text.replace(/[^0-9]/g, '') })
              }
              editable={!isLoading}
            />
          </View>
          <Text style={styles.helperText}>
            💡 Tip: Start with ₦5,000-₦10,000/hour for most trades
          </Text>
          {getErrorMessage('hourlyRate') && (
            <Text style={styles.errorText}>{getErrorMessage('hourlyRate')}</Text>
          )}
        </View>
      )}

      {/* Fixed Fee Input (conditional) */}
      {form.useFixedFee && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Default Project Fee (₦) *</Text>
          <View style={styles.currencyInput}>
            <Text style={styles.currencySymbol}>₦</Text>
            <TextInput
              style={styles.currencyField}
              placeholder="e.g., 50000"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              value={form.fixedFeeAmount}
              onChangeText={(text) =>
                setForm({ ...form, fixedFeeAmount: text.replace(/[^0-9]/g, '') })
              }
              editable={!isLoading}
            />
          </View>
          <Text style={styles.helperText}>
            💡 You can adjust fees per project in your dashboard
          </Text>
          {getErrorMessage('fixedFeeAmount') && (
            <Text style={styles.errorText}>{getErrorMessage('fixedFeeAmount')}</Text>
          )}
        </View>
      )}

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>📋 Registration Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Name:</Text>
          <Text style={styles.summaryValue}>{form.fullName}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Business:</Text>
          <Text style={styles.summaryValue}>{form.businessName}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Trade:</Text>
          <Text style={styles.summaryValue}>
            {AVAILABLE_TRADES.find((t) => t.id === form.trade)?.name}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Rate:</Text>
          <Text style={styles.summaryValue}>
            {form.useFixedFee
              ? `₦${form.fixedFeeAmount}/project`
              : `₦${form.hourlyRate}/hour`}
          </Text>
        </View>
      </View>

      {/* Navigation Buttons */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handlePreviousStep}
          disabled={isLoading}
        >
          <Text style={styles.secondaryButtonText}>← Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton, isLoading && styles.buttonLoading]}
          onPress={handleNextStep}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <Text style={styles.buttonText}>Complete Registration ✓</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ======================================================================
  // RENDER: MAIN COMPONENT
  // ======================================================================

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressFill, { width: `${(currentStep / 3) * 100}%` }]} />
        </View>

        {/* Step Content */}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  stepContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  // Progress bar
  progressContainer: {
    height: 4,
    backgroundColor: COLORS.neutral,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },

  // Step indicator
  stepIndicator: {
    marginBottom: 24,
  },

  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },

  stepDescription: {
    fontSize: 16,
    color: COLORS.textLight,
    lineHeight: 24,
  },

  // Input styles
  inputGroup: {
    marginBottom: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },

  textInput: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },

  inputError: {
    borderColor: COLORS.error,
    backgroundColor: '#FEF5F5',
  },

  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 6,
    fontWeight: '500',
  },

  helperText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 6,
    fontStyle: 'italic',
  },

  // Trade selection
  searchContainer: {
    marginBottom: 20,
  },

  searchInput: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },

  tradeGrid: {
    marginBottom: 20,
  },

  tradeGridRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  tradeCard: {
    width: (SCREEN_WIDTH - 52) / 2, // Account for padding and gap
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: COLORS.neutral,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  tradeCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },

  tradeIcon: {
    fontSize: 40,
    marginBottom: 8,
  },

  tradeName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },

  tradeDescription: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 14,
  },

  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkmarkText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },

  // Pricing mode toggle
  modeToggleContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },

  modeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
  },

  modeButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },

  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
  },

  modeButtonTextActive: {
    color: COLORS.primary,
  },

  // Currency input
  currencyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
  },

  currencySymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginRight: 4,
  },

  currencyField: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    fontSize: 16,
    color: COLORS.text,
  },

  // Summary card
  summaryCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },

  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 12,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  summaryLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },

  summaryValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },

  // Buttons
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },

  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButton: {
    backgroundColor: COLORS.primary,
  },

  secondaryButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },

  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },

  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  buttonLoading: {
    opacity: 0.8,
  },
});
