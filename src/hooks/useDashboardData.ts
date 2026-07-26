/**
 * useDashboardData Hook
 *
 * Reactive hook for dashboard metrics with real-time updates from WatermelonDB.
 * Returns pending invoice totals, today's expenses, and recent active jobs.
 * All values update instantly on local database changes (no server sync required).
 */

import { useEffect, useState, useRef } from 'react';
import { Q } from '@nozbe/watermelondb';
import * as SecureStore from 'expo-secure-store';
import { initializeDatabase } from '@/src/db/database';
import type { Database } from '@nozbe/watermelondb';

export interface DashboardJob {
  id: string;
  title: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  updatedAt: number;
}

export interface DashboardData {
  pendingInvoiceTotal: number;
  todayExpensesTotal: number;
  recentJobs: DashboardJob[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Get the current artisan ID from secure storage
 */
async function getCurrentArtisanId(): Promise<string | null> {
  try {
    const artisanId = await SecureStore.getItemAsync('artisanId');
    return artisanId;
  } catch (error) {
    console.error('[Dashboard] Failed to get artisan ID:', error);
    return null;
  }
}

/**
 * Hook for reactive dashboard metrics
 */
export function useDashboardData(artisanIdProp?: string | null): DashboardData {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    pendingInvoiceTotal: 0,
    todayExpensesTotal: 0,
    recentJobs: [],
    isLoading: true,
    error: null,
  });

  const dbRef = useRef<Database | null>(null);
  const subscriptionsRef = useRef<Array<() => void>>([]);
  const artisanIdRef = useRef<string | null>(null);
  const setterRef = useRef(setDashboardData);

  // Keep setter ref in sync
  useEffect(() => {
    setterRef.current = setDashboardData;
  }, []);

  // Initialize database and get artisan ID
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        // Get artisan ID
        const providedId = artisanIdProp;
        const storedId = providedId || (await getCurrentArtisanId());

        if (!isMounted) return;

        if (!storedId) {
          setDashboardData((prev) => ({
            ...prev,
            error: new Error('No artisan ID available'),
            isLoading: false,
          }));
          return;
        }

        artisanIdRef.current = storedId;

        // Initialize database
        if (!dbRef.current) {
          dbRef.current = await initializeDatabase();
        }

        if (!isMounted) return;

        // Load initial data
        await loadDashboardData(dbRef.current, storedId, setterRef.current);
      } catch (err) {
        if (isMounted) {
          const error = err instanceof Error ? err : new Error(String(err));
          setDashboardData((prev) => ({
            ...prev,
            error,
            isLoading: false,
          }));
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [artisanIdProp]);

  // Set up reactive subscriptions
  useEffect(() => {
    if (!dbRef.current || !artisanIdRef.current) return;

    let isMounted = true;

    const setupSubscriptions = async () => {
      try {
        const db = dbRef.current!;
        const artisanId = artisanIdRef.current!;

        // Subscribe to invoice collection changes
        const invoiceCollection = db.get('invoices');
        const invoiceSubscription = invoiceCollection
          .query(Q.where('artisan_id', artisanId))
          .observe()
          .subscribe(() => {
            if (isMounted && dbRef.current) {
              loadDashboardData(dbRef.current, artisanId, setterRef.current);
            }
          });

        subscriptionsRef.current.push(() => invoiceSubscription.unsubscribe());

        // Subscribe to job collection changes
        const jobCollection = db.get('jobs');
        const jobSubscription = jobCollection
          .query(Q.where('artisan_id', artisanId))
          .observe()
          .subscribe(() => {
            if (isMounted && dbRef.current) {
              loadDashboardData(dbRef.current, artisanId, setterRef.current);
            }
          });

        subscriptionsRef.current.push(() => jobSubscription.unsubscribe());

        // Subscribe to expense collection changes
        const expenseCollection = db.get('expense_logs');
        const expenseSubscription = expenseCollection
          .query(Q.where('artisan_id', artisanId))
          .observe()
          .subscribe(() => {
            if (isMounted && dbRef.current) {
              loadDashboardData(dbRef.current, artisanId, setterRef.current);
            }
          });

        subscriptionsRef.current.push(() => expenseSubscription.unsubscribe());
      } catch (err) {
        console.error('[Dashboard] Subscription setup error:', err);
      }
    };

    setupSubscriptions();

    return () => {
      isMounted = false;
      subscriptionsRef.current.forEach((unsubscribe) => {
        try {
          unsubscribe();
        } catch (err) {
          console.error('[Dashboard] Unsubscribe error:', err);
        }
      });
      subscriptionsRef.current = [];
    };
  }, []);

  return dashboardData;
}

