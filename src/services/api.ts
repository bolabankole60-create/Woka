/**
 * API Client Service
 *
 * Handles all communication with backend server.
 * Features:
 * - Automatic JWT token refresh
 * - Request/response interceptors
 * - Error handling with retry logic
 * - Batch sync operations for offline queue
 *
 * Environment Variables (in .env):
 * - API_BASE_URL: Backend API endpoint
 * - PAYSTACK_PUBLIC_KEY: Paystack integration
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

interface SyncOperation {
  id: string;
  entityType: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  clientVersion: number;
  changes: any;
}

interface SyncResult {
  operationId: string;
  success: boolean;
  conflict?: boolean;
  rejected?: boolean;
  serverVersion?: number;
  data?: any;
  error?: string;
}

/**
 * API Client Singleton
 */
class APIClient {
  private client: AxiosInstance;
  private baseURL: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.baseURL = process.env.EXPO_PUBLIC_API_URL || 'https://api.tradify.local';

    // Initialize axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor: add JWT token
    this.client.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor: handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retried, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newTokens = await this.refreshAccessToken();
            if (newTokens) {
              originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Redirect to login
            // TODO: Emit event to clear auth state
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Load tokens from secure storage
   */
  async loadTokens(): Promise<void> {
    try {
      this.accessToken = await SecureStore.getItemAsync('accessToken');
      this.refreshToken = await SecureStore.getItemAsync('refreshToken');
    } catch (error) {
      console.error('Failed to load tokens:', error);
    }
  }

  /**
   * Save tokens to secure storage
   */
  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', refreshToken);
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
    } catch (error) {
      console.error('Failed to save tokens:', error);
    }
  }

  /**
   * Save authenticated user ID to secure storage
   */
  async saveUserData(userId: string): Promise<void> {
    try {
      await SecureStore.setItemAsync('userId', userId);
    } catch (error) {
      console.error('Failed to save user data:', error);
    }
  }

  /**
   * Clear tokens and user data (logout)
   */
  async clearTokens(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      await SecureStore.deleteItemAsync('userId');
      this.accessToken = null;
      this.refreshToken = null;
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<{ accessToken: string; refreshToken: string } | null> {
    if (!this.refreshToken) {
      return null;
    }

    try {
      const response = await axios.post(`${this.baseURL}/api/auth/refresh`, {
        refreshToken: this.refreshToken,
      });

      const { accessToken, refreshToken } = response.data;
      await this.saveTokens(accessToken, refreshToken);
      return { accessToken, refreshToken };
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.clearTokens();
      return null;
    }
  }

  // ============================================================================
  // AUTHENTICATION ENDPOINTS
  // ============================================================================

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<any> {
    try {
      const response = await this.client.post('/api/auth/login', {
        email,
        password,
      });

      const { accessToken, refreshToken, user } = response.data;
      await this.saveTokens(accessToken, refreshToken);
      if (user?.id) {
        await this.saveUserData(user.id);
      }
      return user;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Signup new artisan
   */
  async signup(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: 'artisan' | 'client';
    trade?: string;
    state: string;
    city: string;
  }): Promise<any> {
    try {
      const response = await this.client.post('/api/auth/signup', userData);
      const { accessToken, refreshToken, user } = response.data;
      await this.saveTokens(accessToken, refreshToken);
      if (user?.id) {
        await this.saveUserData(user.id);
      }
      return user;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await this.client.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await this.clearTokens();
    }
  }

  // ============================================================================
  // JOBS ENDPOINTS
  // ============================================================================

  /**
   * Get artisan's jobs with optional filtering
   */
  async getJobs(
    artisanId: string,
    filters?: {
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<any[]> {
    try {
      const response = await this.client.get('/api/jobs', {
        params: {
          artisanId,
          ...filters,
        },
      });
      return response.data.jobs;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get single job by ID
   */
  async getJob(jobId: string): Promise<any> {
    try {
      const response = await this.client.get(`/api/jobs/${jobId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create new job
   */
  async createJob(jobData: any): Promise<any> {
    try {
      const response = await this.client.post('/api/jobs', jobData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update job
   */
  async updateJob(jobId: string, updates: any): Promise<any> {
    try {
      const response = await this.client.patch(`/api/jobs/${jobId}`, updates);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // INVOICES ENDPOINTS
  // ============================================================================

  /**
   * Create invoice for job
   */
  async createInvoice(jobId: string, invoiceData: any): Promise<any> {
    try {
      const response = await this.client.post(`/api/invoices`, {
        jobId,
        ...invoiceData,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Share invoice and generate shareable link
   */
  async shareInvoice(
    invoiceId: string,
    shareMethod: 'whatsapp' | 'email' | 'sms'
  ): Promise<{ shareUrl: string; linkExpiry: string }> {
    try {
      const response = await this.client.post(`/api/invoices/${invoiceId}/share`, {
        method: shareMethod,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(invoiceId: string, status: string): Promise<any> {
    try {
      const response = await this.client.patch(`/api/invoices/${invoiceId}`, {
        status,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // PAYMENTS ENDPOINTS
  // ============================================================================

  /**
   * Record payment for invoice
   */
  async recordPayment(paymentData: {
    invoiceId?: string;
    jobId?: string;
    amount: number;
    method: 'cash' | 'bank_transfer' | 'paystack_escrow';
    transactionId?: string;
    proofOfPayment?: string;
    notes?: string;
  }): Promise<any> {
    try {
      const response = await this.client.post('/api/payments', paymentData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Initialize Paystack payment
   */
  async initializePaystackPayment(amount: number, email: string): Promise<any> {
    try {
      const response = await this.client.post('/api/payments/paystack/initialize', {
        amount: amount * 100, // Convert to kobo
        email,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Verify Paystack payment
   */
  async verifyPaystackPayment(reference: string): Promise<any> {
    try {
      const response = await this.client.post('/api/payments/paystack/verify', {
        reference,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // EXPENSES ENDPOINTS
  // ============================================================================

  /**
   * Log expense
   */
  async logExpense(expenseData: {
    category: 'fuel' | 'transport' | 'tools' | 'equipment' | 'other';
    description: string;
    amount: number;
    expenseDate: string;
    jobId?: string;
    notes?: string;
  }): Promise<any> {
    try {
      const response = await this.client.post('/api/expenses', expenseData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get expense summary
   */
  async getExpenseSummary(
    artisanId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<any> {
    try {
      const response = await this.client.get('/api/expenses/summary', {
        params: { artisanId, dateFrom, dateTo },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // SYNC ENDPOINTS (Offline Support)
  // ============================================================================

  /**
   * Batch sync pending operations
   * Sends all queued offline operations to server and handles conflicts
   */
  async syncOperations(operations: SyncOperation[]): Promise<SyncResult[]> {
    if (operations.length === 0) {
      return [];
    }

    try {
      const response = await this.client.post('/api/sync', {
        operations,
      });

      return response.data.results as SyncResult[];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delta sync: fetch only records changed since timestamp
   * Used for efficient sync when coming online
   */
  async deltaSync(lastSyncTimestamp: number): Promise<any> {
    try {
      const response = await this.client.get('/api/sync/delta', {
        params: { since: lastSyncTimestamp },
      });

      return response.data; // { jobs: [], invoices: [], payments: [], etc }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  /**
   * Centralized error handling
   */
  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Network error
      if (!axiosError.response) {
        return new Error('Network error. Please check your connection.');
      }

      // Server error with message
      const serverMessage = (axiosError.response.data as any)?.message;
      if (serverMessage) {
        return new Error(serverMessage);
      }

      // Fallback error
      return new Error(`API Error: ${axiosError.response.status}`);
    }

    return error instanceof Error ? error : new Error('Unknown error');
  }

  /**
   * Retry failed request with exponential backoff
   */
  async retryRequest<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries - 1) {
          throw error;
        }

        // Exponential backoff
        const delay = delayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error('Max retries exceeded');
  }
}

// Export singleton instance
export const apiClient = new APIClient();

/**
 * Initialize API client (call on app startup)
 */
export async function initializeAPI(): Promise<void> {
  await apiClient.loadTokens();
}

export default apiClient;
