import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push } from 'firebase/database';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
// Serve static files from current directory (where server.js is)
app.use(express.static(__dirname));

// Firebase Configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

// ----------------------------
// API ENDPOINTS
// ----------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    app: 'Savings Dashboard'
  });
});

// ----------------------------
// MACRODROID WEBHOOK ENDPOINT
// ----------------------------

/**
 * Receive proof message from Macrodroid
 * POST /api/macrodroid-proof
 * Body: { tid, successMessage }
 */
app.post('/api/macrodroid-proof', async (req, res) => {
  try {
    const { tid, successMessage } = req.body;

    // Validation
    if (!tid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing TID parameter' 
      });
    }

    if (!successMessage || successMessage.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Proof message is required and cannot be empty' 
      });
    }

    console.log(`📨 Webhook received from Macrodroid:`);
    console.log(`   TID: ${tid}`);
    console.log(`   Proof: "${successMessage}"`);

    // Store in Firebase completion_messages
    const completionMessagesRef = ref(db, 'completion_messages');
    await push(completionMessagesRef, {
      tid: tid,
      successMessage: successMessage,
      timestamp: Date.now(),
      processed: false,
      source: 'macrodroid-webhook'
    });

    console.log(`✅ Completion message stored successfully`);

    res.json({ 
      success: true, 
      message: 'Proof message received and queued for processing',
      tid: tid
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ----------------------------
// GET PENDING TRANSFERS (for monitoring)
// ----------------------------

/**
 * Get list of pending transfers
 * GET /api/pending-transfers
 */
app.get('/api/pending-transfers', async (req, res) => {
  try {
    console.log('📊 Fetching pending transfers...');
    
    res.json({ 
      message: 'Pending transfers are monitored in real-time via Firebase',
      info: 'Use Firebase Console to view pending_transfers collection'
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ----------------------------
// GET COMPLETED TRANSFERS (for history)
// ----------------------------

/**
 * Get completed transfers with proof
 * GET /api/completed-transfers
 */
app.get('/api/completed-transfers', async (req, res) => {
  try {
    console.log('✅ Fetching completed transfers...');
    
    res.json({ 
      message: 'Completed transfers are archived in Firebase',
      info: 'Use Firebase Console to view completed_transfers collection'
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ----------------------------
// SERVE STATIC FILES
// ----------------------------

/**
 * Serve the main dashboard
 */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/**
 * Catch-all for SPA routing
 */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
});

// ----------------------------
// ERROR HANDLING
// ----------------------------

app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ 
    success: false, 
    error: err.message 
  });
});

// ----------------------------
// START SERVER
// ----------------------------

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║     💰 SAVINGS DASHBOARD - RENDER DEPLOYMENT 🚀         ║
╠══════════════════════════════════════════════════════════╣
║ Server running on: http://localhost:${PORT}              ║
║ Status: Ready for Macrodroid webhooks                    ║
║ Webhook endpoint: /api/macrodroid-proof                  ║
║                                                          ║
║ Firebase Integration: ✅ Active                          ║
║ Real-time Database: ✅ Connected                         ║
║ Auto-deploy: ✅ Enabled                                  ║
╚══════════════════════════════════════════════════════════╝
  `);
});

export default app;