/**
 * Fetch all dashboard metrics from the database
 */
async function loadDashboardData(
  db: Database,
  artisanId: string,
  setter: React.Dispatch<React.SetStateAction<DashboardData>>
): Promise<void> {
  try {
    // Fetch pending invoices
    const pendingInvoiceTotal = await calculatePendingInvoiceTotal(db, artisanId);

    // Fetch today's expenses
    const todayExpensesTotal = await calculateTodayExpensesTotal(db, artisanId);

    // Fetch recent active jobs
    const recentJobs = await fetchRecentActiveJobs(db, artisanId);

    setter({
      pendingInvoiceTotal,
      todayExpensesTotal,
      recentJobs,
      isLoading: false,
      error: null,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('[Dashboard] Fetch error:', error);
    setter((prev) => ({
      ...prev,
      error,
      isLoading: false,
    }));
  }
}

/**
 * Calculate total outstanding balance on pending invoices
 * Includes: unpaid, partially_paid (excludes fully paid)
 */
async function calculatePendingInvoiceTotal(db: Database, artisanId: string): Promise<number> {
  try {
    const invoiceCollection = db.get('invoices');

    // Query invoices for this artisan that are not fully paid
    const invoices = await invoiceCollection
      .query(
        Q.where('artisan_id', artisanId),
        Q.where('paid_status', Q.notEq('paid'))
      )
      .fetch();

    // Calculate total outstanding balance
    let total = 0;
    for (const invoice of invoices) {
      const amountDue = invoice.raw.amount_due || 0;
      const amountPaid = invoice.raw.amount_paid || 0;
      const outstanding = Math.max(0, amountDue - amountPaid);
      total += outstanding;
    }

    return total;
  } catch (err) {
    console.error('[Dashboard] Invoice calculation error:', err);
    return 0;
  }
}

/**
 * Calculate today's fuel and transport expenses (local timezone)
 */
async function calculateTodayExpensesTotal(db: Database, artisanId: string): Promise<number> {
  try {
    const expenseCollection = db.get('expense_logs');

    // Get local midnight boundaries
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const todayStartMs = todayStart.getTime();
    const todayEndMs = todayEnd.getTime();

    // Query today's expenses (FUEL and TRANSPORT only)
    const expenses = await expenseCollection
      .query(
        Q.where('artisan_id', artisanId),
        Q.where('category', Q.oneOf(['fuel', 'transport'])),
        Q.and(
          Q.where('expense_date', Q.gte(todayStartMs)),
          Q.where('expense_date', Q.lt(todayEndMs))
        )
      )
      .fetch();

    // Sum all expenses
    let total = 0;
    for (const expense of expenses) {
      const amount = expense.raw.amount || 0;
      total += amount;
    }

    return total;
  } catch (err) {
    console.error('[Dashboard] Expense calculation error:', err);
    return 0;
  }
}

/**
 * Fetch 3 most recent active jobs
 * Active statuses: accepted, material_sourced, in_progress, awaiting_inspection
 */
async function fetchRecentActiveJobs(db: Database, artisanId: string): Promise<DashboardJob[]> {
  try {
    const jobCollection = db.get('jobs');

    // Query active jobs (exclude draft, completed, paid, cancelled)
    const jobs = await jobCollection
      .query(
        Q.where('artisan_id', artisanId),
        Q.where('status', Q.oneOf([
          'accepted',
          'material_sourced',
          'in_progress',
          'awaiting_inspection',
        ]))
      )
      .fetch();

    // Map to dashboard format and sort by updated_at descending
    const dashboardJobs = jobs
      .map((job) => ({
        id: job.raw.id,
        title: job.raw.title,
        status: job.raw.status,
        totalAmount: job.raw.total_amount || 0,
        paidAmount: job.raw.paid_amount || 0,
        updatedAt: job.raw.updated_at || 0,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 3);

    return dashboardJobs;
  } catch (err) {
    console.error('[Dashboard] Job fetch error:', err);
    return [];
  }
}
