import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { VitePWA } from 'vite-plugin-pwa'
import crypto from 'crypto'

// Local API middleware plugin for development
// Emulates Cloudflare Functions locally so /api/create-qris works with `npm run dev`
function localApiPlugin() {
  return {
    name: 'local-api-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/create-qris' && req.method === 'POST') {
          const env = loadEnv('development', process.cwd(), '');

          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              if (!body) throw new Error('No body received');

              const data = JSON.parse(body);
              const { name, message, amount, email } = data;

              const merchantCode = env.BAGIBAGI_MERCHANT_CODE;
              const apiKey = env.BAGIBAGI_API_KEY;
              const webhookUrl = env.BAGIBAGI_WEBHOOK_URL || 'https://pixenzebooth.com/api/payment-callback';

              if (!merchantCode || !apiKey) {
                throw new Error('Missing BAGIBAGI_MERCHANT_CODE or BAGIBAGI_API_KEY in .env');
              }

              // MD5 signature (same logic as Cloudflare Worker)
              const rawString = `${name}${message}${amount}${email}${webhookUrl}${merchantCode}${apiKey}`;
              const token = crypto.createHash('md5').update(rawString).digest('hex');

              const payload = { name, message, amount, email, merchantCode, token, webhookUrl };

              const apiRes = await fetch('https://bagibagi.co/api/partnerintegration/create-qris-transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });

              const apiData = await apiRes.json();

              res.setHeader('Content-Type', 'application/json');
              res.statusCode = apiRes.status;
              res.end(JSON.stringify(apiData));

            } catch (e) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, message: e.message }));
            }
          });
        } else if (req.url === '/api/midtrans-token' && req.method === 'POST') {
          const env = loadEnv('development', process.cwd(), '');
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const supabaseUrl = env.VITE_SUPABASE_URL;
              const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

              // 1. Get settings
              const settingsRes = await fetch(`${supabaseUrl}/rest/v1/global_settings?id=eq.1&select=*`, {
                headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
              });
              const settingsData = await settingsRes.json();
              const settings = settingsData[0];

              if (!settings || !settings.midtrans_is_enabled) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ qr_url: null }));
                return;
              }

              // 2. Call Midtrans Core API
              const requestData = body ? JSON.parse(body) : {};
              const serverKey = settings.midtrans_server_key;
              const isProduction = settings.midtrans_is_production;
              const baseUrl = isProduction 
                ? 'https://api.midtrans.com/v2/charge' 
                : 'https://api.sandbox.midtrans.com/v2/charge';

              const payload = {
                payment_type: "qris",
                transaction_details: {
                  order_id: `ZYPO-${Date.now()}`,
                  gross_amount: settings.midtrans_price || 30000
                },
                customer_details: {
                  first_name: requestData.customerName || 'Guest',
                  email: requestData.customerEmail || 'guest@example.com'
                }
              };

              const midtransRes = await fetch(baseUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Basic ${Buffer.from(serverKey + ':').toString('base64')}`
                },
                body: JSON.stringify(payload)
              });

              const midtransData = await midtransRes.json();
              const finalOrderId = payload.transaction_details.order_id;

              // 3. Log to Supabase (Local emulation of production logging)
              try {
                await fetch(`${supabaseUrl}/rest/v1/transactions`, {
                  method: 'POST',
                  headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                  },
                  body: JSON.stringify({
                    order_id: finalOrderId,
                    amount: payload.transaction_details.gross_amount,
                    customer_name: payload.customer_details.first_name,
                    customer_email: payload.customer_details.email,
                    status: 'pending',
                    payment_type: 'qris'
                  })
                });
              } catch (dbErr) {
                console.error("Local DB Logging Error:", dbErr.message);
              }

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                ...midtransData,
                qr_url: midtransData.actions?.find(a => a.name === 'generate-qr-code')?.url
              }));
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: e.message }));
            }
          });
        } else if (req.url === '/api/midtrans-status' && req.method === 'POST') {
          const env = loadEnv('development', process.cwd(), '');
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body);
              const { orderId } = data;
              const supabaseUrl = env.VITE_SUPABASE_URL;
              const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

              const settingsRes = await fetch(`${supabaseUrl}/rest/v1/global_settings?id=eq.1&select=*`, {
                headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
              });
              const settingsData = await settingsRes.json();
              const settings = settingsData[0];

              const serverKey = settings.midtrans_server_key;
              const isProduction = settings.midtrans_is_production;
              const baseUrl = isProduction 
                ? `https://api.midtrans.com/v2/${orderId}/status` 
                : `https://api.sandbox.midtrans.com/v2/${orderId}/status`;

              const statusRes = await fetch(baseUrl, {
                headers: { 'Authorization': `Basic ${Buffer.from(serverKey + ':').toString('base64')}` }
              });
              const statusData = await statusRes.json();
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(statusData));
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: e.message }));
            }
          });
        } else if (req.url === '/api/upload-r2' && req.method === 'POST') {
          // PROXY UPLOAD: Browser -> Server Lokal -> R2 (TANPA CORS!)
          const env = loadEnv('development', process.cwd(), '');
          const chunks = [];
          req.on('data', chunk => { chunks.push(chunk); });
          req.on('end', async () => {
            try {
              const fullBody = Buffer.concat(chunks);
              // Ambil metadata dari header
              const fileName = req.headers['x-file-name'];
              const contentType = req.headers['x-content-type'] || 'application/octet-stream';

              if (!fileName) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, message: 'Missing x-file-name header' }));
                return;
              }

              const s3 = new S3Client({
                region: "auto",
                endpoint: env.R2_ENDPOINT,
                credentials: {
                  accessKeyId: env.R2_ACCESS_KEY_ID,
                  secretAccessKey: env.R2_SECRET_ACCESS_KEY,
                },
                forcePathStyle: true,
              });

              const command = new PutObjectCommand({
                Bucket: env.R2_BUCKET_NAME,
                Key: fileName,
                ContentType: contentType,
                Body: fullBody,
              });

              await s3.send(command);

              const publicUrl = `${env.R2_PUBLIC_URL}/${fileName}`;

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, publicUrl }));
            } catch (e) {
              console.error('Upload proxy error:', e);
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, message: e.message }));
            }
          });
        } else {
          next();
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    localApiPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo.jpg', 'manifest.json'],
      manifest: false, // Use existing manifest.json in public folder
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,json}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Don't let the SW intercept API calls or external resources
        navigateFallbackDenylist: [/^\/api\//],
        // Runtime caching for manifest.json with network-first strategy
        runtimeCaching: [
          {
            urlPattern: /\/manifest\.json$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'manifest-cache',
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 86400, // 24 hours
              },
            },
          },
        ],
      }
    })
  ],
  build: {
    // Code splitting configuration
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // Animation library (loaded separately since it's large)
          motion: ['framer-motion'],
          // UI utilities
          ui: ['lucide-react', 'clsx', 'tailwind-merge'],
          // Supabase (loaded separately for pages that need it)
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Sourcemaps in production (hidden for Sentry upload)
    sourcemap: 'hidden',
    // Asset size optimization
    assetsInlineLimit: 4096, // Inline assets smaller than 4KB
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
