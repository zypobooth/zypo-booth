export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const body = await request.json();
        const { orderId } = body;

        if (!orderId) {
            return new Response(JSON.stringify({ error: 'Missing orderId' }), { status: 400 });
        }

        const supabaseUrl = env.VITE_SUPABASE_URL;
        const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

        const settingsResponse = await fetch(`${supabaseUrl}/rest/v1/global_settings?id=eq.1&select=*`, {
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });
        const settingsData = await settingsResponse.json();
        const settings = settingsData[0];

        const serverKey = settings?.midtrans_server_key;
        const isProduction = settings?.midtrans_is_production;

        const baseUrl = isProduction 
            ? `https://api.midtrans.com/v2/${orderId}/status` 
            : `https://api.sandbox.midtrans.com/v2/${orderId}/status`;

        const authHeader = `Basic ${btoa(serverKey + ':')}`;

        const statusResponse = await fetch(baseUrl, {
            headers: { 'Authorization': authHeader }
        });

        const result = await statusResponse.json();

        // --- NEW: Update Supabase Transactions Status ---
        if (result.transaction_status) {
            try {
                await fetch(`${supabaseUrl}/rest/v1/transactions?order_id=eq.${orderId}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        status: result.transaction_status,
                        payment_type: result.payment_type || 'qris',
                        updated_at: new Date().toISOString()
                    })
                });
            } catch (dbError) {
                console.error('Failed to update transaction in DB:', dbError);
            }
        }

        return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
