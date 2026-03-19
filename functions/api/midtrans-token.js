export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        // 1. Get Midtrans settings from Supabase via fetch
        const supabaseUrl = env.VITE_SUPABASE_URL;
        const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return new Response(JSON.stringify({ 
                error: 'Server configuration error: Missing Supabase variables' 
            }), { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const settingsResponse = await fetch(`${supabaseUrl}/rest/v1/global_settings?id=eq.1&select=*`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        if (!settingsResponse.ok) {
            return new Response(JSON.stringify({ error: 'Failed to fetch settings from DB' }), { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const settingsData = await settingsResponse.json();
        const settings = settingsData[0];

        if (!settings) {
            return new Response(JSON.stringify({ error: 'Settings not found' }), { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // If payment is disabled, return early with an indicator
        if (!settings.midtrans_is_enabled) {
            return new Response(JSON.stringify({ 
                error: 'Payment disabled', 
                midtrans_is_enabled: false 
            }), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        const body = await request.json();
        const { amount, orderId, customerName, customerEmail } = body;

        const serverKey = settings.midtrans_server_key;
        const isProduction = settings.midtrans_is_production;
        
        if (!serverKey) {
            return new Response(JSON.stringify({ error: 'Midtrans Server Key is missing in settings' }), { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // --- Core API Version ---
        const baseUrl = isProduction 
            ? 'https://api.midtrans.com/v2/charge' 
            : 'https://api.sandbox.midtrans.com/v2/charge';

        const authHeader = `Basic ${btoa(serverKey + ':')}`;

        const payload = {
            payment_type: "qris",
            transaction_details: {
                order_id: orderId || `ZYPO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                gross_amount: Math.round(amount || settings.midtrans_price || 30000)
            },
            customer_details: {
                first_name: customerName || 'Zypo Guest',
                email: customerEmail || 'guest@zypobooth.com'
            }
        };

        const midtransResponse = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify(payload)
        });

        const result = await midtransResponse.json();

        if (!midtransResponse.ok) {
            return new Response(JSON.stringify({ 
                error: 'Midtrans API Error', 
                detail: result 
            }), { 
                status: midtransResponse.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // --- NEW: Log to Supabase Transactions Table ---
        try {
            const finalOrderId = payload.transaction_details.order_id;
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
        } catch (dbError) {
            console.error('Failed to log transaction to DB:', dbError);
            // We continue anyway as the payment QR is generated
        }

        return new Response(JSON.stringify({
            ...result,
            qr_url: result.actions?.find(a => a.name === 'generate-qr-code')?.url,
            is_production: isProduction
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Midtrans Token Error:', error);
        return new Response(JSON.stringify({ 
            error: 'Internal Server Error', 
            message: error.message 
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
