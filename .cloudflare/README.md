# Cloudflare Pages Deployment

This project uses Cloudflare Pages for hosting and Cloudflare Workers for API routes.

## Setup

1. Install Wrangler CLI: `npm install -g wrangler`
2. Login: `wrangler login`
3. Set environment variable: `wrangler secret put GEMINI_API_KEY` (or set in Cloudflare dashboard)

## Deploy

**Via GitHub (Recommended):**
1. Push to GitHub
2. Go to Cloudflare Dashboard > Pages
3. Connect repository
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add environment variable: `GEMINI_API_KEY`

**Via CLI:**
```bash
npm run build
wrangler pages deploy dist
```

## Limits

- **Request size**: 100MB (free tier) - supports 30MB files easily
- **CPU time**: 50ms free tier (sufficient for API calls)
- **Daily requests**: Unlimited on free tier

