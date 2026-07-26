/**
 * Expenses Screen
 *
 * Quick logging of daily operational expenses (fuel, transport, tools).
 * Shows summary and allows adding new expenses.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
}

/**
 * Expenses Screen Component
 */
export const ExpensesScreen: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [selectedCategory, setSelectedCategory] = useState('fuel');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  const categories = [
    { id: 'fuel', label: 'Fuel', icon: 'gas-cylinder', color: '#ff9800' },
    { id: 'transport', label: 'Transport', icon: 'car', color: '#2196f3' },
    { id: 'tools', label: 'Tools', icon: 'hammer', color: '#9c27b0' },
    { id: 'equipment', label: 'Equipment', icon: 'cog', color: '#673ab7' },
    { id: 'other', label: 'Other', icon: 'package', color: '#9e9e9e' },
  ];

  /**
   * Load expenses data
   */
  useEffect(() => {
    const loadExpenses = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));

        const today = new Date().toISOString().split('T')[0];

        setExpenses([
          {
            id: 'exp_1',
            category: 'fuel',
            description: 'Fuel - Trip to Lekki',
            amount: 2500,
            date: today,
          },
          {
            id: 'exp_2',
            category: 'transport',
            description: 'Uber to meeting',
            amount: 1500,
            date: today,
          },
          {
            id: 'exp_3',
            category: 'tools',
            description: 'PVC cutter',
            amount: 3500,
            date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          },
        ]);
      } catch (error) {
        console.error('[Expenses] Load error:', error);
        Alert.alert('Error', 'Failed to load expenses');
      } finally {
        setIsLoading(false);
      }
    };

    loadExpenses();
  }, []);

  /**
   * Handle add expense
   */
  const handleAddExpense = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 300));

      const newExpense: Expense = {
        id: `exp_${Date.now()}`,
        category: selectedCategory,
        description,
        amount: parseFloat(amount),
        date: new Date().toISOString().split('T')[0],
      };

      setExpenses([newExpense, ...expenses]);

      // Reset form
      setDescription('');
      setAmount('');
      setSelectedCategory('fuel');
      setShowAddModal(false);
      Keyboard.dismiss();

      Alert.alert('Success', 'Expense logged successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to add expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Calculate summary
   */
  const today = new Date().toISOString().split('T')[0];
  const todayExpenses = expenses.filter((e) => e.date === today);
  const totalToday = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  /**
   * Get category info
   */
  const getCategoryInfo = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId) || categories[0];
  };

  /**
   * Format currency
   */
  const formatCurrency = (amount: number): string => {
    return `₦${amount.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
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
        {/* Summary Card */}
        <View style={{ padding: 16, gap: 12 }}>
          <View
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
            <Text style={{ fontSize: 12, color: '#666', marginBottom: 8, fontWeight: '500' }}>
              TODAY'S EXPENSES
            </Text>
            <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#ff9800', marginBottom: 4 }}>
              {formatCurrency(totalToday)}
            </Text>
            <Text style={{ fontSize: 12, color: '#999' }}>
              {todayExpenses.length} transaction{todayExpenses.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Quick Add Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowAddModal(true)}
            style={{
              backgroundColor: '#0066cc',
              borderRadius: 12,
              paddingVertical: 14,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
              Log Expense
            </Text>
          </TouchableOpacity>
        </View>

        {/* Expenses List */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 }}>
          {expenses.length > 0 ? (
            expenses.map((expense) => {
              const category = getCategoryInfo(expense.category);
              const isToday = expense.date === today;

              return (
                <View
                  key={expense.id}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    opacity: isToday ? 1 : 0.7,
                  }}
                >
                  {/* Category Icon */}
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: `${category.color}20`,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <MaterialCommunityIcons
                      name={category.icon}
                      size={20}
                      color={category.color}
                    />
                  </View>

                  {/* Details */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1a1a1a' }}>
                      {category.label}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                      {expense.description}
                    </Text>
                  </View>

                  {/* Amount */}
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#ff9800' }}>
                    {formatCurrency(expense.amount)}
                  </Text>
                </View>
              );
            })
          ) : (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <MaterialCommunityIcons name="cash" size={64} color="#ddd" />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#1a1a1a',
                  marginTop: 16,
                }}
              >
                No expenses logged
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: '#666',
                  marginTop: 8,
                  textAlign: 'center',
                }}
              >
                Log your daily expenses to track profitability
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Expense Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: '#fff',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: 24,
              paddingBottom: 32,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' }}>
                Log Expense
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Category Selection */}
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 12 }}>
              Category
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor:
                      selectedCategory === cat.id
                        ? cat.color
                        : '#f0f0f0',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <MaterialCommunityIcons
                    name={cat.icon}
                    size={16}
                    color={
                      selectedCategory === cat.id ? '#fff' : '#666'
                    }
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color:
                        selectedCategory === cat.id ? '#fff' : '#666',
                    }}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Description Input */}
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 }}>
              Description
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                fontSize: 14,
              }}
              placeholder="e.g., Fuel - Trip to Lekki"
              value={description}
              onChangeText={setDescription}
            />

            {/* Amount Input */}
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 }}>
              Amount (₦)
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 8,
                padding: 12,
                marginBottom: 24,
                fontSize: 14,
              }}
              placeholder="Enter amount"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />

            {/* Add Button */}
            <TouchableOpacity
              onPress={handleAddExpense}
              disabled={isSubmitting}
              style={{
                backgroundColor: '#0066cc',
                borderRadius: 8,
                paddingVertical: 14,
                alignItems: 'center',
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
                  Add Expense
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ExpensesScreen;
