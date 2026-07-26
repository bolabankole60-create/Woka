/**
 * useDashboardData Hook
 *
 * Reactive hook for authenticated dashboard metrics.
 * Fetches from local WatermelonDB with real-time updates on changes.
 *
 * Requires verified authentication via SecureStore.
 * Cross-user data exposure is prevented by requiring valid user ID.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { Q } from '@nozbe/watermelondb';
import * as SecureStore from 'expo-secure-store';
import { initializeDatabase } from '@/db/database';
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

export function useDashboardData(): DashboardData {
  const [data, setData] = useState<DashboardData>({
    pendingInvoiceTotal: 0,
    todayExpensesTotal: 0,
    recentJobs: [],
    isLoading: true,
    error: null,
  });

  const dbRef = useRef<Database | null>(null);
  const subsRef = useRef<Array<() => void>>([]);

  // Load dashboard data
  const load = useCallback(
    async (db: Database, userId: string) => {
      try {
        const [invoicesData, expensesData, jobsData] = await Promise.all([
          db
            .get('invoices')
            .query(
              Q.where('artisan_id', userId),
              Q.where('paid_status', Q.notEq('paid'))
            )
            .fetch(),
          db
            .get('expense_logs')
            .query(
              Q.where('artisan_id', userId),
              Q.where('category', Q.oneOf(['fuel', 'transport'])),
              Q.and(
                Q.where('expense_date', Q.gte(getTodayStart())),
                Q.where('expense_date', Q.lt(getTodayEnd()))
              )
            )
            .fetch(),
          db
            .get('jobs')
            .query(
              Q.where('artisan_id', userId),
              Q.where('status', Q.oneOf(['accepted', 'material_sourced', 'in_progress', 'awaiting_inspection'])),
              Q.sortBy('updated_at', Q.desc),
              Q.take(3)
            )
            .fetch(),
        ]);

        const pendingTotal = invoicesData.reduce((sum, inv: any) => {
          const amountDue = inv._raw?.amount_due || 0;
          const amountPaid = inv._raw?.amount_paid || 0;
          return sum + Math.max(0, amountDue - amountPaid);
        }, 0);

        const expensesTotal = expensesData.reduce((sum, exp: any) => sum + (exp._raw?.amount || 0), 0);

        const recentJobs = jobsData.map((job: any) => ({
          id: job._raw?.id || '',
          title: job._raw?.title || '',
          status: job._raw?.status || '',
          totalAmount: job._raw?.total_amount || 0,
          paidAmount: job._raw?.paid_amount || 0,
          updatedAt: job._raw?.updated_at || 0,
        }));

        setData({
          pendingInvoiceTotal: pendingTotal,
          todayExpensesTotal: expensesTotal,
          recentJobs,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Load failed');
        if (__DEV__) {
          console.error('[Dashboard] Load:', error.message);
        }
        setData((prev) => ({
          ...prev,
          error,
          isLoading: false,
        }));
      }
    },
    []
  );

  // Initialize and subscribe
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // Get authenticated user ID
        const userId = await SecureStore.getItemAsync('userId');

        if (!userId) {
          setData({
            pendingInvoiceTotal: 0,
            todayExpensesTotal: 0,
            recentJobs: [],
            isLoading: false,
            error: new Error('Authentication required'),
          });
          return;
        }

        // Initialize database
        if (!dbRef.current) {
          dbRef.current = await initializeDatabase();
        }
        if (!mounted) return;

        const db = dbRef.current;

        // Load initial data
        await load(db, userId);
        if (!mounted) return;

        // Subscribe to changes
        const invoke = () => {
          if (mounted && db) load(db, userId);
        };

        const subs = [
          db.get('invoices').query(Q.where('artisan_id', userId)).observe().subscribe(invoke),
          db.get('jobs').query(Q.where('artisan_id', userId)).observe().subscribe(invoke),
          db
            .get('expense_logs')
            .query(Q.where('artisan_id', userId))
            .observe()
            .subscribe(invoke),
        ];

        subsRef.current = subs.map((s) => () => s.unsubscribe());
      } catch (err) {
        if (mounted) {
          const error = err instanceof Error ? err : new Error('Initialization failed');
          if (__DEV__) {
            console.error('[Dashboard] Init:', error.message);
          }
          setData({
            pendingInvoiceTotal: 0,
            todayExpensesTotal: 0,
            recentJobs: [],
            isLoading: false,
            error,
          });
        }
      }
    };

    init();

    return () => {
      mounted = false;
      subsRef.current.forEach((unsub) => {
        try {
          unsub();
        } catch (err) {
          if (__DEV__) {
            console.error('[Dashboard] Cleanup:', err);
          }
        }
      });
    };
  }, [load]);

  return data;
}

function getTodayStart(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function getTodayEnd(): number {
  return getTodayStart() + 86400000;
}
