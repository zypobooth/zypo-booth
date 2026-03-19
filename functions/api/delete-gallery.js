import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

/**
 * Cloudflare Pages Function to handle CORS Options preflight.
 */
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    });
}

/**
 * Cloudflare Pages Function to delete all files in an R2 directory (session folder).
 */
export async function onRequestPost(context) {
    const { request, env } = context;

    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
    };

    try {
        const body = await request.json();
        const { sessionId } = body;

        // Basic validation
        if (!sessionId) {
            return new Response(JSON.stringify({
                success: false,
                message: "Missing sessionId"
            }), {
                status: 400,
                headers: corsHeaders
            });
        }

        // Check for necessary environment variables
        if (!env.R2_ENDPOINT || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_BUCKET_NAME) {
            return new Response(JSON.stringify({
                success: false,
                message: "Missing R2 Environment Variables"
            }), {
                status: 500,
                headers: corsHeaders
            });
        }

        // Initialize S3 Client
        const s3 = new S3Client({
            region: "auto",
            endpoint: env.R2_ENDPOINT,
            credentials: {
                accessKeyId: env.R2_ACCESS_KEY_ID,
                secretAccessKey: env.R2_SECRET_ACCESS_KEY,
            },
        });

        const prefix = `sessions/${sessionId}/`;

        // 1. List all objects in the session folder
        const listCommand = new ListObjectsV2Command({
            Bucket: env.R2_BUCKET_NAME,
            Prefix: prefix,
        });

        const listedObjects = await s3.send(listCommand);

        if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                message: "No files found to delete for this session."
            }), {
                headers: corsHeaders
            });
        }

        // 2. Prepare objects for deletion
        const deleteParams = {
            Bucket: env.R2_BUCKET_NAME,
            Delete: {
                Objects: listedObjects.Contents.map(({ Key }) => ({ Key })),
            },
        };

        // 3. Delete the objects
        const deleteCommand = new DeleteObjectsCommand(deleteParams);
        await s3.send(deleteCommand);

        return new Response(JSON.stringify({
            success: true,
            deletedCount: listedObjects.Contents.length,
            message: `Successfully deleted ${listedObjects.Contents.length} files from R2.`
        }), {
            headers: corsHeaders
        });

    } catch (error) {
        console.error("Internal Error in delete-gallery:", error);
        return new Response(JSON.stringify({
            success: false,
            message: "Error deleting files from R2",
            error: error.message
        }), {
            status: 500,
            headers: corsHeaders
        });
    }
}
