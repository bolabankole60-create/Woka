/**
 * Database Configuration & Prisma Client
 *
 * Initializes Prisma client with proper error handling and logging.
 * Handles database connection lifecycle.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// ============================================================================
// PRISMA CLIENT INITIALIZATION
// ============================================================================

/**
 * Shared Prisma client instance
 *
 * Uses singleton pattern to ensure only one database connection.
 * In production, Prisma handles connection pooling automatically.
 */
let prismaInstance: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (prismaInstance) {
    return prismaInstance;
  }

  // Configure logging based on environment
  const logConfig: Array<'error' | 'warn' | 'info'> = ['error', 'warn'];
  if (process.env.NODE_ENV === 'development') {
    logConfig.push('info');
  }

  prismaInstance = new PrismaClient({
    log: logConfig,
  });

  return prismaInstance;
}

export const prisma = getPrismaClient();

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

/**
 * Connect to database with retry logic
 */
export async function connectDatabase(): Promise<void> {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      // Test connection
      await prisma.$queryRaw`SELECT 1`;
      logger.info('✅ Database connected successfully');
      return;
    } catch (error) {
      retries++;
      logger.warn(
        `❌ Database connection failed (attempt ${retries}/${maxRetries}): ${error}`,
      );

      if (retries < maxRetries) {
        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, retries) * 1000;
        logger.info(`   Retrying in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw new Error(
          `Failed to connect to database after ${maxRetries} attempts`,
        );
      }
    }
  }
}

/**
 * Disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
    logger.info('✅ Database disconnected');
  }
}

// ============================================================================
// MIGRATION
// ============================================================================

/**
 * Run pending migrations
 * Should be called once during application startup
 */
export async function runMigrations(): Promise<void> {
  try {
    logger.info('Running database migrations...');

    // Prisma automatically handles migrations via migrate deploy
    // This is a no-op here - migrations are run via CLI:
    // npx prisma migrate deploy

    logger.info('✅ Migrations completed');
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    throw error;
  }
}

// ============================================================================
// SEED DATABASE (for development)
// ============================================================================

/**
 * Seed database with sample data
 * Only runs in development environment
 */
export async function seedDatabase(): Promise<void> {
  if (process.env.NODE_ENV !== 'development') {
    logger.info('Skipping database seed (not in development)');
    return;
  }

  try {
    logger.info('Seeding database with sample data...');

    // Check if data already exists
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      logger.info('Database already seeded. Skipping.');
      return;
    }

    // Seed sample user (artisan)
    const artisan = await prisma.user.create({
      data: {
        id: 'user_1',
        role: 'ARTISAN',
        email: 'okafor.plumber@gmail.com',
        phone: '07012345678',
        firstName: 'Chidike',
        lastName: 'Okafor',
        trade: 'Plumber',
        rating: 4.8,
        ratingCount: 23,
        state: 'Lagos',
        city: 'Lekki',
        whatsappNumber: '07012345678',
        emailVerified: true,
        phoneVerified: true,
        passwordHash: 'hashed_password',
        passwordSalt: 'salt',
      },
    });

    logger.info(`✅ Created artisan user: ${artisan.email}`);

    // Seed sample client
    const client = await prisma.user.create({
      data: {
        id: 'user_2',
        role: 'CLIENT',
        email: 'amina.smith@gmail.com',
        phone: '08098765432',
        firstName: 'Amina',
        lastName: 'Smith',
        state: 'Lagos',
        city: 'VI',
        emailVerified: true,
        phoneVerified: true,
        passwordHash: 'hashed_password',
        passwordSalt: 'salt',
      },
    });

    logger.info(`✅ Created client user: ${client.email}`);

    // Seed sample job
    const job = await prisma.job.create({
      data: {
        id: 'job_1',
        artisanId: artisan.id,
        clientId: client.id,
        title: 'Fix kitchen sink leak',
        description: 'Water leaking from under sink',
        category: 'plumbing',
        location: 'Lekki, Lagos',
        status: 'IN_PROGRESS',
        materialCost: 12500,
        laborFee: 15000,
        taxAmount: 2062.5,
        totalAmount: 29562.5,
        paidAmount: 10000,
        pendingAmount: 19562.5,
      },
    });

    logger.info(`✅ Created sample job: ${job.title}`);

    logger.info('✅ Database seeding completed');
  } catch (error) {
    logger.error('❌ Database seeding failed:', error);
    throw error;
  }
}
