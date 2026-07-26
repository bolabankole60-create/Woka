/**
 * Tradify Mock Backend Server
 *
 * Complete single-file Express server for testing the Expo React Native app's
 * sync engine, invoice sharing, and payment workflows.
 *
 * Usage:
 *   node server.js
 *
 * Then point your Expo app to: http://<YOUR_LOCAL_IP>:3000
 * See instructions at the bottom of this file.
 */

// ============================================================================
// IMPORTS & SETUP
// ============================================================================

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Enable CORS for mobile app access
app.use(cors({
  origin: '*', // In production, restrict to your domain
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse JSON bodies
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// IN-MEMORY DATABASE
// ============================================================================

/**
 * Mock database matching WatermelonDB/Prisma schemas
 * All records include sync metadata: serverVersion, lastModified
 */
const database = {
  // Sample user (artisan)
  users: [
    {
      id: 'user_1',
      role: 'artisan',
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
      serverVersion: 1,
      lastModified: Date.now(),
    },
    {
      id: 'user_2',
      role: 'client',
      email: 'amina.smith@gmail.com',
      phone: '08098765432',
      firstName: 'Amina',
      lastName: 'Smith',
      state: 'Lagos',
      city: 'VI',
      emailVerified: true,
      phoneVerified: true,
      serverVersion: 1,
      lastModified: Date.now(),
    },
  ],

  // Sample jobs
  jobs: [
    {
      id: 'job_1',
      artisanId: 'user_1',
      clientId: 'user_2',
      title: 'Fix kitchen sink leak',
      description: 'Water leaking from under sink, need urgent repair',
      category: 'plumbing',
      location: 'Lekki, Lagos',
      status: 'in_progress',
      priority: 'high',
      materialCost: 12500,
      laborFee: 15000,
      taxAmount: 2062.50,
      discountAmount: 0,
      totalAmount: 29562.50,
      paidAmount: 10000,
      pendingAmount: 19562.50,
      scheduledDate: new Date(Date.now() + 86400000).toISOString(),
      startedAt: new Date().toISOString(),
      completedAt: null,
      notes: 'Customer provided materials list. Awaiting inspection.',
      images: [],
      serverVersion: 2,
      lastModified: Date.now(),
    },
    {
      id: 'job_2',
      artisanId: 'user_1',
      clientId: 'user_2',
      title: 'Electrical wiring inspection',
      description: 'Full apartment electrical inspection and certification',
      category: 'electrical',
      location: 'Ikoyi, Lagos',
      status: 'draft',
      priority: 'medium',
      materialCost: 0,
      laborFee: 8000,
      taxAmount: 600,
      discountAmount: 0,
      totalAmount: 8600,
      paidAmount: 0,
      pendingAmount: 8600,
      scheduledDate: new Date(Date.now() + 259200000).toISOString(), // 3 days
      startedAt: null,
      completedAt: null,
      notes: 'Schedule inspection after 5 PM',
      images: [],
      serverVersion: 1,
      lastModified: Date.now(),
    },
  ],

  // Sample invoices
  invoices: [
    {
      id: 'invoice_1',
      jobId: 'job_1',
      artisanId: 'user_1',
      invoiceNumber: 'INV-2024-001',
      items: [
        {
          id: 'item_1',
          description: 'PVC Pipes (10m)',
          quantity: 2,
          unitPrice: 2500,
          amount: 5000,
          category: 'material',
        },
        {
          id: 'item_2',
          description: 'Plumbing labor',
          quantity: 6,
          unitPrice: 2500,
          amount: 15000,
          category: 'labor',
        },
      ],
      subtotal: 20000,
      taxRate: 0.075,
      taxAmount: 1500,
      discountAmount: 0,
      totalAmount: 21500,
      amountPaid: 10000,
      amountDue: 11500,
      status: 'sent',
      paidStatus: 'partially_paid',
      issuedAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 604800000).toISOString(), // 7 days
      paidAt: null,
      notes: 'Payment terms: 50% upfront, 50% on completion',
      paymentTerms: 'Net 7 days',
      serverVersion: 2,
      lastModified: Date.now(),
    },
  ],

  // Sample payments
  payments: [
    {
      id: 'payment_1',
      invoiceId: 'invoice_1',
      jobId: 'job_1',
      artisanId: 'user_1',
      amount: 10000,
      method: 'bank_transfer',
      status: 'completed',
      transactionId: 'TXN-202407-001',
      receiptNumber: 'RCP-001',
      paidAt: new Date().toISOString(),
      recordedAt: new Date().toISOString(),
      notes: 'First payment received',
      serverVersion: 1,
      lastModified: Date.now(),
    },
  ],

  // Sample expense logs
  expenseLogs: [
    {
      id: 'expense_1',
      artisanId: 'user_1',
      category: 'fuel',
      description: 'Fuel - Trip to Lekki',
      amount: 2500,
      expenseDate: new Date().toISOString(),
      jobId: 'job_1',
      notes: 'Petrol for vehicle to site',
      serverVersion: 1,
      lastModified: Date.now(),
    },
    {
      id: 'expense_2',
      artisanId: 'user_1',
      category: 'transport',
      description: 'Transport - Lekki to Ikoyi',
      amount: 1500,
      expenseDate: new Date().toISOString(),
      jobId: null,
      notes: 'Uber to meeting',
      serverVersion: 1,
      lastModified: Date.now(),
    },
  ],

  // Operation queue for sync tracking
  operationQueue: [],
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Find a record by ID in a collection
 */
function findRecordById(collection, id) {
  return database[collection]?.find((r) => r.id === id);
}

/**
 * Update or create a record in a collection
 */
function upsertRecord(collection, record) {
  if (!database[collection]) {
    database[collection] = [];
  }

  const index = database[collection].findIndex((r) => r.id === record.id);

  if (index >= 0) {
    // Update existing record
    database[collection][index] = {
      ...database[collection][index],
      ...record,
      serverVersion: (database[collection][index].serverVersion || 0) + 1,
      lastModified: Date.now(),
    };
  } else {
    // Create new record
    database[collection].push({
      ...record,
      serverVersion: 1,
      lastModified: Date.now(),
    });
  }
}

/**
 * Delete a record from a collection
 */
function deleteRecord(collection, id) {
  if (database[collection]) {
    database[collection] = database[collection].filter((r) => r.id !== id);
  }
}

/**
 * Sync logic: Server-Wins conflict resolution
 * Returns records modified since lastSyncedAt timestamp
 */
function getPullChanges(lastSyncedAt) {
  const pullChanges = {};

  // Check each collection for changes since lastSyncedAt
  Object.keys(database).forEach((collection) => {
    if (collection === 'operationQueue') return; // Skip queue

    const changes = database[collection]
      .filter((record) => {
        const lastModified = record.lastModified || 0;
        return lastModified > (lastSyncedAt || 0);
      });

    if (changes.length > 0) {
      pullChanges[collection] = changes;
    }
  });

  return pullChanges;
}

/**
 * Process pushed changes from client
 * Server-Wins: Server version always takes precedence
 * Returns array of operation results
 */
function processPushChanges(pushChanges) {
  const results = [];

  Object.keys(pushChanges || {}).forEach((collection) => {
    const records = pushChanges[collection];

    records.forEach((record) => {
      const { operation, data, clientVersion, id } = record;
      const existing = findRecordById(collection, id);

      let result = {
        id,
        collection,
        operation,
        success: true,
        serverVersion: null,
      };

      // Check for conflicts (server has newer version)
      if (existing && clientVersion < existing.serverVersion) {
        result.conflict = true;
        result.serverData = existing; // Send server's version
        result.message = 'Conflict: Server version is newer';
      }

      // Process the change
      switch (operation) {
        case 'create':
          if (!existing) {
            upsertRecord(collection, data);
            result.serverVersion = 1;
          } else {
            result.success = false;
            result.message = 'Record already exists';
          }
          break;

        case 'update':
          if (existing && !result.conflict) {
            // Only update if no conflict
            upsertRecord(collection, { ...data, id });
            result.serverVersion = existing.serverVersion + 1;
          } else if (!existing) {
            result.success = false;
            result.message = 'Record not found';
          }
          break;

        case 'delete':
          if (existing) {
            deleteRecord(collection, id);
            result.serverVersion = existing.serverVersion + 1;
          } else {
            result.success = false;
            result.message = 'Record not found';
          }
          break;

        default:
          result.success = false;
          result.message = 'Invalid operation';
      }

      results.push(result);
    });
  });

  return results;
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * Health check endpoint
 */
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * SYNC ENDPOINT
 * Implements offline-first sync with conflict resolution
 *
 * Expected request body:
 * {
 *   "lastSyncedAt": 1690401234567,  // Last sync timestamp from client
 *   "pushChanges": {
 *     "jobs": [
 *       { "id": "job_1", "operation": "update", "clientVersion": 1, "data": {...} }
 *     ]
 *   }
 * }
 *
 * Response:
 * {
 *   "pullChanges": { "jobs": [...], "invoices": [...] },
 *   "serverTimestamp": 1690401245000,
 *   "results": [ { "id": "job_1", "success": true, "serverVersion": 2 } ]
 * }
 */
app.post('/api/v1/sync', (req, res) => {
  try {
    const { lastSyncedAt, pushChanges } = req.body;

    console.log(`\n📡 SYNC REQUEST`);
    console.log(`   Last synced: ${new Date(lastSyncedAt).toISOString()}`);
    if (pushChanges) {
      console.log(`   Pushing changes: ${Object.keys(pushChanges).join(', ')}`);
    }

    // Process client's pushed changes
    const results = processPushChanges(pushChanges);

    // Get server's changes since lastSyncedAt
    const pullChanges = getPullChanges(lastSyncedAt);

    // Log conflicts
    const conflicts = results.filter((r) => r.conflict);
    if (conflicts.length > 0) {
      console.log(`   ⚠️  Conflicts detected: ${conflicts.length}`);
    }

    console.log(`   ✅ Sync complete. Sending pull changes for: ${Object.keys(pullChanges).join(', ')}`);

    res.json({
      success: true,
      pullChanges,
      serverTimestamp: Date.now(),
      results,
      conflictCount: conflicts.length,
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET ALL JOBS for an artisan
 * Query params: ?artisanId=user_1&status=in_progress
 */
app.get('/api/v1/jobs', (req, res) => {
  try {
    const { artisanId, status } = req.query;

    let jobs = database.jobs;

    if (artisanId) {
      jobs = jobs.filter((j) => j.artisanId === artisanId);
    }

    if (status) {
      jobs = jobs.filter((j) => j.status === status);
    }

    console.log(`📋 Fetched ${jobs.length} jobs`);

    res.json({
      success: true,
      data: jobs,
      count: jobs.length,
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET SINGLE JOB
 */
app.get('/api/v1/jobs/:id', (req, res) => {
  try {
    const job = findRecordById('jobs', req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * CREATE JOB
 * Body: { artisanId, clientId, title, description, ... }
 */
app.post('/api/v1/jobs', (req, res) => {
  try {
    const job = {
      id: `job_${uuidv4().split('-')[0]}`,
      status: 'draft',
      materialCost: 0,
      laborFee: 0,
      taxAmount: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      images: [],
      ...req.body,
    };

    upsertRecord('jobs', job);

    console.log(`✅ Created job: ${job.id}`);

    res.status(201).json({
      success: true,
      data: job,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * UPDATE JOB
 * Patch specific fields
 */
app.patch('/api/v1/jobs/:id', (req, res) => {
  try {
    const job = findRecordById('jobs', req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    const updated = { ...job, ...req.body, id: job.id };
    upsertRecord('jobs', updated);

    console.log(`✏️  Updated job: ${job.id}`);

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET ALL INVOICES for an artisan
 */
app.get('/api/v1/invoices', (req, res) => {
  try {
    const { artisanId } = req.query;

    let invoices = database.invoices;

    if (artisanId) {
      invoices = invoices.filter((i) => i.artisanId === artisanId);
    }

    res.json({
      success: true,
      data: invoices,
      count: invoices.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * CREATE INVOICE
 */
app.post('/api/v1/invoices', (req, res) => {
  try {
    const invoice = {
      id: `invoice_${uuidv4().split('-')[0]}`,
      invoiceNumber: `INV-${new Date().getFullYear()}-${String(database.invoices.length + 1).padStart(3, '0')}`,
      status: 'draft',
      paidStatus: 'unpaid',
      issuedAt: new Date().toISOString(),
      items: [],
      subtotal: 0,
      taxRate: 0.075,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 0,
      amountPaid: 0,
      amountDue: 0,
      ...req.body,
    };

    upsertRecord('invoices', invoice);

    console.log(`✅ Created invoice: ${invoice.invoiceNumber}`);

    res.status(201).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * WHATSAPP LINK HELPER ENDPOINT
 *
 * GET /api/v1/invoices/:id/whatsapp
 *
 * Returns a formatted text receipt that can be shared via WhatsApp
 */
app.get('/api/v1/invoices/:id/whatsapp', (req, res) => {
  try {
    const invoice = findRecordById('invoices', req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    // Get related job for context
    const job = findRecordById('jobs', invoice.jobId);
    const artisan = findRecordById('users', invoice.artisanId);

    // Format invoice as WhatsApp-friendly text
    const whatsappText = `
*INVOICE - ${invoice.invoiceNumber}*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 *Date:* ${new Date(invoice.issuedAt).toLocaleDateString('en-NG')}
👨‍💼 *From:* ${artisan?.firstName || 'Service Provider'} ${artisan?.lastName || ''}
📱 *Phone:* ${artisan?.whatsappNumber || artisan?.phone || ''}

*SERVICE:* ${job?.title || 'Professional Service'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${
  invoice.items
    .map(
      (item) =>
        `${item.description}
  ${item.quantity} × ₦${item.unitPrice.toLocaleString('en-NG')} = ₦${item.amount.toLocaleString('en-NG')}`
    )
    .join('\n\n')
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*SUMMARY:*
Subtotal: ₦${invoice.subtotal.toLocaleString('en-NG')}
${invoice.taxAmount > 0 ? `Tax (7.5%): ₦${invoice.taxAmount.toLocaleString('en-NG')}\n` : ''}${invoice.discountAmount > 0 ? `Discount: -₦${invoice.discountAmount.toLocaleString('en-NG')}\n` : ''}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*TOTAL DUE: ₦${invoice.totalAmount.toLocaleString('en-NG')}*

${invoice.amountPaid > 0 ? `Amount Paid: ₦${invoice.amountPaid.toLocaleString('en-NG')}\n` : ''}${invoice.amountDue > 0 ? `Amount Due: ₦${invoice.amountDue.toLocaleString('en-NG')}\n` : ''}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*PAYMENT OPTIONS:*
💰 Cash on delivery
🏦 Bank Transfer
📲 Paystack Escrow

${invoice.paymentTerms ? `*Terms:* ${invoice.paymentTerms}\n` : ''}${invoice.notes ? `*Notes:* ${invoice.notes}\n` : ''}Please reply to confirm receipt.
Thank you for your business! 🙏
    `.trim();

    console.log(`📤 Generated WhatsApp text for invoice: ${invoice.invoiceNumber}`);

    res.json({
      success: true,
      invoiceNumber: invoice.invoiceNumber,
      whatsappText,
      clientPhone: req.query.phone || '+234',
    });
  } catch (error) {
    console.error('WhatsApp text generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PAYSTACK WEBHOOK SIMULATOR
 *
 * POST /api/v1/payments/webhook
 *
 * Simulates Paystack webhook events for testing payment workflows
 * Body: { event: "charge.success", data: { reference: "PAY_...", amount: 100000 } }
 */
app.post('/api/v1/payments/webhook', (req, res) => {
  try {
    const { event, data } = req.body;

    console.log(`\n💳 PAYSTACK WEBHOOK: ${event}`);

    if (event === 'charge.success') {
      const { reference, amount, metadata } = data;
      const invoiceId = metadata?.invoice_id;

      // Find and update invoice
      const invoice = invoiceId && findRecordById('invoices', invoiceId);

      if (invoice) {
        // Update invoice to paid
        const updatedInvoice = {
          ...invoice,
          status: 'paid',
          paidStatus: 'paid',
          amountPaid: invoice.totalAmount,
          amountDue: 0,
          paidAt: new Date().toISOString(),
        };

        upsertRecord('invoices', updatedInvoice);

        // Create payment record
        const payment = {
          id: `payment_${uuidv4().split('-')[0]}`,
          invoiceId,
          artisanId: invoice.artisanId,
          amount: amount / 100, // Convert kobo to naira
          method: 'paystack_escrow',
          status: 'completed',
          transactionId: reference,
          paystackTransferId: reference,
          paidAt: new Date().toISOString(),
          recordedAt: new Date().toISOString(),
          notes: 'Paystack escrow payment received',
        };

        upsertRecord('payments', payment);

        console.log(`✅ Invoice ${invoiceId} marked as paid`);
        console.log(`✅ Payment recorded: ${reference}`);

        res.json({
          success: true,
          message: 'Payment processed',
          invoiceId,
          paymentId: payment.id,
        });
      } else {
        res.json({
          success: false,
          message: 'Invoice not found',
        });
      }
    } else {
      res.json({
        success: false,
        message: `Unhandled event: ${event}`,
      });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * EXPENSES ENDPOINT
 */
app.post('/api/v1/expenses', (req, res) => {
  try {
    const expense = {
      id: `expense_${uuidv4().split('-')[0]}`,
      recordedAt: new Date().toISOString(),
      ...req.body,
    };

    upsertRecord('expenseLogs', expense);

    console.log(`💸 Logged expense: ${expense.category}`);

    res.status(201).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DATABASE DUMP (for debugging)
 * GET /api/v1/debug/db
 */
app.get('/api/v1/debug/db', (req, res) => {
  res.json({
    success: true,
    database: {
      users: database.users.length,
      jobs: database.jobs.length,
      invoices: database.invoices.length,
      payments: database.payments.length,
      expenseLogs: database.expenseLogs.length,
    },
    data: database,
  });
});

// ============================================================================
// 404 HANDLER
// ============================================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
  });
});

// ============================================================================
// ERROR HANDLER
// ============================================================================

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: err.message,
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const server = app.listen(PORT, () => {
  const os = require('os');

  // Get local IP addresses
  const interfaces = os.networkInterfaces();
  const addresses = [];

  Object.keys(interfaces).forEach((name) => {
    interfaces[name].forEach((iface) => {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    });
  });

  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                  TRADIFY MOCK BACKEND SERVER                       ║
╚════════════════════════════════════════════════════════════════════╝

✅ Server running on port ${PORT}

📱 CONNECT YOUR EXPO APP:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

In your Expo app's .env file, set:
  EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:${PORT}

Your local IP address(es):
${addresses.map((addr) => `  • http://${addr}:${PORT}`).join('\n')}

For example, if your IP is 192.168.1.100, use:
  EXPO_PUBLIC_API_URL=http://192.168.1.100:${PORT}

🏠 AVAILABLE ENDPOINTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Health Check:
  GET http://localhost:${PORT}/api/v1/health

Sync (Offline-First):
  POST http://localhost:${PORT}/api/v1/sync
  Body: { lastSyncedAt: timestamp, pushChanges: {...} }

Jobs:
  GET    http://localhost:${PORT}/api/v1/jobs
  POST   http://localhost:${PORT}/api/v1/jobs
  GET    http://localhost:${PORT}/api/v1/jobs/:id
  PATCH  http://localhost:${PORT}/api/v1/jobs/:id

Invoices:
  GET    http://localhost:${PORT}/api/v1/invoices
  POST   http://localhost:${PORT}/api/v1/invoices

WhatsApp Invoice Helper:
  GET http://localhost:${PORT}/api/v1/invoices/:id/whatsapp

Paystack Webhook Simulator:
  POST http://localhost:${PORT}/api/v1/payments/webhook
  Body: { event: "charge.success", data: {...} }

Expenses:
  POST http://localhost:${PORT}/api/v1/expenses

Debug Database:
  GET http://localhost:${PORT}/api/v1/debug/db

🧪 TESTING OFFLINE SYNC:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Create a job/invoice offline (app stores locally)
2. Disable network in your phone
3. Make changes to the job status
4. Re-enable network
5. App will sync changes to this server
6. Check console for sync activity

📊 SAMPLE DATA INCLUDED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Users:    ${database.users.length}
Jobs:     ${database.jobs.length}
Invoices: ${database.invoices.length}
Payments: ${database.payments.length}
Expenses: ${database.expenseLogs.length}

View all data: GET http://localhost:${PORT}/api/v1/debug/db

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Press CTRL+C to stop the server
`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down server...');
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});
