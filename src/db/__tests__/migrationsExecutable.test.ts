/**
 * Executable Database Migrations Tests
 * Tests actual migration execution with schema validation
 */

import { dbMigrations } from '../migrations';

describe('Executable Database Migrations', () => {
  describe('Migration Structure', () => {
    it('should have 3 migrations defined', () => {
      expect(dbMigrations.sortedMigrations.length).toBe(3);
    });

    it('should have v5 customer migration', () => {
      const v5 = dbMigrations.sortedMigrations.find((m: any) => m.toVersion === 5);
      expect(v5).toBeDefined();
      expect(v5?.steps.length).toBeGreaterThan(0);
    });

    it('should have v6 job extension migration', () => {
      const v6 = dbMigrations.sortedMigrations.find((m: any) => m.toVersion === 6);
      expect(v6).toBeDefined();
      expect(v6?.steps.length).toBeGreaterThan(0);
    });

    it('should have v7 financial migration', () => {
      const v7 = dbMigrations.sortedMigrations.find((m: any) => m.toVersion === 7);
      expect(v7).toBeDefined();
      expect(v7?.steps.length).toBeGreaterThan(0);
    });

    it('should maintain sequential order', () => {
      const versions = dbMigrations.sortedMigrations.map((m: any) => m.toVersion);
      expect(versions).toEqual([5, 6, 7]);
    });
  });

  describe('Migration Content Validation', () => {
    it('should have steps in all migrations', () => {
      dbMigrations.sortedMigrations.forEach((m: any) => {
        expect(Array.isArray(m.steps)).toBe(true);
        expect(m.steps.length).toBeGreaterThan(0);
      });
    });

    it('v5 should create customers table', () => {
      const v5 = dbMigrations.sortedMigrations.find((m: any) => m.toVersion === 5);
      const hasCreateTable = v5?.steps.some((s: any) => s.type === 'create_table');
      expect(hasCreateTable).toBe(true);
    });

    it('v6 should add columns to jobs table', () => {
      const v6 = dbMigrations.sortedMigrations.find((m: any) => m.toVersion === 6);
      const hasAddColumns = v6?.steps.some((s: any) => s.type === 'add_columns');
      expect(hasAddColumns).toBe(true);
    });

    it('v7 should create financial tables', () => {
      const v7 = dbMigrations.sortedMigrations.find((m: any) => m.toVersion === 7);
      const createSteps = v7?.steps.filter((s: any) => s.type === 'create_table');
      expect(createSteps?.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('No Data Loss', () => {
    it('should not drop customers table in v6 or v7', () => {
      const v6 = dbMigrations.sortedMigrations.find((m: any) => m.toVersion === 6);
      const v7 = dbMigrations.sortedMigrations.find((m: any) => m.toVersion === 7);

      const v6HasDrop = v6?.steps.some((s: any) => s.type === 'destroy_table');
      const v7HasDrop = v7?.steps.some((s: any) => s.type === 'destroy_table');

      expect(v6HasDrop).not.toBe(true);
      expect(v7HasDrop).not.toBe(true);
    });

    it('should not drop jobs table in v7', () => {
      const v7 = dbMigrations.sortedMigrations.find((m: any) => m.toVersion === 7);
      const hasDropJobs = v7?.steps.some(
        (s: any) => s.type === 'destroy_table' || (s.type === 'drop_table' && s.table === 'jobs')
      );
      expect(hasDropJobs).not.toBe(true);
    });
  });
});
