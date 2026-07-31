/**
 * Authentication Middleware
 *
 * Extracts and validates JWT from request headers.
 * Derives authenticated artisan ID from token.
 * Rejects unauthenticated requests.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Typed authenticated request with artisan context
 */
export interface AuthenticatedRequest extends Request {
  artisanId: string;
  userId: string;
}

/**
 * Verify JWT token and attach artisan context
 *
 * Expected header: Authorization: Bearer <token>
 * For Phase 2B, we extract artisan ID from token.
 * In production, validate JWT signature and expiry.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Missing or invalid Authorization header.',
    });
    return;
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix

  try {
    // TODO: In production, verify JWT signature and expiry
    // For now, extract artisan ID from token format: "artisan:<id>"
    // Real implementation should use JWT library and validate signature
    if (!token || typeof token !== 'string' || token.length === 0) {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
      return;
    }

    // Parse artisan ID from token (simple format for testing)
    // Real implementation: jwt.verify(token, SECRET)
    const parts = token.split(':');
    if (parts.length !== 2 || parts[0] !== 'artisan') {
      res.status(401).json({
        success: false,
        error: 'Invalid token format',
      });
      return;
    }

    const artisanId = parts[1];
    if (!artisanId) {
      res.status(401).json({
        success: false,
        error: 'Invalid artisan ID in token',
      });
      return;
    }

    // Attach authenticated context to request
    (req as AuthenticatedRequest).artisanId = artisanId;
    (req as AuthenticatedRequest).userId = artisanId;

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}
