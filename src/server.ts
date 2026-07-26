/**
 * Tradify Backend Server
 *
 * Production-grade Express server with:
 * - Prisma ORM for PostgreSQL
 * - TypeScript for type safety
 * - Transaction-based sync for offline-first mobile app
 * - CORS, error handling, logging
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

// Configuration
dotenv.config({ path: '.env.local' });

// Database & Config
import { connectDatabase, disconnectDatabase, seedDatabase } from './config/database';
import { logger } from './utils/logger';

// Routes
import { setupRoutes } from './routes';

// Middleware
import { errorHandler } from './middleware/errorHandler';

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

const app: Application = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Trust proxy in production (for X-Forwarded-For, X-Forwarded-Proto, etc.)
 */
if (NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Security Headers (Helmet)
 */
app.use(
  helmet({
    contentSecurityPolicy: false, // Can be configured as needed
  })
);

/**
 * CORS Configuration
 * Allows requests from mobile app and specified origins
 */
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',');
app.use(
  cors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400, // 24 hours
  })
);

/**
 * Compression
 */
app.use(compression());

/**
 * Raw body middleware for webhook verification
 * MUST come before JSON parsing to preserve raw buffer for HMAC verification
 *
 * This middleware captures the raw request body as a string and attaches it
 * to the request object for later HMAC verification by Paystack auth middleware.
 */
app.use((req: Request, _res: Response, next: NextFunction) => {
  let rawBody = '';

  req.on('data', (chunk: Buffer) => {
    rawBody += chunk.toString('utf8');
  });

  req.on('end', () => {
    (req as any).rawBody = rawBody;
    next();
  });
});

/**
 * Body parsing middleware
 * Standard JSON parsing for all other routes
 */
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

/**
 * Request logging middleware
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusColor =
      status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';

    logger.info(
      `${statusColor}${req.method} ${req.path}${'\x1b[0m'} - ${status} (${duration}ms)`,
    );
  });

  next();
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * Health Check Endpoint
 * Used for monitoring and load balancers
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
  });
});

/**
 * API Routes
 */
setupRoutes(app);

/**
 * 404 Handler
 */
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: _req.path,
    method: _req.method,
  });
});

/**
 * Error Handler (must be last)
 */
app.use(errorHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    logger.info(`🚀 Starting Tradify Backend (${NODE_ENV})`);

    // Connect to database
    logger.info('📡 Connecting to database...');
    await connectDatabase();

    // Seed database (development only)
    if (NODE_ENV === 'development' && process.env.SEED_DATABASE === 'true') {
      await seedDatabase();
    }

    // Start listening
    const server = app.listen(PORT, () => {
      logger.info(`✅ Server listening on http://localhost:${PORT}`);
      logger.info(`📚 API documentation: http://localhost:${PORT}/api-docs`);
      logger.info(`🏥 Health check: http://localhost:${PORT}/health`);

      if (NODE_ENV === 'development') {
        const localIPs = getLocalIPs();
        logger.info(`\n📱 For mobile testing, use:`);
        localIPs.forEach((ip) => {
          logger.info(`   http://${ip}:${PORT}`);
        });
        logger.info(
          `\n   Add to .env in your Expo app:\n   EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:${PORT}\n`,
        );
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', () => shutdownServer(server));
    process.on('SIGINT', () => shutdownServer(server));
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    await disconnectDatabase();
    process.exit(1);
  }
}

/**
 * Shutdown server gracefully
 */
async function shutdownServer(server: any): Promise<void> {
  logger.info('\n🛑 Shutting down server...');

  // Close HTTP server
  server.close(async () => {
    logger.info('✅ HTTP server closed');

    // Disconnect database
    await disconnectDatabase();

    logger.info('✅ Server shutdown complete');
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.warn('⚠️  Forcing shutdown after timeout');
    process.exit(1);
  }, 30000);
}

/**
 * Get local IP addresses for development
 */
function getLocalIPs(): string[] {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];

  Object.keys(interfaces).forEach((name) => {
    interfaces[name].forEach((iface: any) => {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    });
  });

  return ips.length > 0 ? ips : ['localhost'];
}

// ============================================================================
// START SERVER
// ============================================================================

if (require.main === module) {
  startServer();
}

export default app;
export { startServer };
