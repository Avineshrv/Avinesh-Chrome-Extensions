require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

// Lemon Squeezy Configuration
const lsApiKey = process.env.LEMONSQUEEZY_API_KEY || '';
const lsStoreId = process.env.LEMONSQUEEZY_STORE_ID || '';
const lsVariantId = process.env.LEMONSQUEEZY_VARIANT_ID || '';

const app = express();
app.use(cors());
app.use(express.json());

// PORT settings
const PORT = 3000;

// Key Paths & RSA Setup
const keysPath = path.join(__dirname, 'keys.json');
let keys = { publicKeyPem: '', privateKeyPem: '', publicKeyBase64: '' };

// In-Memory Database for Sandbox checkout sessions
const sandboxSessions = {};
// Store of paid installation IDs to persist across verification calls
const paidInstallations = new Set();

function initializeKeys() {
  if (fs.existsSync(keysPath)) {
    try {
      keys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
      console.log('[Licensing Server] Loaded existing RSA cryptographic key pairs.');
      return;
    } catch (e) {
      console.error('[Licensing Server] Error parsing keys.json, generating new ones...', e);
    }
  }

  // Generate new 2048-bit RSA key pair
  console.log('[Licensing Server] Generating a fresh 2048-bit RSA key pair...');
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  // Clean PEM headers/footers to make a single-line base64 string for Web Crypto API
  const publicKeyBase64 = publicKey
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s+/g, '');

  keys = {
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
    publicKeyBase64: publicKeyBase64
  };

  fs.writeFileSync(keysPath, JSON.stringify(keys, null, 2), 'utf8');
  console.log('[Licensing Server] RSA key pair generated and written to keys.json.');
}

initializeKeys();

// Serve static sandbox files
app.use(express.static(__dirname));

// Auxiliary Helper to make Asynchronous HTTPS Requests to Lemon Squeezy API
function fetchLemonSqueezy(endpoint, method, headers, bodyData) {
  return new Promise((resolve, reject) => {
    const url = `https://api.lemonsqueezy.com/v1${endpoint}`;
    const options = {
      method: method,
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        ...headers
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (bodyData) {
      req.write(JSON.stringify(bodyData));
    }
    req.end();
  });
}

// 1. Create Checkout Session API (Swapped to Lemon Squeezy)
app.post('/create-checkout-session', async (req, res) => {
  const { installationId } = req.body;
  if (!installationId) {
    return res.status(400).json({ error: 'Missing installationId' });
  }

  // If Lemon Squeezy credentials are present, attempt production creation
  if (lsApiKey && lsStoreId && lsVariantId) {
    try {
      const payload = {
        data: {
          type: 'checkouts',
          attributes: {
            custom_data: {
              installation_id: installationId
            },
            checkout_options: {
              embed: false,
              media: true,
              logo: true
            },
            product_options: {
              redirect_url: `http://localhost:${PORT}/success.html?session_id=${installationId}`
            }
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: lsStoreId
              }
            },
            variant: {
              data: {
                type: 'variants',
                id: lsVariantId
              }
            }
          }
        }
      };

      const headers = { 'Authorization': `Bearer ${lsApiKey}` };
      const response = await fetchLemonSqueezy('/checkouts', 'POST', headers, payload);

      if (response.status === 201 && response.data?.data?.attributes?.url) {
        console.log(`[Lemon Squeezy Production] Generated checkout URL: ${response.data.data.attributes.url}`);
        return res.json({ url: response.data.data.attributes.url, mode: 'production' });
      } else {
        console.error('[Lemon Squeezy Production] API response error:', response.data || response.raw);
      }
    } catch (err) {
      console.error('[Lemon Squeezy Production] Error creating checkout, falling back to sandbox...', err.message);
    }
  }

  // Fallback to Lemon Squeezy Sandbox Mode
  const mockSessionId = 'sess_' + crypto.randomBytes(12).toString('hex');
  sandboxSessions[mockSessionId] = {
    installationId: installationId,
    paid: false
  };

  console.log(`[Sandbox Simulation] Generating mock session: ${mockSessionId}`);
  return res.json({
    url: `http://localhost:${PORT}/sandbox-checkout.html?session_id=${mockSessionId}&gateway=lemonsqueezy`,
    mode: 'sandbox'
  });
});

// 2. Sandbox Payment Trigger API
app.post('/sandbox-pay', (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId || !sandboxSessions[sessionId]) {
    return res.status(404).json({ error: 'Session not found' });
  }

  sandboxSessions[sessionId].paid = true;
  const instId = sandboxSessions[sessionId].installationId;
  paidInstallations.add(instId);
  console.log(`[Sandbox Simulation] Session paid: ${sessionId} for installation: ${instId}`);
  return res.json({ success: true });
});

