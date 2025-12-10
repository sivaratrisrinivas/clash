# Deployment Guide - Cloudflare Pages

## Why Cloudflare Pages?

- ✅ **100MB request limit** (free tier) - supports 30MB files easily
- ✅ **Unlimited requests** on free tier
- ✅ **No credit card required**
- ✅ **Fast global CDN**
- ✅ **Automatic HTTPS**

## Quick Deploy

### Option 1: Via GitHub (Recommended)

1. Push code to GitHub
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) > Pages
3. Click "Create a project" > "Connect to Git"
4. Select your repository
5. Build settings:
   - **Framework preset**: None (or Vite)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (leave empty)
6. Click "Save and Deploy"
7. Go to Settings > Environment variables
8. Add: `GEMINI_API_KEY` = `your_api_key`
9. Redeploy

### Option 2: Via CLI

```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Set secret (or use dashboard)
wrangler secret put GEMINI_API_KEY

# Build and deploy
npm run build
wrangler pages deploy dist
```

## Local Development

```bash
# Install dependencies
npm install

# Install Wrangler globally
npm install -g wrangler

# Create .dev.vars file
echo "GEMINI_API_KEY=your_key" > .dev.vars

# Run dev server
npm run pages:dev
```

## File Size Limits

- **Per file**: 30MB
- **Total upload**: 50MB
- **Cloudflare limit**: 100MB (plenty of headroom)

## Troubleshooting

**API route not working?**
- Check environment variable is set in Cloudflare dashboard
- Verify function is in `functions/api/analyze.ts`
- Check Cloudflare Pages logs

**Build fails?**
- Ensure `npm run build` works locally
- Check Node.js version (Cloudflare uses Node 18+)

**Large file upload fails?**
- Cloudflare free tier supports up to 100MB requests
- If issues persist, check file size limits in code

