# Cloudflare R2 Configuration for QR Gallery

Phase 1 requires manual configuration of Cloudflare R2. Follow these steps:

## 1. Create R2 Bucket
- In Cloudflare Dashboard, go to **R2** > **Overview** > **Create bucket**.
- Bucket name: (e.g., `pixenze-booth-media`).

## 2. Setup Public Access
- Go to the bucket's **Settings** tab.
- Choose **Public Access** > **Connect Domain** or **Custom Domain** (e.g., `gallery.pixenze.com`).
- Note this domain for `R2_PUBLIC_URL`.

## 3. Configure CORS
- Still in **Settings**, scroll to **CORS Policy**.
- Add the following JSON:
```json
[
  {
    "AllowedOrigins": ["*"], 
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```
> [!TIP]
> Replacing `*` with your actual application domains (`https://pixenzebooth.com`) is recommended for production security.

## 4. Get API Credentials
- Go to **R2** > **Manage R2 API Tokens**.
- Create a token with **Edit** permissions for the specific bucket.
- Note the **Access Key ID** and **Secret Access Key**.
- Note the **Endpoint** (S3 API).

## 5. Add Environment Variables
Add these to your Cloudflare Pages Dashboard (Environment Variables section):
- `R2_ACCESS_KEY_ID`: [Access Key ID]
- `R2_SECRET_ACCESS_KEY`: [Secret Access Key]
- `R2_ENDPOINT`: `https://[account-id].r2.cloudflarestorage.com`
- `R2_BUCKET_NAME`: [Bucket Name]
- `R2_PUBLIC_URL`: `https://gallery.pixenze.com`