// 3. Verify Checkout and Issue RSA Signed License API
app.get('/verify-checkout', async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  let installationId = null;
  let isPaid = false;

  if (sandboxSessions[session_id]) {
    // Sandbox lookup
    installationId = sandboxSessions[session_id].installationId;
    isPaid = sandboxSessions[session_id].paid;
  } else {
    // In Production mode: The success page redirects with ?session_id=installationId
    // We check if the installation ID has been marked paid via Webhooks
    installationId = session_id;
    isPaid = paidInstallations.has(installationId);
  }

  if (!isPaid || !installationId) {
    return res.status(400).json({ error: 'Payment has not been completed or session invalid.' });
  }

  // Create license payload
  const payload = {
    installationId: installationId,
    issuedAt: Date.now(),
    status: 'premium',
    tier: 'lifetime'
  };

  const payloadString = JSON.stringify(payload);

  // Sign the license using RSA Private Key (SHA256)
  const signer = crypto.createSign('sha256');
  signer.update(payloadString);
  const signature = signer.sign(keys.privateKeyPem, 'base64');

  console.log(`[Licensing Server] Successfully verified session ${session_id}. License issued.`);
  
  return res.json({
    success: true,
    license: {
      payload: payloadString,
      signature: signature
    }
  });
});

// 4. REST Polling Endpoint for Real-time Auto-Unlock
app.get('/check-license', (req, res) => {
  const { installationId } = req.query;
  if (!installationId) {
    return res.status(400).json({ error: 'Missing installationId' });
  }

  let isPaid = paidInstallations.has(installationId);

  if (!isPaid) {
    for (const session of Object.values(sandboxSessions)) {
      if (session.installationId === installationId && session.paid) {
        isPaid = true;
        paidInstallations.add(installationId);
        break;
      }
    }
  }

  if (isPaid) {
    const payload = {
      installationId: installationId,
      issuedAt: Date.now(),
      status: 'premium',
      tier: 'lifetime'
    };
    
    const payloadString = JSON.stringify(payload);
    const signer = crypto.createSign('sha256');
    signer.update(payloadString);
    const signature = signer.sign(keys.privateKeyPem, 'base64');

    console.log(`[Licensing Server] Polling success: License issued automatically for installation: ${installationId}`);
    return res.json({
      premium: true,
      license: {
        payload: payloadString,
        signature: signature
      }
    });
  }

  return res.json({ premium: false });
});

// 5. Lemon Squeezy Production Webhook Endpoint
// Processes global payments from Lemon Squeezy in production instantly
app.post('/lemonsqueezy-webhook', (req, res) => {
  const event = req.body;
  
  // Verify webhook secret if configured
  const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '';
  if (webhookSecret) {
    const hmac = crypto.createHmac('sha256', webhookSecret);
    const digest = hmac.update(JSON.stringify(req.body)).digest('hex');
    const signature = req.headers['x-signature'];
    
    if (signature !== digest) {
      console.warn('[Lemon Squeezy Webhook] Webhook signature verification failed.');
      return res.status(401).send('Unauthorized');
    }
  }

  if (event && event.meta && event.meta.custom_data) {
    const instId = event.meta.custom_data.installation_id;
    const eventName = event.meta.event_name;
    
    if (instId && (eventName === 'order_created' || eventName === 'subscription_created')) {
      paidInstallations.add(instId);
      console.log(`[Lemon Squeezy Webhook] Payment confirmed for installation: ${instId} via event: ${eventName}`);
    }
  }

  return res.status(200).send('OK');
});

// Debug endpoint to retrieve hardcoded public key for the extension
app.get('/public-key', (req, res) => {
  res.json({
    publicKeyPem: keys.publicKeyPem,
    publicKeyBase64: keys.publicKeyBase64
  });
});

// Start Server
app.listen(PORT, () => {
  console.log('\n=======================================================');
  console.log(`🚀 Mobile Simulator Licensing Server running on PORT: ${PORT}`);
  if (!lsApiKey) {
    console.log('[Lemon Squeezy] No LEMONSQUEEZY_API_KEY found. Operating in local sandbox simulation mode.');
  } else {
    console.log('[Lemon Squeezy] API keys configured. Operating in PRODUCTION integration mode.');
  }
  console.log(`🔗 Success URL: http://localhost:${PORT}/success.html`);
  console.log('=======================================================\n');
});
