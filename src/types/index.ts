/**
 * TypeScript Type Definitions
 *
 * Centralized types for the entire application.
 * Keeps types consistent across components, services, and database.
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum UserRole {
  ARTISAN = 'artisan',
  CLIENT = 'client',
  ADMIN = 'admin',
}

export enum JobStatus {
  DRAFT = 'draft',
  ACCEPTED = 'accepted',
  MATERIAL_SOURCED = 'material_sourced',
  IN_PROGRESS = 'in_progress',
  AWAITING_INSPECTION = 'awaiting_inspection',
  COMPLETED = 'completed',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  PAYSTACK_ESCROW = 'paystack_escrow',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum ExpenseCategory {
  FUEL = 'fuel',
  TRANSPORT = 'transport',
  TOOLS = 'tools',
  EQUIPMENT = 'equipment',
  OTHER = 'other',
}

export enum SyncStatus {
  LOCAL = 'local',
  SYNCING = 'syncing',
  SYNCED = 'synced',
  CONFLICT = 'conflict',
  FAILED = 'failed',
}

// ============================================================================
// USER TYPES
// ============================================================================

export interface User {
  id: string;
  role: UserRole;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  profileImage?: string;

  // Artisan-specific
  trade?: string;
  bio?: string;
  yearsOfExperience?: number;
  rating?: number;
  ratingCount?: number;

  // Financial
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankCode?: string;
  paystackCustomerId?: string;

  // Address
  state: string;
  city: string;
  address?: string;

  // Contact
  whatsappNumber?: string;

  // Verification
  emailVerified: boolean;
  phoneVerified: boolean;

  // Sync
  syncStatus: SyncStatus;
  clientVersion: number;
  serverVersion: number;
  lastSyncedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: User;
  token: AuthToken;
}

// ============================================================================
// JOB TYPES
// ============================================================================

export interface Job {
  id: string;
  artisanId: string;
  clientId: string;
  title: string;
  description: string;
  category: string;
  location: string;
  status: JobStatus;
  priority?: 'low' | 'medium' | 'high' | 'urgent';

  // Cost breakdown
  estimatedCost?: number;
  materialCost: number;
  laborFee: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;

  // Payment tracking
  paidAmount: number;
  pendingAmount: number;

  // Timing
  scheduledDate?: Date;
  startedAt?: Date;
  completedAt?: Date;
  dueDate?: Date;

  // Notes
  notes?: string;
  clientNotes?: string;
  artisanNotes?: string;

  // Media
  images: string[];

  // Sync
  syncStatus: SyncStatus;
  clientVersion: number;
  serverVersion: number;
  lastSyncedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateJobInput {
  title: string;
  description: string;
  category: string;
  location: string;
  clientId: string;
  estimatedCost?: number;
  scheduledDate?: Date;
  notes?: string;
}

export interface UpdateJobInput {
  title?: string;
  status?: JobStatus;
  materialCost?: number;
  laborFee?: number;
  notes?: string;
  completedAt?: Date;
}

// ============================================================================
// INVOICE TYPES
// ============================================================================

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  category: 'material' | 'labor' | 'service';
}

export interface Invoice {
  id: string;
  jobId: string;
  artisanId: string;
  invoiceNumber: string;
  items: InvoiceItem[];

  // Totals
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;

  // Payment tracking
  amountPaid: number;
  amountDue: number;

  // Status
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'disputed' | 'paid';
  paidStatus: 'unpaid' | 'partially_paid' | 'paid';

  // Dates
  issuedAt: Date;
  dueDate?: Date;
  paidAt?: Date;

  // Notes
  notes?: string;
  paymentTerms?: string;

  // Sync
  syncStatus: SyncStatus;
  clientVersion: number;
  serverVersion: number;
  lastSyncedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInvoiceInput {
  jobId: string;
  items: Omit<InvoiceItem, 'id' | 'amount'>[];
  taxRate?: number;
  discountAmount?: number;
  dueDate?: Date;
  notes?: string;
  paymentTerms?: string;
}

// ============================================================================
// PAYMENT TYPES
// ============================================================================

export interface Payment {
  id: string;
  invoiceId?: string;
  jobId?: string;
  artisanId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;

  // References
  transactionId?: string;
  receiptNumber?: string;
  paystackTransferId?: string;

  // Proof
  proofOfPayment?: string;
  notes?: string;

  // Dates
  paidAt?: Date;
  recordedAt: Date;

  // Sync
  syncStatus: SyncStatus;
  clientVersion: number;
  serverVersion: number;
  lastSyncedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface RecordPaymentInput {
  invoiceId?: string;
  jobId?: string;
  amount: number;
  method: PaymentMethod;
  transactionId?: string;
  proofOfPayment?: string;
  notes?: string;
}

// ============================================================================
// EXPENSE TYPES
// ============================================================================

export interface ExpenseLog {
  id: string;
  artisanId: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expenseDate: Date;
  jobId?: string;
  notes?: string;
  receipt?: string;

  // Sync
  syncStatus: SyncStatus;
  clientVersion: number;
  serverVersion: number;
  lastSyncedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface LogExpenseInput {
  category: ExpenseCategory;
  description: string;
  amount: number;
  expenseDate: Date;
  jobId?: string;
  notes?: string;
}

// ============================================================================
// SYNC TYPES
// ============================================================================

export interface SyncOperation {
  id: string;
  entityType: 'job' | 'invoice' | 'payment' | 'expense';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  clientVersion: number;
  changes: Record<string, any>;
  timestamp: number;
  retryCount: number;
}

export interface SyncResult {
  operationId: string;
  success: boolean;
  conflict?: boolean;
  rejected?: boolean;
  serverVersion?: number;
  data?: any;
  error?: string;
}

// ============================================================================
// NAVIGATION TYPES
// ============================================================================

export type RootStackParamList = {
  // Auth Stack
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;

  // Dashboard Stack
  Dashboard: undefined;
  JobsList: undefined;
  JobDetail: { jobId: string };
  CreateJob: undefined;
  InvoiceShare: { jobId: string };
  PaymentRecord: { invoiceId: string };
  ExpenseLog: undefined;

  // Settings Stack
  Settings: undefined;
  EditProfile: undefined;
  BankDetails: undefined;
};

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type WithSyncMetadata<T> = T & {
  syncStatus: SyncStatus;
  clientVersion: number;
  serverVersion: number;
  lastSyncedAt?: Date;
};

export type Writeable<T> = { -readonly [P in keyof T]: T[P] };

export interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}
