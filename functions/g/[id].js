export async function onRequestGet(context) {
    const { request, env, params, next } = context;
    const response = await next();
    
    // Only intercept HTML requests, ignore JS/CSS assets
    const contentType = response.headers.get("Content-Type") || "";
    if (contentType.includes("text/html")) {
        const id = params.id;
        
        try {
            // Read environment variables (Cloudflare Secrets/Environment bindings)
            const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
            const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
            
            if (!supabaseUrl || !supabaseKey) { 
                return response; 
            }
            
            // Fetch gallery data directly from Supabase REST API
            const dbRes = await fetch(`${supabaseUrl}/rest/v1/galleries?session_id=eq.${id}&select=strip_url`, {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            });
            const dbData = await dbRes.json();
            
            if (dbData && dbData.length > 0 && dbData[0].strip_url) {
                const stripUrl = dbData[0].strip_url;
                
                // Inject dynamic meta tags before serving the HTML to the bot/browser
                return new HTMLRewriter()
                    .on('head', {
                        element(element) {
                            element.append(`<meta property="og:image" content="${stripUrl}" />`, { html: true });
                            element.append(`<meta name="twitter:image" content="${stripUrl}" />`, { html: true });
                            element.append(`<meta property="og:title" content="ZYPO Photo Booth Gallery | #${id}" />`, { html: true });
                        }
                    })
                    .transform(response);
            }
        } catch (e) {
            // Fallback to normal SPA response if any error occurs
            console.error("Failed to inject OG tags:", e);
            return response;
        }
    }
    
    return response;
}
