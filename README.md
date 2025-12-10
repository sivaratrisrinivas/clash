# CLASH

## Why

Market research docs disagree. Same question, different numbers. CLASH finds conflicts and explains why.

## What

Upload docs. Ask question. Get conflicts with source, confidence, explanation, recommendation. Export memo.

**Flow:**
```
Upload → Question → AI Extract → Find Conflicts → Show Results → Export
```

## How

**Local Development:**
1. `npm install`
2. Install Wrangler CLI: `npm i -g wrangler`
3. Create `.dev.vars`: `GEMINI_API_KEY=your_key`
4. Run: `npm run pages:dev` (runs frontend + API routes)

**Deploy to Cloudflare Pages (Free):**
1. Push to GitHub
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) > Pages
3. Connect repository
4. Build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
5. Add environment variable: `GEMINI_API_KEY=your_key` (set for **Production** environment)
6. Deploy

**Why Cloudflare:**
- **Free tier**: 100MB request limit (supports 30MB files)
- **Unlimited requests** on free tier
- **Fast global CDN**
- **No credit card required**

API key secured server-side via `/api/analyze` route.

## Architecture

```mermaid
flowchart TB
    subgraph "Frontend (React + Vite)"
        A[User uploads PDFs] --> B[User enters question]
        B --> C[FormData: files + question]
    end
    
    subgraph "Cloudflare Pages Function"
        C --> D[Parse FormData]
        D --> E[Extract file_0]
        E --> F[Convert to ArrayBuffer]
        F --> G[Chunked Base64 conversion<br/>32KB chunks]
    end
    
    subgraph "Gemini API"
        G --> H[Single API call:<br/>file + question + prompt]
        H --> I[AI processes:<br/>Extract, Normalize,<br/>Detect conflicts >10%,<br/>Explain differences,<br/>Assign confidence]
    end
    
    subgraph "Response Processing"
        I --> J[Parse JSON response]
        J --> K[Clean markdown wrappers]
        K --> L[Return structured data]
    end
    
    subgraph "Frontend Display"
        L --> M[Display Results:<br/>Conflicts list +<br/>Explanation +<br/>Recommendation]
    end
    
    style A fill:#e1f5ff
    style H fill:#fff4e1
    style I fill:#fff4e1
    style M fill:#e1f5ff
```

## Information Flow

```mermaid
flowchart TD
    A[User uploads PDFs] --> B[User enters question]
    B --> C[Convert files to Base64<br/>chunked processing 32KB]
    C --> D[Single Gemini API call<br/>with all docs + question + schema]
    D --> E[AI processes in one pass:<br/>Extract answers, Normalize units,<br/>Detect conflicts >10%, Explain differences,<br/>Assign confidence per source]
    E --> F[Structured JSON Response<br/>conflicts, explanation, recommendation]
    F --> G[Display Results<br/>Conflicts list + Sidebar insights]
    G --> H[Export Memo<br/>Download investment memo]
```

## Request/Response Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Cloudflare Function
    participant Gemini API
    
    User->>Frontend: Upload PDFs + Enter question
    Frontend->>Cloudflare Function: POST /api/analyze<br/>(FormData: files + question)
    
    Cloudflare Function->>Cloudflare Function: Parse FormData<br/>Extract file_0
    Cloudflare Function->>Cloudflare Function: Convert to Base64<br/>(32KB chunks)
    
    Cloudflare Function->>Gemini API: POST generateContent<br/>(file + question + prompt)
    Gemini API->>Cloudflare Function: JSON response<br/>(conflicts, explanation, recommendation)
    
    Cloudflare Function->>Cloudflare Function: Parse & clean response
    Cloudflare Function->>Frontend: JSON response
    Frontend->>User: Display results
```

## Data Processing

**Extraction/Cleaning:**
- AI extracts answers from all docs in one pass
- AI normalizes units per prompt instruction
- AI groups conflicts and flags >10% differences per prompt
- AI assigns confidence (High/Medium/Low) per source reliability

**Presentation:**
- Conflicts list: value, source, confidence badge, context (with page numbers)
- Sidebar: explanation (why conflicts exist), recommendation (which to trust)
- Export: investment memo with all data points and sources

## Technical Details

**File Processing:**
- Max file size: 30MB per file, 50MB total
- Base64 conversion uses 32KB chunks to prevent stack overflow
- Cloudflare Workers runtime compatible (no Node.js APIs)

**API Endpoint:**
- Route: `/api/analyze` (Cloudflare Pages Function)
- Method: POST
- Content-Type: `multipart/form-data`
- Response: JSON with `conflicts[]`, `explanation`, `recommendation`

**Error Handling:**
- 400: Missing file or question
- 500: Server misconfiguration (no API key)
- 502: Gemini API error
- All errors return JSON with error details
