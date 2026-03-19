import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare Pages Function to generate a pre-signed URL for direct uploads to R2.
 */
export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const body = await request.json();
        const { fileName, contentType } = body;

        // Basic validation
        if (!fileName || !contentType) {
            return new Response(JSON.stringify({
                success: false,
                message: "Missing fileName or contentType"
            }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Check for necessary environment variables
        if (!env.R2_ENDPOINT || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_BUCKET_NAME) {
            console.error("Missing R2 Environment Variables");
            return new Response(JSON.stringify({
                success: false,
                message: "Server configuration error: Missing R2 Environment Variables"
            }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Initialize S3 Client for Cloudflare R2
        const s3 = new S3Client({
            region: "auto",
            endpoint: env.R2_ENDPOINT,
            credentials: {
                accessKeyId: env.R2_ACCESS_KEY_ID,
                secretAccessKey: env.R2_SECRET_ACCESS_KEY,
            },
        });

        // Prepare PutObject command
        const command = new PutObjectCommand({
            Bucket: env.R2_BUCKET_NAME,
            Key: fileName,
            ContentType: contentType,
        });

        // Generate the pre-signed URL (1 hour expiry)
        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

        // Construct the final public URL 
        // Note: env.R2_PUBLIC_URL should NOT end with a slash
        const publicUrl = `${env.R2_PUBLIC_URL}/${fileName}`;

        return new Response(JSON.stringify({
            success: true,
            uploadUrl,
            publicUrl
        }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Internal Error in get-signed-url:", error);
        return new Response(JSON.stringify({
            success: false,
            message: "Error generating signed URL",
            error: error.message
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
