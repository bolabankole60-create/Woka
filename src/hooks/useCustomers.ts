/**
 * Reactive Customer Queries
 *
 * Provides typed, observable customer queries from WatermelonDB.
 * Uses RxJS observables for reactive updates.
 */

import { useEffect, useState, useMemo } from 'react';
import { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import Customer from '../models/Customer';
import type { Subscription } from 'rxjs';

export function useAllCustomers(
  db: Database | null,
  artisanId: string,
  isArchived?: boolean
): Customer[] | null {
  const [customers, setCustomers] = useState<Customer[] | null>(null);

  useEffect(() => {
    if (!db) return;

    const customersCollection = db.get<Customer>('customers');

    // Build query with artisan filter
    let query = customersCollection.query(Q.where('artisan_id', Q.eq(artisanId)));

    if (isArchived !== undefined) {
      query = query.extend(Q.where('is_archived', Q.eq(isArchived)));
    }

    // Subscribe to observable
    const subscription: Subscription = query
      .observe()
      .subscribe((results) => {
        setCustomers(results);
      });

    return () => subscription.unsubscribe();
  }, [db, artisanId, isArchived]);

  return customers;
}

export function useCustomerById(
  db: Database | null,
  customerId: string | null
): Customer | null {
  const [customer, setCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    if (!db || !customerId) {
      setCustomer(null);
      return;
    }

    const customersCollection = db.get<Customer>('customers');

    // Query single customer by ID
    const subscription: Subscription = customersCollection
      .query(Q.where('id', Q.eq(customerId)))
      .observe()
      .subscribe((results) => {
        setCustomer(results[0] ?? null);
      });

    return () => subscription.unsubscribe();
  }, [db, customerId]);

  return customer;
}

export function useSearchCustomers(
  db: Database | null,
  artisanId: string,
  searchTerm: string,
  isArchived: boolean = false
): Customer[] | null {
  const [allCustomers, setAllCustomers] = useState<Customer[] | null>(null);

  useEffect(() => {
    if (!db) return;

    const customersCollection = db.get<Customer>('customers');

    // Query base set: artisan's customers with archive filter
    const query = customersCollection.query(
      Q.where('artisan_id', Q.eq(artisanId)),
      Q.where('is_archived', Q.eq(isArchived))
    );

    // Subscribe to changes
    const subscription: Subscription = query
      .observe()
      .subscribe((results) => {
        setAllCustomers(results);
      });

    return () => subscription.unsubscribe();
  }, [db, artisanId, isArchived]);

  // Client-side search filter for name and phone
  const filtered = useMemo(() => {
    if (!allCustomers || !searchTerm.trim()) {
      return allCustomers;
    }

    const search = searchTerm.toLowerCase();
    return allCustomers.filter(
      (c: Customer) =>
        c.name.toLowerCase().includes(search) ||
        c.phone.includes(search) ||
        c.normalizedPhone.includes(search)
    );
  }, [allCustomers, searchTerm]);

  return filtered;
}

export function useActiveCustomersCount(
  db: Database | null,
  artisanId: string
): number | null {
  const customers = useAllCustomers(db, artisanId, false);
  return customers?.length ?? null;
}
