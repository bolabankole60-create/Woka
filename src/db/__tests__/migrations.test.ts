/**
 * Database Migrations Test
 * Verifies migration file structure is correct
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Database Migrations', () => {
  describe('Migration File Exists', () => {
    it('should have migrations.ts file', () => {
      const migrationsPath = path.join(__dirname, '../migrations.ts');
      expect(fs.existsSync(migrationsPath)).toBe(true);
    });
  });

  describe('Migration File Content', () => {
    it('should export dbMigrations', () => {
      const migrationsPath = path.join(__dirname, '../migrations.ts');
      const content = fs.readFileSync(migrationsPath, 'utf-8');
      expect(content).toContain('export const dbMigrations');
    });

    it('should define v5 migration for customers table', () => {
      const migrationsPath = path.join(__dirname, '../migrations.ts');
      const content = fs.readFileSync(migrationsPath, 'utf-8');
      expect(content).toContain("toVersion: 5");
      expect(content).toContain("name: 'customers'");
      expect(content).toContain("{ name: 'artisan_id'");
    });

    it('should define v6 migration for job extensions', () => {
      const migrationsPath = path.join(__dirname, '../migrations.ts');
      const content = fs.readFileSync(migrationsPath, 'utf-8');
      expect(content).toContain("toVersion: 6");
      expect(content).toContain("table: 'jobs'");
      expect(content).toContain("{ name: 'customer_id'");
      expect(content).toContain("{ name: 'is_archived'");
    });

    it('should define v7 migration for financial tables', () => {
      const migrationsPath = path.join(__dirname, '../migrations.ts');
      const content = fs.readFileSync(migrationsPath, 'utf-8');
      expect(content).toContain("toVersion: 7");
      expect(content).toContain("name: 'invoices'");
      expect(content).toContain("name: 'invoice_items'");
      expect(content).toContain("name: 'payments'");
    });

    it('should define invoices table with financial fields', () => {
      const migrationsPath = path.join(__dirname, '../migrations.ts');
      const content = fs.readFileSync(migrationsPath, 'utf-8');
      expect(content).toContain("{ name: 'total_amount'");
      expect(content).toContain("{ name: 'amount_paid'");
      expect(content).toContain("{ name: 'amount_due'");
      expect(content).toContain("{ name: 'paid_status'");
    });

    it('should define payments table with invoice linkage', () => {
      const migrationsPath = path.join(__dirname, '../migrations.ts');
      const content = fs.readFileSync(migrationsPath, 'utf-8');
      expect(content).toContain("{ name: 'invoice_id'");
      expect(content).toContain("{ name: 'amount'");
      expect(content).toContain("{ name: 'method'");
    });

    it('should have correct function calls', () => {
      const migrationsPath = path.join(__dirname, '../migrations.ts');
      const content = fs.readFileSync(migrationsPath, 'utf-8');
      expect(content).toContain('schemaMigrations');
      expect(content).toContain('createTable');
      expect(content).toContain('addColumns');
    });
  });

  describe('Schema Version', () => {
    it('should have database schema version 7', () => {
      const databasePath = path.join(__dirname, '../database.ts');
      const content = fs.readFileSync(databasePath, 'utf-8');
      expect(content).toContain("version: 7");
    });

    it('should have matching schema and migration versions', () => {
      const migrationsPath = path.join(__dirname, '../migrations.ts');
      const databasePath = path.join(__dirname, '../database.ts');

      const migrationsContent = fs.readFileSync(migrationsPath, 'utf-8');
      const databaseContent = fs.readFileSync(databasePath, 'utf-8');

      // Extract max version from migrations
      const migrationVersions = migrationsContent.match(/toVersion: (\d+)/g);
      const migrationMaxVersion = Math.max(
        ...migrationVersions!.map((v: string) => parseInt(v.match(/\d+/)![0]))
      );

      // Extract version from database
      const schemaVersionMatch = databaseContent.match(/version: (\d+)/);
      const schemaVersion = parseInt(schemaVersionMatch![1]);

      expect(schemaVersion).toBe(migrationMaxVersion);
    });
  });

  describe('Financial Tables in Schema', () => {
    it('should define invoices table in database schema', () => {
      const databasePath = path.join(__dirname, '../database.ts');
      const content = fs.readFileSync(databasePath, 'utf-8');
      expect(content).toContain("name: 'invoices'");
      expect(content).toContain("{ name: 'total_amount'");
      expect(content).toContain("{ name: 'amount_paid'");
    });

    it('should define payments table in database schema', () => {
      const databasePath = path.join(__dirname, '../database.ts');
      const content = fs.readFileSync(databasePath, 'utf-8');
      expect(content).toContain("name: 'payments'");
      expect(content).toContain("{ name: 'invoice_id'");
      expect(content).toContain("{ name: 'job_id'");
    });

    it('should have sync metadata on financial tables', () => {
      const databasePath = path.join(__dirname, '../database.ts');
      const content = fs.readFileSync(databasePath, 'utf-8');

      // Invoices should have sync metadata
      const invoicesSection = content.substring(
        content.indexOf("name: 'invoices'"),
        content.indexOf("name: 'invoices'") + 2000
      );
      expect(invoicesSection).toContain("sync_status");
      expect(invoicesSection).toContain("client_version");
      expect(invoicesSection).toContain("server_version");

      // Payments should have sync metadata
      const paymentsSection = content.substring(
        content.indexOf("name: 'payments'"),
        content.indexOf("name: 'payments'") + 2000
      );
      expect(paymentsSection).toContain("sync_status");
      expect(paymentsSection).toContain("client_version");
      expect(paymentsSection).toContain("server_version");
    });
  });
});
